import { createFileRoute, redirect } from '@tanstack/solid-router';

export const Route = createFileRoute('/(app)/')({
	beforeLoad: () => {
		throw redirect({ href: '/home', replace: true });
	}
});
