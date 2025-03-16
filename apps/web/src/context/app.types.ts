import { type } from 'arktype';
import { nanoid } from 'nanoid';

import { Button } from '~/components/ui/button';
import { nodesSchema, tasksSchema } from '~/db/schema';

const clipboardItemSchema = type({
	data: 'string',
	'meta?': 'unknown',
	mode: '"copy"|"move"|"selection"',
	type: type('string').as<`${string}/${string}`>()
});
type TClipboardItem = typeof clipboardItemSchema.infer;

const actionSchema = type({
	handler: type('Function').as<(event: Event) => Promise<unknown> | unknown>(),
	'icon?': 'string',
	label: 'string',
	'variant?': type('string').as<Parameters<typeof Button>[0]['variant']>()
});
type TAction = typeof actionSchema.infer;

const appContextSchema = type({
	actions: actionSchema.array().default(() => []),
	clipboard: clipboardItemSchema.array().default(() => []),
	connectedClients: type({
		currentlyAt: { id: 'string', resourceType: 'string' },
		id: 'string',
		name: 'string'
	})
		.array()
		.default(() => []),
	currentNode: nodesSchema.or('null').default(null),
	currentTask: tasksSchema.or('null').default(null),
	id: ['string', '=', () => nanoid()],
	mode: ['"normal"|"selection"', '=', 'normal'],
	path: 'string'
});

type TAppContext = typeof appContextSchema.infer;

export { actionSchema, appContextSchema, clipboardItemSchema };
export type { TAction, TAppContext, TClipboardItem };
