import { type } from 'arktype';
import { createSelectSchema } from 'drizzle-arktype';
import {
	type AnySQLiteColumn,
	integer,
	real,
	sqliteTable,
	text,
	unique
} from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

const sqliteBool = type('boolean').or(type('number').pipe((v) => v === 1));

const timestamp = () => text().notNull();
const updatedAt = () => text({ mode: 'json' }).notNull().$type<Record<string, string>>();

const metadata = sqliteTable('metadata', {
	key: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	value: text().notNull()
});

const nodes = sqliteTable(
	'nodes',
	{
		createdAt: timestamp(),
		id: text().primaryKey().$defaultFn(nanoid),
		name: text().notNull(),
		parentId: text(),
		updatedAt: updatedAt(),
		deleted: integer({ mode: 'boolean' }).notNull().default(false)
	},
	(t) => [unique().on(t.name, t.parentId)]
);

const tasks = sqliteTable('tasks', {
	id: text().primaryKey().$defaultFn(nanoid),
	index: real().notNull().default(0),
	nodeId: text().references((): AnySQLiteColumn => nodes.id, {
		onDelete: 'cascade'
	}),
	body: text().notNull().default(''),
	createdAt: timestamp(),
	updatedAt: timestamp(),
	goesOffAt: integer({ mode: 'timestamp_ms' }).notNull(),
	repeatsEvery: text({ mode: 'json' }).$type<{
		count: number;
		duration: 'day' | 'month' | 'year';
	}>(),
	deleted: integer({ mode: 'boolean' }).notNull().default(false)
});

const messages = sqliteTable('messages', {
	timestamp: timestamp().primaryKey(),
	user_intent: text().notNull(),
	meta: text({ mode: 'json' }).notNull().$type<Record<string, unknown>>()
});

const metadataSchema = createSelectSchema(metadata);
const nodesSchema = createSelectSchema(nodes, {
	updatedAt: type([
		['string.json.parse', '|>', 'Record<string, string>'],
		'|',
		'Record<string, string>'
	]),
	deleted: sqliteBool
});
const tasksSchema = createSelectSchema(tasks, {
	index: type('0 < number < 1'),
	deleted: sqliteBool
}).merge({
	'repeatsEvery?': [
		{
			count: 'number',
			duration: "'day' | 'month' | 'year'"
		},
		'|',
		'null'
	]
});
const messagesSchema = createSelectSchema(messages);

type TMessage = typeof messages.$inferSelect;
type TMetadata = typeof metadata.$inferSelect;
type TNode = typeof nodes.$inferSelect;
type TTask = typeof tasks.$inferSelect;

export {
	messages,
	messagesSchema,
	metadata,
	metadataSchema,
	nodes,
	nodesSchema,
	tasks,
	tasksSchema
};
export type { TMessage, TMetadata, TNode, TTask };
