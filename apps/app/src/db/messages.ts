import { getLocalClock, setLocalClock } from '~/utils/clock';

import { db } from './client';
import * as schema from './schema';

async function receiveMessage(message: Omit<schema.TMessage, 'syncedAt'>) {
	const clock = await getLocalClock();
	return await db.transaction(async (tx) => {
		const [row] = await db
			.insert(schema.messages)
			.values({
				...message,
				syncedAt: clock.increment().toString()
			})
			.onConflictDoNothing({
				target: schema.messages.timestamp
			})
			.returning();
		await setLocalClock(clock);
		return row;
	});
}
async function receiveMessages(messages: Omit<schema.TMessage, 'syncedAt'>[]) {
	if (messages.length === 0) throw new Error('No messages');
	const addedMessages = await Promise.all(messages.map((message) => receiveMessage(message)));
	return addedMessages;
}

export { receiveMessages };
