import cors from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { and, eq, getTableColumns, gt, notLike } from 'drizzle-orm';
import { Elysia, t } from 'elysia';

import { db } from './db/client';
import { receiveMessages } from './db/messages';
import * as schema from './db/schema';
import { auth } from './utils/auth';
import { getMetadata } from './utils/db';

const betterAuth = new Elysia({ name: 'better-auth' }).mount(auth.handler).macro({
	auth: {
		async resolve({ error, request: { headers } }) {
			const session = await auth.api.getSession({
				headers
			});

			if (!session) return error(401);

			return {
				session: session.session,
				user: session.user
			};
		}
	}
});

const app = new Elysia({ serve: { idleTimeout: 120 } })
	.use(betterAuth)
	.use(cors())
	.use(swagger())
	.ws('/api/v1/ws', {
		auth: true,
		body: t.Union([
			t.Object({
				messages: t.Array(
					t.Object({
						meta: t.Record(t.String(), t.Unknown()),
						timestamp: t.String(),
						user_intent: t.String()
					})
				),
				type: t.Literal('new_messages')
			})
		]),
		async message(ws, body) {
			switch (body.type) {
				case 'new_messages': {
					const { messages } = body;
					const userId = ws.data.user.id as string;
					if (messages.length === 0) return;
					const addedMessages = await receiveMessages(
						messages.map((message) => ({ ...message, userId }))
					);
					const timestamp = await getMetadata('clock');
					ws.send({ timestamp, type: 'got_messages' });
					if (addedMessages.length <= 0) return;
					ws.publish(`new_messages-${userId}`, {
						messages: addedMessages,
						timestamp,
						type: 'new_messages'
					});
					break;
				}
			}
		},
		async open(ws) {
			const userId = ws.data.user.id as string;
			ws.subscribe(`new_messages-${userId}`);
			const { clientId, lastSyncedAt } = ws.data.query;
			const { userId: _, ...rest } = getTableColumns(schema.messages);
			const messages = await db
				.select(rest)
				.from(schema.messages)
				.where(
					and(
						notLike(schema.messages.timestamp, `%${clientId}`),
						gt(schema.messages.syncedAt, lastSyncedAt!).if(lastSyncedAt !== undefined),
						eq(schema.messages.userId, userId)
					)
				);
			if (messages.length <= 0) return;
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
	.listen(process.env.PORT || 3000);

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);
