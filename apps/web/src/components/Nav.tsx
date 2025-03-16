import { Link } from '@tanstack/solid-router';

import { cn } from '~/utils/tailwind';

export default function Nav(props: { class?: string }) {
	return (
		<nav class={cn('border-offset-background bg-background border-b py-4', props.class)}>
			<div class="flex items-center gap-4">
				<Link to="/">
					<p class="font-bold tracking-wide uppercase">RTodo</p>
				</Link>
			</div>
		</nav>
	);
}
