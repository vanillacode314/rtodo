import { Link } from '@tanstack/solid-router';
import { For, Show } from 'solid-js';

import { useApp } from '~/context/app';
import { authClient, loggedIn, session } from '~/utils/auth-client';
import { cn } from '~/utils/tailwind';

import { Button } from './ui/button';
export function TheSidebar() {
	const [appContext, _] = useApp();

	return (
		<div class="hidden flex-col bg-black/20 sm:flex">
			<Link to="/">
				<div class="p-4 font-bold tracking-wide uppercase">RTodo</div>
			</Link>

			<ul class="contents">
				<For each={appContext.actions}>
					{(action) => (
						<li>
							<Button
								class="flex w-full items-center justify-start gap-2"
								onClick={async () => {
									await action.handler();
								}}
								variant="secondary"
							>
								<span class={cn(action.icon, 'text-lg')} />
								<span>{action.label}</span>
							</Button>
						</li>
					)}
				</For>
			</ul>

			<span class="grow" />
			<Button as={Link} to="/settings" variant="ghost">
				<span class="i-heroicons:cog text-lg" />
				<span>Settings</span>
			</Button>

			<Show
				fallback={
					<Button as={Link} href="/auth/signin" variant="ghost">
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
