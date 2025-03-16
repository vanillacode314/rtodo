import { getLocalClock, setLocalClock } from '~/utils/clock';

import { db } from './client';
import * as schema from './schema';

async function receiveMessages(messages: Omit<schema.TMessage, 'syncedAt'>[]) {
	if (messages.length === 0) throw new Error('No messages');

	const clock = await getLocalClock();
	const addedMessages = await db
		.insert(schema.messages)
		.values(
			messages.map((message) => ({
				...message,
				syncedAt: clock.increment().toString()
			}))
		)
		.onConflictDoNothing({
			target: schema.messages.id
		})
		.returning();
	await setLocalClock(clock);
	return { addedMessages, clock };
}

export { receiveMessages };
