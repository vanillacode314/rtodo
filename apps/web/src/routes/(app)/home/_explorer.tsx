import { createFileRoute, Outlet, useLocation } from '@tanstack/solid-router';

import ThePathCrumbs from '~/components/ThePathCrumbs';

export const Route = createFileRoute('/(app)/home/_explorer')({
	component: Component
});

function Component() {
	const location = useLocation();

	return (
		<div class="grid h-full grid-cols-1 grid-rows-[auto_1fr]">
			<ThePathCrumbs path={location().pathname.slice('/home'.length)} />
			<div class="p-1">
				<Outlet />
			</div>
		</div>
	);
}
