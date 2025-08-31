import { useColorMode } from '@kobalte/core';
import { useMutation } from '@tanstack/solid-query';
import { createFileRoute, Link } from '@tanstack/solid-router';
import { sql } from 'drizzle-orm';
import { createSignal, onMount, Show } from 'solid-js';
import { toast } from 'solid-sonner';

import { Button } from '~/components/ui/button';
import { db, deleteDatabaseFile, getDatabaseInfo } from '~/db/client';
import { round } from '~/utils/math';
import { createDebouncedMemo } from '~/utils/signals';

export const Route = createFileRoute('/(app)/settings')({
	component: SettingsPage
});

function formatBytes(value: number): string {
	if (value === 0) {
		return '0 B';
	}

	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let i = 0;

	while (value >= 1024 && i < units.length - 1) {
		value /= 1024;
		i++;
	}

	value = round(value, 2);
	return `${value} ${units[i]}`;
}

function SettingsPage() {
	const { colorMode, setColorMode } = useColorMode();

	const [size, setSize] = createSignal<null | number>(null);

	onMount(updateSize);

	async function updateSize() {
		const info = await getDatabaseInfo();
		setSize(info.databaseSizeBytes ?? null);
	}

	const optimizeStorage = useMutation(() => ({
		mutationFn: async () => {
			await db.run(sql`VACUUM;`);
		},
		onSuccess: () => updateSize()
	}));

	const optimizeStorageIsPending = createDebouncedMemo(() => optimizeStorage.isPending, false, {
		duration: 300
	});

	async function onBackup() {}
	async function onRestore() {}

	return (
		<>
			<header class="flex w-full flex-col gap-1 border-b p-4">
				<div class="flex items-center gap-4">
					<Link class="i-heroicons:arrow-left text-xl" to="/home" />
					<h3 class="text-2xl font-bold">Settings</h3>
				</div>
				<p class="text-muted-foreground">Manage your settings</p>
			</header>
			<div class="flex flex-col items-start gap-4 p-4">
				<h3 class="text-lg font-medium">Storage</h3>
				<Button
					onClick={() =>
						optimizeStorage.mutate(undefined, {
							onSuccess: () => toast.success('Done'),
							onError: () => toast.error('An Error Occured')
						})
					}
					variant="outline"
				>
					<Show when={optimizeStorageIsPending()}>
						<span class="i-svg-spinners:180-ring-with-bg text-lg" />
					</Show>
					<Show fallback={<p>Unknown</p>} when={size !== null}>
						<span>{formatBytes(size()!)}</span>
					</Show>
					| <span>Optimize</span>
				</Button>
				{/* <h3 class="text-lg font-medium">Data</h3> */}
				{/* <div class="flex gap-4"> */}
				{/* 	<Button onClick={() => onBackup()} variant="secondary"> */}
				{/* 		Download Backup */}
				{/* 	</Button> */}
				{/* 	<Button */}
				{/* 		onClick={() => */}
				{/* 			onRestore().catch((error) => { */}
				{/* 				console.error(error); */}
				{/* 				toast.error('Restore failed'); */}
				{/* 			}) */}
				{/* 		} */}
				{/* 		variant="secondary" */}
				{/* 	> */}
				{/* 		Restore Backup */}
				{/* 	</Button> */}
				{/* </div> */}
				<h3 class="text-lg font-medium">Theme</h3>
				<div class="flex gap-px">
					<Button
						class="flex items-center gap-2"
						onClick={() => setColorMode('dark')}
						variant={colorMode() === 'dark' ? 'default' : 'secondary'}
					>
						<div class="i-heroicons:moon text-lg" />
						<span>Dark</span>
					</Button>
					<Button
						class="flex items-center gap-2"
						onClick={() => setColorMode('light')}
						variant={colorMode() === 'light' ? 'default' : 'secondary'}
					>
						<div class="i-heroicons:sun text-lg" />
						<span>Light</span>
					</Button>
					<Button
						class="flex items-center gap-2"
						onClick={() => setColorMode('system')}
						variant="outline"
					>
						<div class="i-heroicons:computer-desktop text-lg" />
						<span>Auto</span>
					</Button>
				</div>
				<h3 class="text-lg font-medium">Danger Zone</h3>
				<Button
					onClick={async () => {
						await deleteDatabaseFile();
						window.location.href = '/';
					}}
					variant="outline"
				>
					Delete Local Database
				</Button>
			</div>
		</>
	);
}
