import { Key } from '@solid-primitives/keyed';
import { RouteDefinition } from '@solidjs/router';
import { createQuery, useQueryClient } from '@tanstack/solid-query';
import { Suspense } from 'solid-js';
import { toast } from 'solid-sonner';

import { TAction } from '~/components/Fab';
import ThePathCrumbs from '~/components/ThePathCrumbs';
import { Button } from '~/components/ui/button';
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
	const [appContext, { clearClipboard }] = useApp();

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

	const actions = (): TAction[] => {
		return [
			{
				handler: clearClipboard,
				icon: 'i-heroicons:x-circle',
				label: 'Clear',
				variant: 'secondary'
			}
		];
	};

	return (
		<>
			<ThePathCrumbs />
			<Suspense>
				{/* <Fab actions={actions()} /> */}
				<div class="flex h-full flex-col">
					{/* <Toolbar actions={actions()} currentNode={currentNode()!} nodes={children()} /> */}
					<div class="flex flex-col gap-2">
						<Key by="id" each={tasks.data}>
							{(task) => (
								<div>
									<TextField>
										<TextFieldInput
											onBlur={async (event) => {
												const body = event.currentTarget.value;
												if (body === '') {
													await updateTask({ id: task().id, deleted: true });
													return;
												}
												if (body === task().body) return;
												await updateTask({ id: task().id, body });
												toast.success('Task updated');
											}}
											value={task().body}
										/>
									</TextField>
								</div>
							)}
						</Key>
						<Button class="justify-start" onClick={() => createTask()} variant="ghost">
							<span>New Todo</span>
							<span class="i-heroicons:plus text-lg" />
						</Button>
					</div>
				</div>
			</Suspense>
		</>
	);
}
