// @refresh reload
import { mount, StartClient } from '@solidjs/start/client';
import { toast } from 'solid-sonner';

import { listenForWaitingServiceWorker } from './utils/service-worker';

mount(() => <StartClient />, document.getElementById('app')!);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
	try {
		const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
		console.log('SW registered: ', registration);
		await listenForWaitingServiceWorker(registration).then(
			() => {
				promptUserToRefresh(registration);

				let refreshing: boolean;
				navigator.serviceWorker.addEventListener('controllerchange', function () {
					if (refreshing) return;
					refreshing = true;
					window.location.reload();
				});
			},
			() => console.log('Service Worker first install')
		);
	} catch (error) {
		console.log('SW registration failed: ', error);
	}
}

function promptUserToRefresh(registration: ServiceWorkerRegistration) {
	toast.info('New version available!', {
		action: {
			label: 'Update',
			onClick: () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' })
		},
		duration: Number.POSITIVE_INFINITY
	});
}
