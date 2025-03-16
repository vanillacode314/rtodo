import { createFileRoute, Outlet, useLocation } from '@tanstack/solid-router';

import ThePathCrumbs from '~/components/ThePathCrumbs';

export const Route = createFileRoute('/(app)/home/_explorer')({
	component: Component
});

function Component() {
	const location = useLocation();

	return (
		<div class="flex h-full flex-col">
			<ThePathCrumbs path={location().pathname.slice('/home'.length)} />
			<Outlet />
		</div>
	);
}
