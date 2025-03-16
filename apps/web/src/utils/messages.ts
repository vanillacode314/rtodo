import { match } from 'arktype';
import { and, count, eq, getTableName, gt, sql } from 'drizzle-orm';
import { type SQLiteTableWithColumns } from 'drizzle-orm/sqlite-core';
import { HLC } from 'hlc';
import { nanoid } from 'nanoid';
import { Transaction } from 'sqlocal';

import { beginTransaction, db } from '~/db/client';
import * as schema from '~/db/schema';

import { asyncFilter } from './array';
import { getLocalClock, setLocalClock } from './clock';

type FilterTables<T extends unknown> = T extends SQLiteTableWithColumns<any> ? T : never;
type TTables = FilterTables<(typeof schema)[keyof typeof schema]>;

const withDataType = match({
	string: (value) => `string:${value}`,
	number: (value) => `number:${value}`,
	boolean: (value) => `number:${value ? 1 : 0}`,
	null: () => `null:`,
	'Record<string, unknown>': (value) => `json:${JSON.stringify(value)}`,
	default: 'assert'
});

const fromDataType = (input: null | string) => {
	if (input === null) return null;
	const [t, value] = input.split(':', 2);
	if (value === undefined) {
		throw new Error(`Invalid value: ${input}`);
	}
	switch (t) {
		case 'json':
			return JSON.parse(value);
		case 'null':
			return null;
		case 'number':
			return Number(value);
		case 'string':
			return value;
		default:
			throw new Error(`Invalid type: ${t}`);
	}
};

async function applyMessages(
	messages: schema.TMessage[],
	opts: { tx?: Transaction } = {}
): Promise<void> {
	const tx = opts?.tx ?? (await beginTransaction());
	const newMessages = await asyncFilter(messages, async (message) => {
		const q = db
			.select({ id: schema.messages.id })
			.from(schema.messages)
			.where(
				and(
					eq(schema.messages.tableName, message.tableName),
					eq(schema.messages.columnName, message.columnName),
					eq(schema.messages.resourceId, message.resourceId),
					gt(schema.messages.createdAt, message.createdAt)
				)
			)
			.limit(1);
		const rows = await tx.query(q);
		return rows.length === 0;
	});
	if (newMessages.length === 0) return;
	const promises = newMessages.map((message) => {
		const parsedValue = fromDataType(message.value);
		const q = sql`
      INSERT INTO "${sql.raw(message.tableName)}"("id","${sql.raw(message.columnName)}","createdAt","updatedAt")
      VALUES(${message.resourceId},${parsedValue},${message.createdAt},${message.createdAt})
      ON CONFLICT("id") DO UPDATE SET
        "${sql.raw(message.columnName)}"=${parsedValue},
        "updatedAt"=${message.createdAt}
    `;
		return tx.query(db.run(q).getQuery());
	});

	await Promise.all(promises);
	if (!opts?.tx) await tx.commit();
}

async function createMessages<TTable extends TTables>(
	table: TTable,
	...values: Array<
		Omit<NoInfer<TTable>['$inferInsert'], 'createdAt' | 'updatedAt'> & {
			id?: string;
		}
	>
): Promise<void> {
	if (!values.length) return;
	const clock = await getLocalClock();
	const tx = await beginTransaction();
	for (const value of values) {
		value.id ||= nanoid();
	}
	const tableName = getTableName(table);

	try {
		const messages: schema.TMessage[] = await tx.query(
			db
				.insert(schema.messages)
				.values(
					values.flatMap((value) => {
						const resourceId = value.id;
						return Object.entries(value)
							.filter(([columnName]) => !['id'].includes(columnName))
							.map(([columnName, value]) => ({
								resourceId,
								tableName,
								columnName,
								value: withDataType(value),
								createdAt: clock.increment().toString()
							}));
					})
				)
				.returning()
		);
		await setLocalClock(clock, tx);
		await applyMessages(messages, { tx });
		await tx.commit();
	} catch (error) {
		await tx.rollback();
		throw error;
	}
}

async function receiveMessages(
	messages: schema.TMessage[],
	opts?: { clock: HLC; tx: Transaction }
): Promise<void> {
	if (messages.length === 0) return;
	const tx = opts?.tx ?? (await beginTransaction());
	const clock = opts?.clock ?? (await getLocalClock());
	try {
		await applyMessages(messages, { tx });
		await tx.query(
			db.insert(schema.messages).values(messages).onConflictDoNothing({
				target: schema.messages.id
			})
		);
		for (const message of messages) {
			clock.receive(message.createdAt);
		}
		await setLocalClock(clock, tx);
		if (!opts?.tx) await tx.commit();
	} catch (error) {
		await tx.rollback();
		throw error;
	}
}

export { createMessages, receiveMessages };
