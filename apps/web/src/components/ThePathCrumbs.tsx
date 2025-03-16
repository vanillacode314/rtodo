import { createEffect, createMemo, For, Show } from 'solid-js';

import { useApp } from '~/context/app';
import * as path from '~/utils/path';

export function ThePathCrumbs() {
	let el!: HTMLDivElement;
	const [appContext, _] = useApp();
	const parts = createMemo(() => {
		return path.splitIntoParts(appContext.path);
		const compressedParts = path.splitIntoParts(path.compressPath(appContext.path));
		return path
			.splitIntoParts(appContext.path)
			.map((part, index) => ({ name: compressedParts[index].name, path: part.path }));
	});

	createEffect(() => {
		parts();
		el.scrollBy({ left: el.scrollWidth, behavior: 'smooth' });
	});

	return (
		<div class="flex gap-1 overflow-x-auto border-zinc-600 bg-secondary p-4" ref={el}>
			<ul class="flex items-end gap-1 text-muted-foreground">
				<li class="contents">
					<a class="grid h-5 place-items-center text-sm" href="/">
						<span class="i-heroicons:home" />
						<span class="sr-only">Home</span>
					</a>
				</li>
				<Show when={parts().length > 0}>
					<span class="flex h-5 items-center">
						<span class="i-heroicons:chevron-right-20-solid" />
					</span>
				</Show>
				<For each={parts()}>
					{({ name, path }, index) => (
						<>
							<li class="contents">
								<a class="grid place-items-center text-sm" href={path}>
									{name}
								</a>
							</li>
							<Show when={index() < parts().length - 1}>
								<span class="flex h-5 items-center">
									<span class="i-heroicons:chevron-right-20-solid" />
								</span>
							</Show>
						</>
					)}
				</For>
			</ul>
		</div>
	);
}

export default ThePathCrumbs;
