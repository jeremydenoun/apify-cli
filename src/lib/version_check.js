const chalk = require('chalk');
const { spawn } = require('cross-spawn');
const semver = require('semver');
const {
    CHECK_VERSION_EVERY_MILLIS,
} = require('./consts');
const {
    warning,
    info,
} = require('./outputs');
const {
    getLocalState,
    extendLocalState,
} = require('./local_state');

const getLatestNpmVersion = () => spawn.sync('npm', ['view', 'apify-cli', 'version']).stdout.toString().trim();

/**
 * Fetches the latest NPM version of Apify CLI and caches it locally.
 */
const getAndCacheLatestNpmVersion = () => {
    try {
        info('Making sure that Apify CLI is up to date...');

        const latestNpmVersion = getLatestNpmVersion();

        extendLocalState({
            latestNpmVersion,
            latestNpmVersionCheckedAt: new Date(),
        });

        return latestNpmVersion;
    } catch (err) {
        console.log(err);
        warning('Cannot fetch the latest Apify CLI version from NPM, using the cached version instead.');
    }
};

/**
 * Logs warning if client local package is not in the latest version
 * Check'll be skip if user is offline
 * Check results will be cached for 24 hours
 * @return {Promise<void>}
 */
const checkLatestVersion = async (enforeUpdate = false) => {
    const {
        latestNpmVersion: cachedLatestNpmVersion,
        latestNpmVersionCheckedAt,
    } = getLocalState();

    const isCheckOutdated = !latestNpmVersionCheckedAt || Date.now() - new Date(latestNpmVersionCheckedAt) > CHECK_VERSION_EVERY_MILLIS;
    const isOnline = await import('is-online');

    // If check is outdated and we are online then update the current NPM version.
    const shouldGetCurrentVersion = enforeUpdate || (isCheckOutdated && await isOnline.default({ timeout: 500 }));
    const latestNpmVersion = shouldGetCurrentVersion
        ? getAndCacheLatestNpmVersion()
        : cachedLatestNpmVersion;

    const currentNpmVersion = require('../../package.json').version; //  eslint-disable-line

    if (latestNpmVersion && semver.gt(latestNpmVersion, currentNpmVersion)) {
        console.log('');
        warning('You are using an old version of Apify CLI. We strongly recommend you always use the latest available version.');
        console.log(`       ↪ Run ${chalk.bgWhite(chalk.black(' npm install apify-cli@latest -g '))} to install it! 👍 \n`);
    } else if (shouldGetCurrentVersion) {
        // In this case the version was refreshed from the NPM which took a while and "Info: Making sure that Apify ..." was printed
        // so also print the state.
        info('Apify CLI is up to date 👍 \n');
    }
};

module.exports = {
    checkLatestVersion,
    getLatestNpmVersion,
};