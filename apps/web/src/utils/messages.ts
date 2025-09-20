import type { SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
import type { Transaction } from 'sqlocal';

import { match } from 'arktype';
import { getTableName } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { beginTransaction, db } from '~/db/client';
import * as schema from '~/db/schema';
import { processMessage, type TValidMessage, validMessage } from '~/queries/mutations';

import { getLocalClock, setLocalClock } from './clock';
import { setMetadata } from './db';

const toSql = match({
	object: (value) => JSON.stringify(value),
	string: (value) => value,
	number: (value) => value,
	boolean: (value) => (value ? 1 : 0),
	null: () => null,
	default: 'assert'
});

type TUpdate<T extends SQLiteTableWithColumns<any> = SQLiteTableWithColumns<any>> = {
	data: Record<string, unknown>;
	id: string;
	operation: string;
	table: T;
};

async function applyUpdate(
	update: TUpdate,
	timestamp: string,
	opts: { tx?: Transaction } = {}
): Promise<void> {
	const tx = opts?.tx ?? (await beginTransaction());

	const tableName = getTableName(update.table);
	const columns = Object.keys(update.data).filter((column) => update.data[column] !== undefined);
	const id = update.id ?? nanoid();

	switch (update.operation) {
		case 'insert': {
			const values = columns.map((column) => update.data[column]);
			await tx.query({
				sql: `
          INSERT INTO "${tableName}"("id",${columns.map((column) => `"${column}"`).join(',')},"createdAt","updatedAt")
            VALUES(?,${values.map(() => '?').join(',')},?,?)
        `,
				params: [
					id,
					...values,
					timestamp,
					Object.fromEntries(columns.map((column) => [column, timestamp]))
				].map((value) => toSql(value))
			});
			break;
		}
		case 'update': {
			for (const column of columns) {
				await tx.query({
					sql: `UPDATE "${tableName}" SET "${column}"=? WHERE "id"=? AND ("updatedAt"->>'$.${column}'<? OR "updatedAt"->>'$.${column}' IS NULL)`,
					params: [update.data[column], id, timestamp].map((value) => toSql(value))
				});
				await tx.query({
					sql: `UPDATE "${tableName}" SET "updatedAt"=json_replace("updatedAt", '$.${column}', ?) WHERE "id"=?`,
					params: [timestamp, id].map((value) => toSql(value))
				});
			}
			break;
		}
		default: {
			throw new Error(`Unknown operation: ${update.operation}`);
		}
	}

	if (!opts?.tx) await tx.commit();
}

async function applyUpdates(
	updates: TUpdate[],
	timestamp: string,
	opts: { tx?: Transaction } = {}
): Promise<void> {
	const tx = opts?.tx ?? (await beginTransaction());
	if (updates.length === 0) return;

	const promises = updates.map((update) => applyUpdate(update, timestamp, opts));
	await Promise.all(promises);

	if (!opts?.tx) await tx.commit();
}

async function createMessages(
	...messages: Array<TValidMessage & { timestamp?: string }>
): Promise<void> {
	if (messages.length === 0) return;

	const clock = await getLocalClock();
	const updates = (await Promise.all(messages.map((message) => processMessage(message)))).flat();
	const tx = await beginTransaction();
	const timestamp = clock.increment().toString();
	for (const message of messages) {
		message.timestamp = timestamp;
	}
	try {
		await tx.query(
			db
				.insert(schema.messages)
				.values(messages as schema.TMessage[])
				.onConflictDoNothing({
					target: schema.messages.timestamp
				})
				.returning()
		);
		await setLocalClock(clock, tx);
		await applyUpdates(updates, timestamp, { tx });
		await tx.commit();
	} catch (error) {
		await tx.rollback();
		throw error;
	}
}

async function receiveMessages(
	messages: Array<schema.TMessage & { syncedAt: string }>
): Promise<void> {
	if (messages.length === 0) return;
	const clock = await getLocalClock();

	for (const message of messages) {
		const updates = await processMessage(validMessage.assert(message));
		const tx = await beginTransaction();
		try {
			await tx.query(
				db.insert(schema.messages).values(messages).onConflictDoNothing({
					target: schema.messages.timestamp
				})
			);
			await applyUpdates(updates, message.timestamp, { tx });
			await setMetadata('lastPullAt', message.syncedAt, tx);
			clock.receive(message.timestamp);
			await setLocalClock(clock, tx);
			await tx.commit();
		} catch (error) {
			console.error('[Error][receiveMessages]: ', message, error);
			await tx.rollback();
		}
	}
}

export { createMessages, receiveMessages };
