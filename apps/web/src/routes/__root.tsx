import { ColorModeProvider, cookieStorageManager } from '@kobalte/core';
import { QueryClientProvider } from '@tanstack/solid-query';
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools';
import { createRootRouteWithContext, Outlet, useLocation } from '@tanstack/solid-router';
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools';
import 'virtual:uno.css';
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification';
import { createSignal, For, type JSXElement, onMount, Show, createEffect } from 'solid-js';

import { TheFab } from '~/components/TheFab';
import TheSidebar from '~/components/TheSidebar';
import { Button } from '~/components/ui/button';
import { Toaster } from '~/components/ui/sonner';
import { AppProvider } from '~/context/app';
import { deleteDatabaseFile, setupDb } from '~/db/client';
import { initSocket } from '~/sockets/messages';
import { once } from '~/utils/functions';
import { queryClient } from '~/utils/query-client';
import { listenForWaitingServiceWorker } from '~/utils/service-worker';
import { cn } from '~/utils/tailwind';
import { isTauri } from '~/utils/tauri';
import { loggedIn, session } from '~/utils/auth-client';
import { setMetadata } from '~/utils/db';

export const Route = createRootRouteWithContext()({
	component: RootComponent,
	errorComponent: ErrorComponent,
	beforeLoad: once(async (): Promise<void> => {
		await navigator.storage.persist();
		try {
			await setupDb();
		} catch (error) {
			console.error('[Failed DB Setup]', error);
			throw error;
		}
		console.log('[Finished DB Setup]');
		await initSocket();
	})
});

function AutoImportModals() {
	const modals = import.meta.glob('~/components/modals/auto-import/*.tsx', {
		eager: true,
		import: 'default'
	}) as Record<string, () => JSXElement>;

	return <For each={Object.values(modals)}>{(Modal) => <Modal />}</For>;
}

function ErrorComponent(props: { error: unknown }) {
	const [updateAvailable, setUpdateAvailable] = createSignal<boolean>(false);

	onMount(async () => {
		console.error(props.error);
		if ('serviceWorker' in navigator) {
			const registration = await navigator.serviceWorker.getRegistration();
			if (!registration) return;
			await listenForWaitingServiceWorker(registration).catch(() =>
				console.log('Service Worker first install')
			);
			setUpdateAvailable(true);
		}
	});

	async function doUpdate() {
		const registration = await navigator.serviceWorker.getRegistration();
		if (!registration) return;
		registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
	}

	return (
		<>
			<nav
				class={cn('border-offset-background full-width content-grid bg-background border-b py-4')}
			>
				<div class="flex items-center gap-4">
					<p class="font-bold tracking-wide uppercase">RTodo</p>
					<span class="grow" />
				</div>
			</nav>
			<div class="grid h-full place-content-center place-items-center gap-4">
				<span class="i-heroicons:exclamation-circle text-8xl" />
				<p>An Error Occurred</p>
				<Show
					fallback={
						<Button
							onClick={async () => {
								// TODO: Do backup before deleting database file
								await deleteDatabaseFile();
								window.location.reload();
							}}
							size="lg"
						>
							Refresh
						</Button>
					}
					when={updateAvailable()}
				>
					<Button onClick={doUpdate} size="lg">
						Update App
					</Button>
				</Show>
			</div>
		</>
	);
}

function RootComponent() {
	onMount(async () => {
		if (!isTauri()) return;
		let permissionGranted = await isPermissionGranted();

		if (!permissionGranted) {
			const permission = await requestPermission();
			permissionGranted = permission === 'granted';
		}
	});

	createEffect(async () => {
		if (!loggedIn()) return;
		await setMetadata('lastKnownUser', JSON.stringify(session().data?.user));
	});

	const location = useLocation();

	return (
		<>
			<ColorModeProvider storageManager={cookieStorageManager}>
				<QueryClientProvider client={queryClient}>
					<SolidQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
					<AppProvider path={location().pathname}>
						<Toaster duration={3000} position="bottom-center" />
						<AutoImportModals />
						<div class="grid h-full grid-rows-1 overflow-hidden sm:grid-cols-[theme(spacing.72)_1fr]">
							{/*<Nav class="full-width content-grid" />*/}
							<TheFab />
							<TheSidebar />
							<div class="overflow-hidden">
								<Outlet />
							</div>
						</div>
					</AppProvider>
				</QueryClientProvider>
			</ColorModeProvider>
			<TanStackRouterDevtools />
		</>
	);
}
