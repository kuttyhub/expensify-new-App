import React from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import PropTypes from 'prop-types';
import lodashGet from 'lodash/get';
import _ from 'underscore';
import ONYXKEYS from '../../ONYXKEYS';
import withLocalize, {withLocalizePropTypes} from '../../components/withLocalize';
import Navigation from '../../libs/Navigation/Navigation';
import Permissions from '../../libs/Permissions';
import styles from '../../styles/styles';
import Button from '../../components/Button';
import Text from '../../components/Text';
import compose from '../../libs/compose';
import {
    uploadAvatar, update, updateLocalPolicyValues,
} from '../../libs/actions/Policy';
import Icon from '../../components/Icon';
import {Workspace} from '../../components/Icon/Expensicons';
import AvatarWithImagePicker from '../../components/AvatarWithImagePicker';
import defaultTheme from '../../styles/themes/default';
import Growl from '../../libs/Growl';
import CONST from '../../CONST';
import ExpensiPicker from '../../components/ExpensiPicker';
import {getCurrencyList} from '../../libs/actions/PersonalDetails';
import ExpensiTextInput from '../../components/ExpensiTextInput/index';
import FixedFooter from '../../components/FixedFooter';
import WorkspacePageWithSections from './WorkspacePageWithSections';

const propTypes = {
    /** List of betas */
    betas: PropTypes.arrayOf(PropTypes.string),

    ...withLocalizePropTypes,
};
const defaultProps = {
    betas: [],
};

class WorkspaceSettingsPage extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            name: props.policy.name,
            avatarURL: props.policy.avatarURL,
            previewAvatarURL: props.policy.avatarURL,
            currency: props.policy.outputCurrency,
        };

        this.submit = this.submit.bind(this);
        this.onImageSelected = this.onImageSelected.bind(this);
        this.onImageRemoved = this.onImageRemoved.bind(this);
        this.getCurrencyItems = this.getCurrencyItems.bind(this);
        this.uploadAvatarPromise = Promise.resolve();
    }

    componentDidMount() {
        getCurrencyList();
    }

    onImageSelected(image) {
        updateLocalPolicyValues(this.props.policy.id, {isAvatarUploading: true});
        this.setState({previewAvatarURL: image.uri});

        // Store the upload avatar promise so we can wait for it to finish before updating the policy
        this.uploadAvatarPromise = uploadAvatar(image).then(url => new Promise((resolve) => {
            this.setState({avatarURL: url}, resolve);
        })).catch(() => {
            Growl.error(this.props.translate('workspace.editor.avatarUploadFailureMessage'));
        }).finally(() => updateLocalPolicyValues(this.props.policy.id, {isAvatarUploading: false}));
    }

    onImageRemoved() {
        this.setState({previewAvatarURL: '', avatarURL: ''});
    }

    /**
     *
     * @returns {Object[]}
     */
    getCurrencyItems() {
        const currencyListKeys = _.keys(this.props.currencyList);
        const a = _.map(currencyListKeys, currencyCode => ({
            value: currencyCode,
            label: `${currencyCode} - ${this.props.currencyList[currencyCode].symbol}`,
        }));
        return a;
    }

    submit() {
        updateLocalPolicyValues(this.props.policy.id, {isPolicyUpdating: true});

        // Wait for the upload avatar promise to finish before updating the policy
        this.uploadAvatarPromise.then(() => {
            const name = this.state.name.trim();
            const avatarURL = this.state.avatarURL;
            const policyID = this.props.policy.id;
            const currency = this.state.currency;

            update(policyID, {name, avatarURL, outputCurrency: currency});
        }).catch(() => {
            updateLocalPolicyValues(this.props.policy.id, {isPolicyUpdating: false});
        });
    }

    render() {
        const {policy} = this.props;

        if (!Permissions.canUseFreePlan(this.props.betas)) {
            console.debug('Not showing workspace editor page because user is not on free plan beta');
            return <Navigation.DismissModal />;
        }

        if (_.isEmpty(policy)) {
            return null;
        }

        const isButtonDisabled = policy.isAvatarUploading
                                  || (this.state.avatarURL === this.props.policy.avatarURL
                                    && this.state.name === this.props.policy.name);
        return (
            <WorkspacePageWithSections
                headerText={this.props.translate('workspace.common.edit')}
                route={this.props.route}
            >
                {(hasVBA) => (
                    <>
                        <View style={[styles.pageWrapper, styles.flex1, styles.pRelative]}>
                            <View style={[styles.w100, styles.flex1]}>
                                <AvatarWithImagePicker
                                    isUploading={policy.isAvatarUploading}
                                    avatarURL={this.state.previewAvatarURL}
                                    size={CONST.AVATAR_SIZE.LARGE}
                                    DefaultAvatar={() => (
                                        <Icon
                                            src={Workspace}
                                            height={80}
                                            width={80}
                                            fill={defaultTheme.iconSuccessFill}
                                        />
                                    )}
                                    style={[styles.mb3]}
                                    anchorPosition={{top: 172, right: 18}}
                                    isUsingDefaultAvatar={!this.state.previewAvatarURL}
                                    onImageSelected={this.onImageSelected}
                                    onImageRemoved={this.onImageRemoved}
                                />

                                <ExpensiTextInput
                                    label={this.props.translate('workspace.editor.nameInputLabel')}
                                    containerStyles={[styles.mt4]}
                                    onChangeText={name => this.setState({name})}
                                    value={this.state.name}
                                    hasError={!this.state.name.trim().length}
                                    errorText={this.state.name.trim().length ? '' : this.props.translate('workspace.editor.nameIsRequiredError')}
                                />

                                <ExpensiPicker
                                    label={this.props.translate('workspace.editor.currencyInputLabel')}
                                    onChange={currency => this.setState({currency})}
                                    items={this.getCurrencyItems()}
                                    value={this.state.currency}
                                    style={[styles.mt4]}
                                    isDisabled={hasVBA}
                                />
                                <Text style={[styles.mt2, styles.formHint]}>
                                    {this.props.translate('workspace.editor.currencyInputHelpText')}
                                </Text>
                            </View>

                            <FixedFooter style={[styles.w100]}>
                                <Button
                                    success
                                    isLoading={policy.isPolicyUpdating}
                                    isDisabled={isButtonDisabled}
                                    text={this.props.translate('workspace.editor.save')}
                                    onPress={this.submit}
                                    pressOnEnter
                                />
                            </FixedFooter>
                        </View>
                    </>
                )}
            </WorkspacePageWithSections>
        );
    }
}

WorkspaceSettingsPage.propTypes = propTypes;
WorkspaceSettingsPage.defaultProps = defaultProps;

export default compose(
    withOnyx({
        betas: {
            key: ONYXKEYS.BETAS,
        },
        policy: {
            key: (props) => {
                const routes = lodashGet(props.navigation.getState(), 'routes', []);
                const routeWithPolicyIDParam = _.find(routes, route => route.params && route.params.policyID);
                const policyID = lodashGet(routeWithPolicyIDParam, ['params', 'policyID']);
                return `${ONYXKEYS.COLLECTION.POLICY}${policyID}`;
            },
        },
        currencyList: {key: ONYXKEYS.CURRENCY_LIST},
    }),
    withLocalize,
)(WorkspaceSettingsPage);
