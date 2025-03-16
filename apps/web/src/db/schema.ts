import { type } from 'arktype';
import { AnySQLiteColumn, integer, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

const timestamp = () => text().notNull();

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
		name: text().notNull().$defaultFn(nanoid),
		parentId: text().references((): AnySQLiteColumn => nodes.id, {
			onDelete: 'cascade'
		}),
		updatedAt: timestamp(),
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
	deleted: integer({ mode: 'boolean' }).notNull().default(false)
});

const messages = sqliteTable('messages', {
	id: text().primaryKey().$defaultFn(nanoid),
	resourceId: text().notNull().$defaultFn(nanoid),
	tableName: text().notNull(),
	columnName: text().notNull(),
	value: text().notNull(),
	createdAt: timestamp()
});

const metadataSchema = type({
	key: 'string',
	value: 'string'
});

const nodesSchema = type({
	id: 'string',
	name: 'string',
	parentId: 'string | null',
	createdAt: 'string',
	updatedAt: 'string',
	deleted: type('boolean').or(type('number').pipe((v) => v === 1))
});

const tasksSchema = type({
	id: 'string',
	index: '0 < number < 1',
	body: 'string',
	nodeId: 'string',
	createdAt: 'string',
	updatedAt: 'string',
	deleted: type('boolean').or(type('number').pipe((v) => v === 1))
});

const messagesSchema = type({
	id: 'string',
	resourceId: 'string',
	tableName: 'string',
	columnName: 'string',
	value: type('string').narrow((value, ctx) => {
		if (value.indexOf(':') === -1) {
			return ctx.mustBe('a string with a colon separating the type and value');
		}
		return true;
	}),
	createdAt: 'string'
});

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
