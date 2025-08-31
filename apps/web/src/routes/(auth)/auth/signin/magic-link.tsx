import { createFileRoute } from '@tanstack/solid-router';
import { type } from 'arktype';
import { create } from 'mutative';
import { createSignal, Show } from 'solid-js';
import { toast } from 'solid-sonner';

import ValidationErrors from '~/components/form/ValidationErrors';
import { Button } from '~/components/ui/button';
import {
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '~/components/ui/card';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { authClient } from '~/utils/auth-client';
import { createForm } from '~/utils/form';

export const Route = createFileRoute('/(auth)/auth/signin/magic-link')({
	component: MagicLinkPage
});

const formSchema = type({
	email: 'string'
});
function MagicLinkPage() {
	const [passwordVisible, setPasswordVisible] = createSignal<boolean>(false);

	const searchParams = Route.useSearch();
	const [{ form, formErrors }, { resetForm, setForm, setFormErrors }] = createForm(
		formSchema,
		() => ({
			email: ''
		})
	);

	const [loading, setLoading] = createSignal<boolean>(false);
	const [success, setSuccess] = createSignal<boolean>(false);

	async function onSubmit(event: SubmitEvent) {
		event.preventDefault();
		const { data, error } = await authClient.signIn.magicLink({
			email: form.email,
			callbackURL: window.location.origin + '/'
		});
		if (error) {
			toast.error('An Error Occurred. Please Try Again If The Issue Persists');
			return;
		}
		setSuccess(true);
		toast.success('Please check your email to login');
		setFormErrors({ form: ['Please check your email to login'] });
	}

	return (
		<form
			class="grid h-full content-center sm:p-10"
			method="post"
			onSubmit={async (e) => {
				setLoading(true);
				onSubmit(e).finally(() => setLoading(false));
			}}
		>
			<Show when={searchParams().redirect}>
				<input name="redirectPath" type="hidden" value={searchParams().redirect} />
			</Show>
			<div>
				<CardHeader>
					<CardTitle class="text-2xl">Sign In</CardTitle>
					<CardDescription>Enter your email to login</CardDescription>
				</CardHeader>
				<CardContent class="grid gap-4">
					<ValidationErrors errors={formErrors.form} />
					<TextField>
						<TextFieldLabel for="email">Email</TextFieldLabel>
						<TextFieldInput
							autocomplete="username"
							autofocus
							id="email"
							name="email"
							onInput={(event) => {
								setForm(
									create((draft) => {
										draft.email = event.currentTarget.value;
									})
								);
							}}
							placeholder="m@example.com"
							required
							type="email"
							value={form.email}
						/>
					</TextField>
					<ValidationErrors errors={formErrors.email} />
				</CardContent>
				<CardFooter>
					<Button class="flex items-center gap-2" disabled={loading() || success()} type="submit">
						<Show when={loading()}>
							<span class="i-svg-spinners:180-ring-with-bg text-lg" />
						</Show>
						<span>Sign In</span>
					</Button>
				</CardFooter>
			</div>
		</form>
	);
}
