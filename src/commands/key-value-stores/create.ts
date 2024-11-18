import { Args } from '@oclif/core';
import chalk from 'chalk';

import { ApifyCommand } from '../../lib/apify_command.js';
import { tryToGetKeyValueStore } from '../../lib/commands/storages.js';
import { error, success } from '../../lib/outputs.js';
import { getLoggedClientOrThrow } from '../../lib/utils.js';

export class KeyValueStoresCreateCommand extends ApifyCommand<typeof KeyValueStoresCreateCommand> {
	static override description = 'Creates a new Key-value store on your account';

	static override hiddenAliases = ['kvs:create'];

	static override args = {
		keyValueStoreName: Args.string({
			description: 'Optional name for the Key-value store',
			required: false,
		}),
	};

	static override enableJsonFlag = true;

	async run() {
		const { keyValueStoreName } = this.args;

		const client = await getLoggedClientOrThrow();

		if (keyValueStoreName) {
			const existing = await tryToGetKeyValueStore(client, keyValueStoreName);

			if (existing) {
				error({ message: 'Cannot create a Key-value store with the same name!' });
				return;
			}
		}

		const newStore = await client.keyValueStores().getOrCreate(keyValueStoreName);

		if (this.flags.json) {
			return newStore;
		}

		success({
			message: `Key-value store with ID ${chalk.yellow(newStore.id)}${keyValueStoreName ? ` (called ${chalk.yellow(keyValueStoreName)})` : ''} was created.`,
			stdout: true,
		});

		return undefined;
	}
}
