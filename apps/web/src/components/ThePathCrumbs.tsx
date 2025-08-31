import { Link } from '@tanstack/solid-router';
import { index } from 'drizzle-orm/gel-core';
import { createEffect, createMemo, For, Show } from 'solid-js';

import * as path from '~/utils/path';

export function ThePathCrumbs(props: { path: string }) {
	let el!: HTMLDivElement;
	const parts = createMemo(() => {
		return path.splitIntoParts(props.path);
		// const compressedParts = path.splitIntoParts(
		//   path.compressPath(appContext.path),
		// )
		// return path.splitIntoParts(appContext.path).map((part, index) => ({
		//   name: compressedParts[index].name,
		//   path: part.path,
		// }))
	});

	createEffect(() => {
		parts();
		el.scrollBy({ left: el.scrollWidth, behavior: 'smooth' });
	});

	return (
		<div class="bg-primary/5 flex h-14 items-center gap-1 px-4" ref={el}>
			<ul class="text-muted-foreground flex items-end gap-1">
				<li class="contents">
					<Link class="grid size-5 place-items-center" to="/home">
						<span class="i-heroicons:home" />
						<span class="sr-only">Home</span>
					</Link>
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
								<Link
									class="grid place-items-center text-sm"
									params={{ _splat: path }}
									to="/home/$"
								>
									{name}
								</Link>
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
