import { Link } from '@tanstack/solid-router';
import { For, Show } from 'solid-js';

import { useApp } from '~/context/app';
import { authClient, loggedIn, session } from '~/utils/auth-client';
import { cn } from '~/utils/tailwind';

import { Button } from './ui/button';
export function TheSidebar() {
	const [appContext, _] = useApp();

	return (
		<div class="bg-primary/5 hidden flex-col sm:flex">
			<Link to="/home">
				<div class="flex h-14 items-center px-4 font-bold tracking-wide uppercase">RTodo</div>
			</Link>

			<ul class="flex flex-col gap-px">
				<For each={appContext.actions}>
					{(action) => (
						<li>
							<Button
								class="bg-primary/5 hover:bg-primary/10 flex h-14 w-full items-center justify-start gap-2"
								onClick={async (event) => {
									await action.handler(event);
								}}
								variant="ghost"
							>
								<span class={cn(action.icon, 'text-lg')} />
								<span>{action.label}</span>
							</Button>
						</li>
					)}
				</For>
			</ul>

			<span class="grow" />
			<Button as={Link} to="/settings" variant="ghost" class="h-14">
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
				<div class="flex h-14 items-center gap-2">
					<div title={session().data!.user.email} class="grow truncate px-4 text-sm">
						{session().data!.user.email}
					</div>
					<Button
						title="Sign Out"
						class="h-full"
						onClick={async () => {
							await authClient.signOut();
						}}
						variant="ghost"
					>
						<span class="i-heroicons:arrow-right-on-rectangle text-lg" />
						<span class="sr-only">Sign Out</span>
					</Button>
				</div>
			</Show>
		</div>
	);
}

export default TheSidebar;
