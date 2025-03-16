import type { InferSelectModel } from 'drizzle-orm';

import { type } from 'arktype';
import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { nanoid } from 'nanoid';

import * as authSchema from './auth-schema';

const timestamp = () => text().notNull();

const metadata = sqliteTable('metadata', {
	key: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	value: text().notNull()
});

const messages = sqliteTable('messages', {
	columnName: text().notNull(),
	createdAt: timestamp(),
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	resourceId: text()
		.notNull()
		.$defaultFn(() => nanoid()),
	syncedAt: timestamp(),
	tableName: text().notNull(),
	value: text().notNull()
	// userId: text().notNull().references(() => authSchema.user.id)
});

const metadataSchema = type({
	key: 'string',
	value: 'string'
});

const messagesSchema = type({
	columnName: 'string',
	createdAt: 'string',
	id: 'string',
	resourceId: 'string',
	syncedAt: 'string',
	tableName: 'string',
	value: type('string').narrow((value, ctx) => {
		if (value.indexOf(':') === -1) {
			return ctx.mustBe('a string with a colon separating the type and value');
		}
		return true;
	})
});

type TMessage = InferSelectModel<typeof messages>;
type TMetadata = InferSelectModel<typeof metadata>;

export * from './auth-schema';
export { messages, messagesSchema, metadata, metadataSchema };
export type { TMessage, TMetadata };
