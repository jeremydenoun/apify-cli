const { finished } = require('stream');
const { promisify } = require('util');

const { Command } = require('@oclif/command');

const { LANGUAGE, COMMANDS_WITHIN_ACTOR } = require('./consts');
const { maybeTrackTelemetry } = require('./telemetry');
const { argsToCamelCase } = require('./utils');
const { detectLocalActorLanguage } = require('./utils');
const { detectInstallationType } = require('./version_check');

/**
 * Adding parsing flags to oclif Command class
 */
class ApifyCommand extends Command {
    async init() {
        await super.init();
        // Initialize telemetry data, all attributes are tracked in the finally method
        this.telemetryData = {};
    }

    parse(cmd) {
        const { flags, args } = super.parse(cmd);
        const parsedFlags = argsToCamelCase(flags);
        this.telemetryData.flagsUsed = Object.keys(parsedFlags);
        return { flags: parsedFlags, args };
    }

    async finally(err) {
        const command = this.id;
        const eventData = {
            command,
            $os: this.config.platform,
            shell: this.config.shell,
            arch: this.config.arch,
            apifyCliVersion: this.config.version,
            nodeJsVersion: process.version,
            ...this.telemetryData,
            error: err ? err.message : null,
        };
        try {
            eventData.installationType = await detectInstallationType();
            if (!this.telemetryData.actorLanguage && command && COMMANDS_WITHIN_ACTOR.includes(command)) {
                const { language, languageVersion } = detectLocalActorLanguage();
                eventData.actorLanguage = language;
                if (language === LANGUAGE.NODEJS) {
                    eventData.actorNodejsVersion = languageVersion;
                } else if (language === LANGUAGE.PYTHON) {
                    eventData.actorPythonVersion = languageVersion;
                }
            }
            await maybeTrackTelemetry({
                eventName: `cli_command_${command}`,
                eventData,
            });
        } catch (e) {
            // Ignore errors
        }
        return super.finally(err);
    }

    /**
     * Reads data on standard input as a string.
     * @return {Promise<string|undefined>}
     */
    async readStdin(stdinStream) {
        // The isTTY params says if TTY is connected to the process, if so the stdout is
        // synchronous and the stdout steam is empty.
        // See https://nodejs.org/docs/latest-v12.x/api/process.html#process_a_note_on_process_i_o
        if (stdinStream.isTTY) return;

        const bufferChunks = [];
        stdinStream.on('data', (chunk) => {
            bufferChunks.push(chunk);
        });

        await promisify(finished)(stdinStream);
        return Buffer.concat(bufferChunks).toString('utf-8');
    }
}

module.exports = { ApifyCommand };