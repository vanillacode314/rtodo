import { createFileRoute, Link } from '@tanstack/solid-router';
import { type } from 'arktype';
import { createEffect, createSignal, Show, untrack } from 'solid-js';

import ValidationErrors from '~/components/form/ValidationErrors';
import { Button } from '~/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { session } from '~/utils/auth-client';
import { createForm } from '~/utils/form';

export const Route = createFileRoute('/(auth)/auth/signin/')({
	component: SignInPage
});

const formSchema = type({
	email: 'string'
});
function SignInPage() {
	const [passwordVisible, setPasswordVisible] = createSignal<boolean>(false);

	const searchParams = Route.useSearch();

	const [{ form, formErrors }, { resetForm, setForm, setFormErrors }] = createForm(
		formSchema,
		() => ({
			email: ''
		})
	);

	return (
		<form class="grid h-full place-items-center p-5 sm:p-10" method="post">
			<Show when={searchParams().redirect}>
				<input name="redirectPath" type="hidden" value={searchParams().redirect} />
			</Show>
			<div>
				<CardHeader>
					<CardTitle class="text-2xl">Sign In</CardTitle>
				</CardHeader>
				<CardContent class="grid gap-4">
					<ValidationErrors errors={formErrors.form} />
					<Button
						as={Link}
						class="flex items-center gap-2"
						to="/auth/signin/magic-link"
						type="button"
					>
						<span class="i-heroicons:envelope text-lg" />
						<span>Sign In With Email</span>
					</Button>
				</CardContent>
			</div>
		</form>
	);
}
