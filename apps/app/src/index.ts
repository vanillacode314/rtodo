import cors from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { and, getTableColumns, gt, notLike } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

import { db } from './db/client';
import { receiveMessages } from './db/messages';
import * as schema from './db/schema';
import { auth } from './utils/auth';
import { getMetadata } from './utils/db';

const app = new Elysia({ serve: { idleTimeout: 120 } })
	.use(cors())
	.use(swagger())
	.ws('/api/v1/ws', {
		body: t.Union([
			t.Object({
				messages: t.Array(
					t.Object({
						columnName: t.String(),
						createdAt: t.String(),
						id: t.String(),
						resourceId: t.String(),
						tableName: t.String(),
						value: t.String()
					})
				),
				type: t.Literal('new_messages')
			})
		]),
		async message(ws, body) {
			switch (body.type) {
				case 'new_messages': {
					const { messages } = body;
					if (messages.length === 0) return;
					const { addedMessages, clock } = await receiveMessages(messages);
					ws.publish('new_messages', {
						messages: addedMessages,
						timestamp: clock.toString(),
						type: 'new_messages'
					});
					ws.send({
						timestamp: messages.at(-1)!.createdAt,
						type: 'got_messages'
					});
					break;
				}
			}
		},
		async open(ws) {
			ws.subscribe('new_messages');
			const { clientId, lastSyncedAt } = ws.data.query;
			const { syncedAt, ...rest } = getTableColumns(schema.messages);
			const messages = await db
				.select(rest)
				.from(schema.messages)
				.where(
					and(
						notLike(schema.messages.createdAt, `%${clientId}`),
						gt(schema.messages.syncedAt, lastSyncedAt!).if(lastSyncedAt !== undefined)
					)
				);
			ws.send({
				messages,
				timestamp: (await getMetadata('clock'))!,
				type: 'new_messages'
			});
		},
		query: t.Object({
			clientId: t.String(),
			lastSyncedAt: t.Optional(t.String())
		})
	})
	.all('/api/v1/auth/*', (context) => {
		const BETTER_AUTH_ACCEPT_METHODS = ['POST', 'GET'];
		if (BETTER_AUTH_ACCEPT_METHODS.includes(context.request.method)) {
			return auth.handler(context.request);
		} else {
			context.error(405);
		}
	})
	.listen(process.env.PORT || 3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
