import { A } from '@solidjs/router';
import { Show } from 'solid-js';

import { authClient, loggedIn, session } from '~/utils/auth-client';

import { Button } from './ui/button';

export function TheSidebar() {
	return (
		<div class="hidden flex-col bg-black/20 sm:flex">
			<div class="p-4 font-bold uppercase tracking-wide">RTodo</div>
			<Button as={A} href="/settings" variant="secondary">
				<span class="i-heroicons:cog text-lg" />
				<span>Settings</span>
			</Button>
			<span class="grow" />
			<Show
				fallback={
					<Button as={A} href="/auth/signin" variant="ghost">
						<span class="i-heroicons:arrow-left-on-rectangle text-lg" />
						<span>Sign In</span>
					</Button>
				}
				when={loggedIn()}
			>
				<div class="p-4">
					<div class="overflow-x-auto text-sm">{session().data!.user.email}</div>
				</div>
				<Button
					onClick={async () => {
						await authClient.signOut();
					}}
					variant="ghost"
				>
					<span class="i-heroicons:arrow-right-on-rectangle text-lg" />
					<span>Sign Out</span>
				</Button>
			</Show>
		</div>
	);
}

export default TheSidebar;
