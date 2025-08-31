import { createSelectSchema } from 'drizzle-arktype';
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
	meta: text({ mode: 'json' }).notNull().$type<Record<string, unknown>>(),
	syncedAt: timestamp(),
	timestamp: timestamp().primaryKey(),
	user_intent: text().notNull(),
	userId: text()
		.notNull()
		.references(() => authSchema.user.id)
});

const metadataSchema = createSelectSchema(metadata);
const messagesSchema = createSelectSchema(messages);

type TMessage = typeof messagesSchema.infer;
type TMetadata = typeof metadataSchema.infer;

export * from './auth-schema';
export { messages, messagesSchema, metadata, metadataSchema };
export type { TMessage, TMetadata };
