import { createFileRoute, Outlet } from '@tanstack/solid-router';
import { type } from 'arktype';
import { createRenderEffect } from 'solid-js';

import { session } from '~/utils/auth-client';

export const Route = createFileRoute('/(auth)/auth')({
	component: () => {
		const searchParams = Route.useSearch();
		const navigate = Route.useNavigate();
		createRenderEffect(() => {
			if (session().data?.user.id) {
				return navigate({ to: searchParams().redirect || '/' });
			}
		});
		return <Outlet />;
	},
	validateSearch: type({
		'redirect?': 'string'
	}),
	beforeLoad: ({ search }) => {
		if (session().data?.user.id) {
			return search.redirect || '/';
		}
	}
});
