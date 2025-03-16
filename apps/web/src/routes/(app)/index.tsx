import { createFileRoute, redirect } from '@tanstack/solid-router';

export const Route = createFileRoute('/(app)/')({
	loader: () => {
		throw redirect({ href: '/home', replace: true });
	}
});
