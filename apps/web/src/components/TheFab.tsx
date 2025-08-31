import { createEffect, createSignal, For, on, Show } from 'solid-js';

import { useApp } from '~/context/app';
import { syncToURLHash } from '~/utils/signals';
import { cn } from '~/utils/tailwind';

import { Button } from './ui/button';

export function TheFab() {
	const [appContext, _] = useApp();
	let ref!: HTMLButtonElement;
	const [open, setOpen] = syncToURLHash(createSignal<boolean>(false), 'fab');

	function toggle() {
		setOpen(!open());
	}

	createEffect(
		on(
			open,
			($open) => {
				const el = ref.querySelector('span')!;
				if ($open) {
					ref.classList.add('!bg-destructive', '!text-primary');
					el.classList.remove('motion-rotate-in-45');
					el.classList.add('motion-rotate-out-45');
				} else {
					ref.classList.remove('!bg-destructive', '!text-primary');
					el.classList.remove('motion-rotate-out-45');
					el.classList.add('motion-rotate-in-45');
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
			<div class="fixed right-4 bottom-4 z-30 flex flex-col gap-4 md:hidden">
				<Show when={open()}>
					<ul class="flex flex-col gap-4">
						<For each={appContext.actions}>
							{(action) => (
								<li class="contents">
									<Button
										class="motion-preset-pop motion-duration-300 flex items-center justify-end gap-2 self-end"
										onClick={async (event) => {
											await action.handler(event);
											setOpen(false);
										}}
										variant={action.variant}
									>
										<span class="text-xs font-bold tracking-wide uppercase">{action.label}</span>
										<span class={cn(action.icon, 'text-lg')} />
									</Button>
								</li>
							)}
						</For>
					</ul>
				</Show>
				<Button class="transition-color size-12 self-end" onClick={toggle} ref={ref} size="icon">
					<span class="i-heroicons:plus motion-ease-spring-bounciest/rotate motion-duration-300 text-2xl" />
				</Button>
			</div>
		</>
	);
}
