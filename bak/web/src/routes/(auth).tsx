import { A } from '@solidjs/router';
import { ParentProps } from 'solid-js';

export default function (props: ParentProps) {
	return (
		<div class="grid h-full lg:grid-cols-2">
			<div class="grid place-content-center border-r p-5 max-lg:hidden">
				<A class="cursor-pointer" href="/">
					<h1 class="text-6xl font-bold uppercase tracking-wide">RTodo</h1>
					<p class="text-zinc-400">Your todo app</p>
				</A>
			</div>
			{props.children}
		</div>
	);
}
