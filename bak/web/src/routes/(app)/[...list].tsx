import { Key } from '@solid-primitives/keyed';
import { RouteDefinition } from '@solidjs/router';
import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { nanoid } from 'nanoid';
import { Suspense } from 'solid-js';

import ThePathCrumbs from '~/components/ThePathCrumbs';
import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { RESERVED_PATHS } from '~/consts/index';
import { useApp } from '~/context/app';
import * as schema from '~/db/schema';
import { queries } from '~/queries';
import { randomFloat } from '~/utils/math';
import { createMessages, createUpdate } from '~/utils/messages';

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
	const [appContext, { setActions }] = useApp();

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

	async function createTask() {
		if (!tasks.isSuccess) return;
		if (!maxIndex.isSuccess) return;

		const index = randomFloat({ min: maxIndex!.data });
		await createMessages(
			'create_task',
			createUpdate({
				operation: 'insert',
				table: schema.tasks,
				data: { index, body: 'New Task', nodeId: node.data!.id },
				id: nanoid()
			})
		);
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
								<Card class="border-none bg-zinc-200 transition-transform motion-safe:hover:-translate-x-1 motion-safe:hover:-translate-y-1 dark:bg-zinc-900">
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
