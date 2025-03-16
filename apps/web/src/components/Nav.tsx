import { A } from '@solidjs/router';

import { cn } from '~/utils/tailwind';

export default function Nav(props: { class?: string }) {
	return (
		<nav class={cn('border-offset-background border-b bg-background py-4', props.class)}>
			<div class="flex items-center gap-4">
				<A href="/">
					<p class="font-bold uppercase tracking-wide">RTodo</p>
				</A>
			</div>
		</nav>
	);
}
