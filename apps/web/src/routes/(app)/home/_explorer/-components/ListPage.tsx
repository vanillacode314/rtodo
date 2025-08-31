import { Key } from '@solid-primitives/keyed';
import { useQuery } from '@tanstack/solid-query';
import { getRouteApi } from '@tanstack/solid-router';

import { Card, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { useApp } from '~/context/app';
import { queries } from '~/queries';

export function ListPage() {
	const [_appContext, { setActions }] = useApp();
	const routeApi = getRouteApi('/(app)/home/_explorer/$');
	const loaderData = routeApi.useLoaderData();
	const navigate = routeApi.useNavigate();

	const node = useQuery(() => ({
		...queries.nodes.byPath(loaderData().path),
		select: (nodes) => nodes[0],
		networkMode: 'always'
	}));

	const tasks = useQuery(() => ({
		...queries.tasks.byNodeId(node.data?.id),
		enabled: Boolean(node.data),
		networkMode: 'always'
	}));

	setActions([
		{
			handler: () => navigate({ to: '/tasks/create', search: { path: loaderData().path } }),
			icon: 'i-heroicons:plus',
			label: 'New Task'
		}
	]);

	return (
		<div class="flex h-full flex-col overflow-auto">
			{/* <Toolbar actions={actions()} currentNode={currentNode()!} nodes={children()} /> */}
			<div class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-1">
				<Key by="id" each={tasks.data}>
					{(task) => (
						<Card class="border-none bg-zinc-200 transition-transform motion-safe:hover:-translate-x-1 motion-safe:hover:-translate-y-1 dark:bg-zinc-900">
							<CardHeader>
								<CardTitle>{task().body}</CardTitle>
								<CardDescription>@ {task().goesOffAt.toLocaleString()}</CardDescription>
							</CardHeader>
						</Card>
					)}
				</Key>
			</div>
		</div>
	);
}
