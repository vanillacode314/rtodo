import { makeReconnectingWS } from '@solid-primitives/websocket';
import { type } from 'arktype';
import { and, gt, like } from 'drizzle-orm';
import { createComputed, untrack } from 'solid-js';

import { beginTransaction, db } from '~/db/client';
import * as schema from '~/db/schema';
import { session } from '~/utils/auth-client';
import { getLocalClock } from '~/utils/clock';
import { getMetadata, setMetadata } from '~/utils/db';
import { env } from '~/utils/env';
import { receiveMessages } from '~/utils/messages';
import { queryClient } from '~/utils/query-client';
import { isOnline, pageVisible } from '~/utils/signals';

const searchParams = new URLSearchParams({
	clientId: (await getMetadata('clientId'))!
});
const lastSyncedAt = await getMetadata('lastPullAt');
if (lastSyncedAt) {
	searchParams.set('lastSyncedAt', lastSyncedAt);
}

let ws: WebSocket;
function setupWs() {
	if (ws && ws.readyState < 2) return;
	ws = makeReconnectingWS(`/api/v1/ws?${searchParams.toString()}`);
	ws.addEventListener('open', () => {
		console.log('[WS] Connected');
		pushWs();
	});
	ws.addEventListener('message', async (event) => {
		const result = messageSchema(event.data);
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
				const clock = await getLocalClock();
				const tx = await beginTransaction();
				try {
					await receiveMessages(result.messages, { tx, clock });
					await setMetadata('lastPullAt', result.timestamp, tx);
					await tx.commit();
					await queryClient.invalidateQueries();
				} catch (error) {
					console.log('[WS Pull Error]', error);
					await tx.rollback();
				}
				break;
			}
		}
	});
}

setupWs();
let firstRun = true;
createComputed(() => {
	const shouldPoll = isOnline() && pageVisible() && session().data?.user.id;
	untrack(() => {
		if (!shouldPoll) {
			firstRun = false;
			console.log('[WS] Offline');
			if (ws && ws.readyState < 2) ws.close();
			return;
		}
		if (firstRun) {
			firstRun = false;
			return;
		}
		console.log('[WS] Online');
		setupWs();
	});
});

const messageSchema = type('string.json.parse').pipe(
	type({
		type: "'new_messages'",
		messages: schema.messagesSchema.array(),
		timestamp: 'string'
	}).or({
		type: "'got_messages'",
		timestamp: 'string'
	})
);

async function pushWs() {
	if (ws.readyState !== 1) return;
	const lastPushAt = (await getMetadata('lastPushAt')) ?? null;
	const clientId = (await getMetadata('clientId'))!;
	const messages = await db
		.select()
		.from(schema.messages)
		.where(
			and(
				gt(schema.messages.createdAt, lastPushAt!).if(lastPushAt !== null),
				like(schema.messages.createdAt, `%${clientId}`)
			)
		);
	console.log('[WS Push] Found', messages.length, 'messages to push');
	if (!messages.length) return;
	ws.send(JSON.stringify({ type: 'new_messages', messages }));
}

export { pushWs };
