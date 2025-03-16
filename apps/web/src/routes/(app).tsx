import { ParentProps, Suspense } from 'solid-js';

import '~/sockets/messages';
import { TheFab } from '~/components/TheFab';
import TheSidebar from '~/components/TheSidebar';

import 'virtual:uno.css';

export default function App(props: ParentProps) {
	return (
		<div class="grid h-full grid-rows-1 overflow-hidden sm:grid-cols-[theme(spacing.72)_1fr]">
			{/*<Nav class="full-width content-grid" />*/}
			<TheFab />
			<TheSidebar />
			<Suspense>
				<div class="overflow-hidden">{props.children}</div>
			</Suspense>
		</div>
	);
}
