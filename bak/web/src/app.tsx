import { ColorModeProvider, cookieStorageManagerSSR } from '@kobalte/core/color-mode';
import { Router } from '@solidjs/router';
import { FileRoutes } from '@solidjs/start/router';
import { isServer, QueryClientProvider } from '@tanstack/solid-query';
import { SolidQueryDevtools } from '@tanstack/solid-query-devtools';
import {
	Component,
	createSignal,
	ErrorBoundary,
	For,
	JSXElement,
	onMount,
	Show,
	Suspense
} from 'solid-js';
import { getCookie } from 'vinxi/http';

import './sockets/messages';
import './app.css';
import { Button } from './components/ui/button';

import 'virtual:uno.css';

import { Toaster } from './components/ui/sonner';
import { AppProvider } from './context/app';
import { deleteDatabaseFile } from './db/client';
import { queryClient } from './utils/query-client';
import { listenForWaitingServiceWorker } from './utils/service-worker';
import { cn } from './utils/tailwind';

function getServerCookies() {
	'use server';
	const colorMode = getCookie('kb-color-mode');
	return colorMode ? `kb-color-mode=${colorMode}` : '';
}

const ErrorPage: Component<{ err: unknown; reset: () => void }> = (props) => {
	const [updateAvailable, setUpdateAvailable] = createSignal<boolean>(false);

	onMount(async () => {
		console.error(props.err);
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
				class={cn('border-offset-background full-width content-grid border-b bg-background py-4')}
			>
				<div class="flex items-center gap-4">
					<p class="font-bold uppercase tracking-wide">RTodo</p>
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
};

export default function App() {
	const storageManager = cookieStorageManagerSSR(isServer ? getServerCookies() : document.cookie);

	onMount(async () => {
		await navigator.storage.persist();
	});

	return (
		<Router
			root={(props) => (
				<>
					<ErrorBoundary fallback={(err, reset) => <ErrorPage err={err} reset={reset} />}>
						<Suspense>
							<ColorModeProvider storageManager={storageManager}>
								<QueryClientProvider client={queryClient}>
									<SolidQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
									<AppProvider path={props.location.pathname}>
										<Toaster duration={3000} position="bottom-center" />
										<AutoImportModals />
										{props.children}
									</AppProvider>
								</QueryClientProvider>
							</ColorModeProvider>
						</Suspense>
					</ErrorBoundary>
				</>
			)}
		>
			<FileRoutes />
		</Router>
	);
}

function AutoImportModals() {
	const modals = import.meta.glob('~/components/modals/auto-import/*.tsx', {
		eager: true,
		import: 'default'
	}) as Record<string, () => JSXElement>;

	return <For each={Object.values(modals)}>{(Modal) => <Modal />}</For>;
}
