import { makeReconnectingWS } from '@solid-primitives/websocket';
import { type } from 'arktype';
import { and, gt, like } from 'drizzle-orm';
import { createComputed, untrack } from 'solid-js';

import { db } from '~/db/client';
import * as schema from '~/db/schema';
import { session } from '~/utils/auth-client';
import { getMetadata, setMetadata } from '~/utils/db';
import { env } from '~/utils/env';
import { receiveMessages } from '~/utils/messages';
import { queryClient } from '~/utils/query-client';
import { isOnline, pageVisible } from '~/utils/signals';

const shouldPoll = () => isOnline() && pageVisible() && session().data?.user.id;
const messageSchema = type('string.json.parse').pipe(
	type({
		type: "'new_messages'",
		messages: schema.messagesSchema.and({ syncedAt: 'string' }).array(),
		timestamp: 'string'
	}).or({
		type: "'got_messages'",
		timestamp: 'string'
	})
);
let ws: WebSocket;

async function initSocket() {
	const clientId = await getMetadata('clientId');
	if (!clientId) throw new Error('Missing clientId in local database metadata');

	async function setupWs() {
		if (ws && ws.readyState < 2) return;
		const searchParams = new URLSearchParams({ clientId });
		const lastSyncedAt = await getMetadata('lastPullAt');
		if (lastSyncedAt) {
			searchParams.set('lastSyncedAt', lastSyncedAt);
		}
		const socketUrl =
			import.meta.env.DEV ?
				`${env.VITE_SYNC_SERVER_BASE_URL.replace('http', 'ws')}/api/v1/ws?${searchParams.toString()}`
			:	`/api/v1/ws?${searchParams.toString()}`;

		ws = makeReconnectingWS(socketUrl);
		ws.addEventListener('open', () => {
			console.log('[WS] Connected');
			pushPendingMessages();
		});

		ws.addEventListener('message', async (event) => {
			const result = messageSchema.assert(event.data);
			if (result instanceof type.errors) {
				console.log('[WS Error]', result.summary);
				return;
			}
			switch (result.type) {
				case 'got_messages': {
					const lastPushAt = (await getMetadata('lastPushAt')) ?? null;
					if (lastPushAt === null || result.timestamp > lastPushAt) {
						await setMetadata('lastPushAt', result.timestamp);
					}
					break;
				}
				case 'new_messages': {
					try {
						await receiveMessages(result.messages);
						await queryClient.invalidateQueries();
					} catch (error) {
						console.log('[WS Pull Error]', error);
					}
					break;
				}
			}
		});
	}

	createComputed(() => {
		const $shouldPoll = shouldPoll();
		untrack(() => {
			if (!$shouldPoll) {
				console.log('[WS] Offline');
				if (ws && ws.readyState < 2) ws.close();
				return;
			}
			console.log('[WS] Online');
			setupWs();
		});
	});
}

async function pushPendingMessages() {
	if (!ws) return;
	if (ws.readyState !== 1) return;
	const lastPushAt = (await getMetadata('lastPushAt')) ?? null;
	const clientId = await getMetadata('clientId');
	if (!clientId) throw new Error('Missing clientId in local database metadata');
	const messages = await db
		.select()
		.from(schema.messages)
		.where(
			and(
				gt(schema.messages.timestamp, lastPushAt!).if(lastPushAt !== null),
				like(schema.messages.timestamp, `%${clientId}`)
			)
		);
	if (!messages.length) return;
	console.log('[WS Push] Found', messages.length, 'messages to push');
	ws.send(JSON.stringify({ type: 'new_messages', messages }));
}

export { initSocket, pushPendingMessages };
