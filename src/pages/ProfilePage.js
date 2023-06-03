import React from 'react';
import {View, ScrollView} from 'react-native';
import PropTypes from 'prop-types';
import _ from 'underscore';
import {withOnyx} from 'react-native-onyx';
import Str from 'expensify-common/lib/str';
import lodashGet from 'lodash/get';
import {parsePhoneNumber} from 'awesome-phonenumber';
import styles from '../styles/styles';
import Text from '../components/Text';
import ONYXKEYS from '../ONYXKEYS';
import Avatar from '../components/Avatar';
import HeaderWithCloseButton from '../components/HeaderWithCloseButton';
import Navigation from '../libs/Navigation/Navigation';
import ScreenWrapper from '../components/ScreenWrapper';
import personalDetailsPropType from './personalDetailsPropType';
import withLocalize, {withLocalizePropTypes} from '../components/withLocalize';
import compose from '../libs/compose';
import CommunicationsLink from '../components/CommunicationsLink';
import Tooltip from '../components/Tooltip';
import CONST from '../CONST';
import * as ReportUtils from '../libs/ReportUtils';
import * as Expensicons from '../components/Icon/Expensicons';
import MenuItem from '../components/MenuItem';
import AttachmentModal from '../components/AttachmentModal';
import PressableWithoutFocus from '../components/PressableWithoutFocus';
import * as Report from '../libs/actions/Report';
import OfflineWithFeedback from '../components/OfflineWithFeedback';
import AutoUpdateTime from '../components/AutoUpdateTime';
import * as UserUtils from '../libs/UserUtils';
import FullScreenLoadingIndicator from '../components/FullscreenLoadingIndicator';

const matchType = PropTypes.shape({
    params: PropTypes.shape({
        /** login passed via route /a/:accountID */
        accountID: PropTypes.string,

        /** report ID passed */
        reportID: PropTypes.string,
    }),
});

const propTypes = {
    /* Onyx Props */

    /** The personal details of all users */
    personalDetails: personalDetailsPropType,

    /** Route params */
    route: matchType.isRequired,

    /** Login list for the user that is signed in */
    loginList: PropTypes.shape({
        /** Date login was validated, used to show info indicator status */
        validatedDate: PropTypes.string,

        /** Field-specific server side errors keyed by microtime */
        errorFields: PropTypes.objectOf(PropTypes.objectOf(PropTypes.string)),
    }),

    ...withLocalizePropTypes,
};

const defaultProps = {
    // When opening someone else's profile (via deep link) before login, this is empty
    personalDetails: {},
    loginList: {},
};

/**
 * Gets the phone number to display for SMS logins
 *
 * @param {Object} details
 * @param {String} details.login
 * @param {String} details.displayName
 * @returns {String}
 */
const getPhoneNumber = (details) => {
    // If the user hasn't set a displayName, it is set to their phone number, so use that
    const displayName = lodashGet(details, 'displayName', '');
    const parsedPhoneNumber = parsePhoneNumber(displayName);
    if (parsedPhoneNumber.possible) {
        return parsedPhoneNumber.number.e164;
    }

    // If the user has set a displayName, get the phone number from the SMS login
    return details.login ? Str.removeSMSDomain(details.login) : '';
};

