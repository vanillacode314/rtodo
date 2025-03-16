import { Key } from '@solid-primitives/keyed';
import { RouteDefinition } from '@solidjs/router';
import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { Suspense } from 'solid-js';
import { toast } from 'solid-sonner';

import ThePathCrumbs from '~/components/ThePathCrumbs';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { TextField, TextFieldInput } from '~/components/ui/text-field';
import { RESERVED_PATHS } from '~/consts/index';
import { useApp } from '~/context/app';
import * as schema from '~/db/schema';
import { queries } from '~/queries';
import { randomFloat } from '~/utils/math';
import { createMessages } from '~/utils/messages';

export const route: RouteDefinition = {
	matchFilters: {
		list: (pathname: string) => {
			if (RESERVED_PATHS.includes(`/${pathname}`)) return false;
			if (!pathname.endsWith('.list')) return false;
			return true;
		}
	}
};

export default function ListPage() {
	const queryClient = useQueryClient();
	const [appContext, { setActions, clearClipboard }] = useApp();

	const node = createQuery(() => ({
		...queries.nodes.byPath({ path: appContext.path }),
		select: (nodes) => nodes[0],
		networkMode: 'always'
	}));

	const tasks = createQuery(() => ({
		...queries.tasks.byNodeId(node.data?.id),
		enabled: Boolean(node.data),
		networkMode: 'always'
	}));

	const maxIndex = createQuery(() => ({
		...queries.tasks.byNodeId(node.data?.id)._ctx.maxIndex,
		enabled: Boolean(node.data),
		networkMode: 'always'
	}));

	async function updateTask(data: Partial<schema.TTask>) {
		await createMessages(schema.tasks, data);
		await queryClient.invalidateQueries({ queryKey: queries.tasks._def });
	}

	async function createTask() {
		if (!tasks.isSuccess) return;
		if (!maxIndex.isSuccess) return;

		const index = randomFloat({ min: maxIndex!.data });
		await createMessages(schema.tasks, { index, body: 'New Task', nodeId: node.data!.id });
		await queryClient.invalidateQueries({ queryKey: queries.tasks._def });
	}

	setActions([
		{
			handler: createTask,
			icon: 'i-heroicons:plus',
			label: 'New Task'
		}
	]);

	return (
		<div class="flex h-full flex-col">
			<ThePathCrumbs />
			<Suspense>
				{/* <Fab actions={actions()} /> */}
				<div class="flex h-full flex-col overflow-auto">
					{/* <Toolbar actions={actions()} currentNode={currentNode()!} nodes={children()} /> */}
					<div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-px">
						<Key by="id" each={tasks.data}>
							{(task) => (
								<Card class="border-none bg-zinc-900">
									<CardHeader>
										<CardTitle>{task().body}</CardTitle>
										<CardDescription>Everyday @ 2PM</CardDescription>
									</CardHeader>
								</Card>
							)}
						</Key>
					</div>
				</div>
			</Suspense>
		</div>
	);
}
