import { createFileRoute, notFound } from '@tanstack/solid-router';
import { Show } from 'solid-js';

import { queries } from '~/queries';
import { queryClient } from '~/utils/query-client';

import { FolderPage } from './-components/FolderPage';
import { ListPage } from './-components/ListPage';

export const Route = createFileRoute('/(app)/home/_explorer/$')({
	component: Component,
	beforeLoad: ({ location }): { isList: boolean } => {
		return { isList: location.pathname.endsWith('.list') };
	},
	loader: async ({ params, context }): Promise<{ path: string }> => {
		const path = '/' + (params._splat ?? '');
		const [node] = await queryClient.ensureQueryData(
			queries.nodes.byPath(path, { includeChildren: !context.isList })
		);
		if (!node) throw notFound();

		if (context.isList) {
			await Promise.all([
				queryClient.ensureQueryData(queries.tasks.byNodeId(node.id)),
				queryClient.ensureQueryData(queries.tasks.byNodeId(node.id)._ctx.maxIndex)
			]);
		}

		return { path };
	}
});

function Component() {
	const context = Route.useRouteContext();
	return (
		<Show fallback={<FolderPage />} when={context().isList}>
			<ListPage />
		</Show>
	);
}
