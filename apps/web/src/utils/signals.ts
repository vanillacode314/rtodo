import { createConnectivitySignal } from '@solid-primitives/connectivity';
import { createPageVisibility } from '@solid-primitives/page-visibility';
import { createScheduled, debounce } from '@solid-primitives/scheduled';
import { createMemo } from 'solid-js';

const isOnline = createConnectivitySignal();
const pageVisible = createPageVisibility();

function createDebouncedMemo<T>(
	fn: (p: T | undefined) => T,
	value: NoInfer<T>,
	options?: NoInfer<{
		duration?: number;
		equals?: ((prev: T, next: T) => boolean) | false;
		name?: string;
	}>
) {
	const scheduled = createScheduled((fn) => debounce(fn, options?.duration ?? 1000));
	return createMemo((value) => (scheduled() ? fn(value) : value), value, options);
}

export { createDebouncedMemo, isOnline, pageVisible };
