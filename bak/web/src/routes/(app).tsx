import '~/sockets/messages';

import {
	isPermissionGranted,
	requestPermission,
	Schedule,
	sendNotification
} from '@tauri-apps/plugin-notification';
import { getOwner, onMount, ParentProps, runWithOwner, Suspense } from 'solid-js';
import 'virtual:uno.css';

import { TheFab } from '~/components/TheFab';
import TheSidebar from '~/components/TheSidebar';
import { setupDb } from '~/db/client';
import { isTauri } from '~/utils/tauri';

export default function App(props: ParentProps) {
	const owner = getOwner();
	setupDb().then(
		() => console.log('[Finished DB Setup]'),
		(error) => {
			console.error('[Failed DB Setup]', error);
			runWithOwner(owner, () => {
				throw error;
			});
		}
	);

	onMount(async () => {
		if (!isTauri()) return;
		let permissionGranted = await isPermissionGranted();

		if (!permissionGranted) {
			const permission = await requestPermission();
			permissionGranted = permission === 'granted';
		}
	});

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