class ProfilePage extends React.PureComponent {
    render() {
        const accountID = lodashGet(this.props.route.params, 'accountID', '');
        const reportID = lodashGet(this.props.route.params, 'reportID', '');
        const details = lodashGet(this.props.personalDetails, accountID, {});
        const displayName = lodashGet(details, 'displayName', '');
        const avatar = lodashGet(details, 'avatar', UserUtils.getDefaultAvatar());
        const originalFileName = lodashGet(details, 'originalFileName', '');
        const login = lodashGet(details, 'login', '');
        let pronouns = lodashGet(details, 'pronouns', '');
        const timezone = lodashGet(details, 'timezone', {});
        const isSMSLogin = login ? Str.isSMSLogin(login) : false;

        // If we have a reportID param this means that we
        // arrived here via the ParticipantsPage and should be allowed to navigate back to it
        const shouldShowBackButton = Boolean(reportID);
        const shouldShowLocalTime = !ReportUtils.hasAutomatedExpensifyEmails([login]) && timezone;

        if (pronouns && pronouns.startsWith(CONST.PRONOUNS.PREFIX)) {
            const localeKey = pronouns.replace(CONST.PRONOUNS.PREFIX, '');
            pronouns = this.props.translate(`pronouns.${localeKey}`);
        }

        const phoneNumber = getPhoneNumber(details);
        const phoneOrEmail = isSMSLogin ? getPhoneNumber(details) : login;

        const isCurrentUser = _.keys(this.props.loginList).includes(login);

        return (
            <ScreenWrapper>
                <HeaderWithCloseButton
                    title={this.props.translate('common.details')}
                    shouldShowBackButton={shouldShowBackButton}
                    onBackButtonPress={() => Navigation.goBack()}
                    onCloseButtonPress={() => Navigation.dismissModal()}
                />
                <View
                    pointerEvents="box-none"
                    style={[styles.containerWithSpaceBetween]}
                >
                    {_.isEmpty(details) ? (
                        <FullScreenLoadingIndicator style={styles.flex1} />
                    ) : (
                        <ScrollView>
                            <View style={styles.avatarSectionWrapper}>
                                <AttachmentModal
                                    headerTitle={displayName}
                                    source={UserUtils.getFullSizeAvatar(avatar, login)}
                                    isAuthTokenRequired
                                    originalFileName={originalFileName}
                                >
                                    {({show}) => (
                                        <PressableWithoutFocus
                                            style={styles.noOutline}
                                            onPress={show}
                                        >
                                            <OfflineWithFeedback pendingAction={lodashGet(details, 'pendingFields.avatar', null)}>
                                                <Avatar
                                                    containerStyles={[styles.avatarLarge, styles.mb3]}
                                                    imageStyles={[styles.avatarLarge]}
                                                    source={UserUtils.getAvatar(avatar, login)}
                                                    size={CONST.AVATAR_SIZE.LARGE}
                                                />
                                            </OfflineWithFeedback>
                                        </PressableWithoutFocus>
                                    )}
                                </AttachmentModal>
                                {Boolean(displayName) && (
                                    <Text
                                        style={[styles.textHeadline, styles.mb6, styles.pre]}
                                        numberOfLines={1}
                                    >
                                        {displayName}
                                    </Text>
                                )}
                                {login ? (
                                    <View style={[styles.mb6, styles.detailsPageSectionContainer, styles.w100]}>
                                        <Text
                                            style={[styles.textLabelSupporting, styles.mb1]}
                                            numberOfLines={1}
                                        >
                                            {this.props.translate(isSMSLogin ? 'common.phoneNumber' : 'common.email')}
                                        </Text>
                                        <CommunicationsLink value={phoneOrEmail}>
                                            <Tooltip text={phoneOrEmail}>
                                                <Text numberOfLines={1}>{isSMSLogin ? this.props.formatPhoneNumber(phoneNumber) : login}</Text>
                                            </Tooltip>
                                        </CommunicationsLink>
                                    </View>
                                ) : null}
                                {pronouns ? (
                                    <View style={[styles.mb6, styles.detailsPageSectionContainer]}>
                                        <Text
                                            style={[styles.textLabelSupporting, styles.mb1]}
                                            numberOfLines={1}
                                        >
                                            {this.props.translate('profilePage.preferredPronouns')}
                                        </Text>
                                        <Text numberOfLines={1}>{pronouns}</Text>
                                    </View>
                                ) : null}
                                {shouldShowLocalTime && <AutoUpdateTime timezone={timezone} />}
                            </View>
                            {!isCurrentUser && (
                                <MenuItem
                                    title={`${this.props.translate('common.message')}${displayName}`}
                                    icon={Expensicons.ChatBubble}
                                    onPress={() => Report.navigateToAndOpenReport([login])}
                                    wrapperStyle={styles.breakAll}
                                    shouldShowRightIcon
                                />
                            )}
                        </ScrollView>
                    )}
                </View>
            </ScreenWrapper>
        );
    }
}

ProfilePage.propTypes = propTypes;
ProfilePage.defaultProps = defaultProps;

export default compose(
    withLocalize,
    withOnyx({
        personalDetails: {
            key: ONYXKEYS.PERSONAL_DETAILS_LIST,
        },
        loginList: {
            key: ONYXKEYS.LOGIN_LIST,
        },
    }),
)(ProfilePage);
