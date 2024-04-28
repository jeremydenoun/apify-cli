const { promisify } = require('util');

const { cryptoRandomObjectId } = require('@apify/utilities');
const loadJson = require('load-json-file');
const Mixpanel = require('mixpanel');
const writeJson = require('write-json-file');

const { MIXPANEL_TOKEN, TELEMETRY_FILE_PATH } = require('./consts');
const outputs = require('./outputs');
const { getLocalUserInfo } = require('./utils');

const mixpanel = Mixpanel.init(MIXPANEL_TOKEN, { keepAlive: false });
const TELEMETRY_WARNING_TEXT = 'Apify collects telemetry data about general usage of Apify CLI to help us improve the product. '
    + 'This feature is enabled by default, and you can disable it by setting the "APIFY_CLI_DISABLE_TELEMETRY" environment variable to "1". '
    + 'You can find more information about our telemetry in https://docs.apify.com/cli/docs/telemetry.';

/**
 * Returns distinctId for current local environment.
 * Use CLI prefix to distinguish between id generated by CLI.
 *
 * @returns {string}
 */
const createLocalDistinctId = () => `CLI:${cryptoRandomObjectId()}`;

/**
 * Returns telemetry distinctId for current local environment or creates new one.
 *
 * @returns {string}
 */
const getOrCreateLocalDistinctId = () => {
    try {
        const telemetry = loadJson.sync(TELEMETRY_FILE_PATH);
        return telemetry.distinctId;
    } catch (e) {
        const userInfo = getLocalUserInfo();
        const distinctId = userInfo.id || createLocalDistinctId();
        // This first time we are tracking telemetry, so we want to notify user about it.
        outputs.info(TELEMETRY_WARNING_TEXT);
        writeJson.sync(TELEMETRY_FILE_PATH, { distinctId });
        return distinctId;
    }
};

const regenerateLocalDistinctId = () => {
    try {
        writeJson.sync(TELEMETRY_FILE_PATH, { distinctId: createLocalDistinctId() });
    } catch (e) {
        // Ignore errors
    }
};

const isTelemetryEnabled = !process.env.APIFY_CLI_DISABLE_TELEMETRY
    || ['false', '0'].includes(process.env.APIFY_CLI_DISABLE_TELEMETRY);

/**
 * Tracks telemetry event if telemetry is enabled.
 *
 * @param eventName
 * @param eventData
 * @param distinctId
 */
const maybeTrackTelemetry = async ({ eventName, eventData }) => {
    if (!isTelemetryEnabled) return;
    try {
        const distinctId = getOrCreateLocalDistinctId();
        await promisify(mixpanel.track.bind(mixpanel))(eventName, {
            distinct_id: distinctId,
            ...eventData,
        });
    } catch (e) {
        // Ignore errors
    }
};

/**
 * Uses Apify identity with local distinctId.
 *
 * @param userId
 * @returns {Promise<void>}
 */
const useApifyIdentity = async (userId) => {
    if (!isTelemetryEnabled) return;
    try {
        const distinctId = getOrCreateLocalDistinctId();
        writeJson.sync(TELEMETRY_FILE_PATH, { distinctId: userId });
        await maybeTrackTelemetry({
            eventName: '$create_alias',
            eventData: {
                alias: distinctId,
            },
        });
    } catch (e) {
        // Ignore errors
    }
};

module.exports = {
    mixpanel,
    getOrCreateLocalDistinctId,
    isTelemetryEnabled,
    maybeTrackTelemetry,
    useApifyIdentity,
    regenerateLocalDistinctId,
};