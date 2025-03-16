import { useLocation } from '@solidjs/router';
import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { useApp } from '~/context/app';
import { syncToURLHash } from '~/utils/signals';
import { cn } from '~/utils/tailwind';

import { Button } from './ui/button';

export function TheFab() {
	const [appContext, _] = useApp();
	const location = useLocation();
	let ref!: HTMLButtonElement;
	const [open, setOpen] = syncToURLHash(createSignal<boolean>(false), 'fab');

	function toggle() {
		setOpen(!open());
	}

	createEffect(
		on(
			open,
			($open) => {
				if ($open) {
					window.location.hash = '#fab';
					ref.classList.remove('motion-rotate-in-45');
					ref.classList.add('motion-rotate-out-45');
				} else {
					ref.classList.remove('motion-rotate-out-45');
					ref.classList.add('motion-rotate-in-45');
				}
			},
			{ defer: true }
		)
	);

	return (
		<>
			<Show when={open()}>
				<button class="fixed inset-0 z-20 backdrop-blur md:hidden" onClick={() => setOpen(false)} />
			</Show>
			<div class="fixed bottom-4 right-4 z-30 flex flex-col gap-4 md:hidden">
				<Show when={open()}>
					<ul class="flex flex-col gap-4">
						<For each={appContext.actions}>
							{(action) => (
								<li class="contents">
									<Button
										class="motion-preset-pop flex items-center justify-end gap-2 self-end motion-duration-300"
										onClick={async () => {
											await action.handler();
											setOpen(false);
										}}
										variant={action.variant}
									>
										<span class="text-xs font-bold uppercase tracking-wide">{action.label}</span>
										<span class={cn(action.icon, 'text-lg')} />
									</Button>
								</li>
							)}
						</For>
					</ul>
				</Show>
				<Button
					class="size-12 self-end motion-duration-300 motion-ease-spring-bounciest/rotate"
					onClick={toggle}
					ref={ref}
					size="icon"
				>
					<span class="i-heroicons:plus text-2xl" />
				</Button>
			</div>
		</>
	);
}
