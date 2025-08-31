import { A, useLocation, useNavigate, useSearchParams } from '@solidjs/router';
import { type } from 'arktype';
import { create } from 'mutative';
import { createEffect, createSignal, Show } from 'solid-js';

import ValidationErrors from '~/components/form/ValidationErrors';
import { Button } from '~/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { Toggle } from '~/components/ui/toggle';
import { authClient, session } from '~/utils/auth-client';
import { createForm } from '~/utils/form';

const formSchema = type({
	email: 'string'
});
export default function SignInPage() {
	const [passwordVisible, setPasswordVisible] = createSignal<boolean>(false);

	const location = useLocation();
	const [searchParams, _] = useSearchParams();

	const navigate = useNavigate();
	const redirectTo = () =>
		location.search ? (new URLSearchParams(location.search).get('redirect') ?? '/') : '/';

	const [{ form, formErrors }, { resetForm, setForm, setFormErrors }] = createForm(
		formSchema,
		() => ({
			email: ''
		})
	);

	createEffect(() => {
		if (session().data?.user.id) {
			navigate(redirectTo());
		}
	});

	return (
		<form class="grid h-full place-items-center p-5 sm:p-10" method="post">
			<Show when={searchParams.redirect}>
				<input name="redirectPath" type="hidden" value={searchParams.redirect} />
			</Show>
			<div>
				<CardHeader>
					<CardTitle class="text-2xl">Sign In</CardTitle>
				</CardHeader>
				<CardContent class="grid gap-4">
					<ValidationErrors errors={formErrors.form} />
					<Button
						as={A}
						class="flex items-center gap-2"
						href="/auth/signin/magic-link"
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
