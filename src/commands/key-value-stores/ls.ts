import { Flags } from '@oclif/core';
import chalk from 'chalk';

import { ApifyCommand } from '../../lib/apify_command.js';
import { prettyPrintBytes } from '../../lib/commands/pretty-print-bytes.js';
import { CompactMode, ResponsiveTable } from '../../lib/commands/responsive-table.js';
import { info, simpleLog } from '../../lib/outputs.js';
import { getLocalUserInfo, getLoggedClientOrThrow, TimestampFormatter } from '../../lib/utils.js';

const table = new ResponsiveTable({
	allColumns: ['Store ID', 'Name', 'Size', 'Created', 'Modified'],
	mandatoryColumns: ['Store ID', 'Name', 'Size'],
});

export class KeyValueStoresLsCommand extends ApifyCommand<typeof KeyValueStoresLsCommand> {
	static override description = 'Lists all Key-value stores on your account.';

	static override hiddenAliases = ['kvs:ls'];

	static override flags = {
		offset: Flags.integer({
			description: 'Number of Key-value stores that will be skipped.',
			default: 0,
		}),
		limit: Flags.integer({
			description: 'Number of Key-value stores that will be listed.',
			default: 20,
		}),
		desc: Flags.boolean({
			description: 'Sorts Key-value stores in descending order.',
			default: false,
		}),
		unnamed: Flags.boolean({
			description: "Lists Key-value stores that don't have a name set.",
			default: false,
		}),
	};

	static override enableJsonFlag = true;

	async run() {
		const { desc, offset, limit, json, unnamed } = this.flags;

		const client = await getLoggedClientOrThrow();
		const user = await getLocalUserInfo();

		const rawKvsList = await client.keyValueStores().list({ desc, offset, limit, unnamed });

		if (json) {
			return rawKvsList;
		}

		if (rawKvsList.count === 0) {
			info({
				message: "You don't have any Key-value stores on your account",
				stdout: true,
			});

			return;
		}

		for (const store of rawKvsList.items) {
			// TODO: update apify-client types
			const statsObject = Reflect.get(store, 'stats') as { s3StorageBytes?: number };
			const size = statsObject.s3StorageBytes;

			console.log(size);

			table.pushRow({
				'Store ID': store.id,
				Created: TimestampFormatter.display(store.createdAt),
				Modified: TimestampFormatter.display(store.modifiedAt),
				Name: store.name ? `${user.username!}/${store.name}` : '',
				Size:
					typeof size === 'number'
						? prettyPrintBytes({ bytes: size, shortBytes: true, colorFunc: chalk.gray, precision: 0 })
						: chalk.gray('N/A'),
			});
		}

		simpleLog({
			message: table.render(CompactMode.WebLikeCompact),
			stdout: true,
		});

		return undefined;
	}
}