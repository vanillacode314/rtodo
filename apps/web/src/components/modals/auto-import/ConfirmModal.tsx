import { createSignal, Show } from 'solid-js';
import { createStore } from 'solid-js/store';

import CardModal from '~/components/modals/CardModal';
import { Button } from '~/components/ui/button';
import { createDebouncedMemo } from '~/utils/signals';

type TConfirmModalState = {
	message: string;
	onNo: () => void;
	onYes: () => Promise<unknown> | unknown;
	open: boolean;
	title: string;
};
const [confirmModalState, setConfirmModalState] = createStore<TConfirmModalState>({
	message: '',
	onNo: () => {},
	onYes: () => {},
	open: false,
	title: ''
});

export function ConfirmModal() {
	const confirmModal = useConfirmModal();
	const [loading, setLoading] = createSignal(false);

	const debouncedIsLoading = createDebouncedMemo(loading, loading(), { duration: 300 });

	return (
		<CardModal
			open={confirmModalState.open}
			setOpen={(value) => setConfirmModalState('open', value)}
			title={confirmModalState.title}
		>
			<form
				class="flex flex-col gap-4"
				onSubmit={(event) => {
					event.preventDefault();
					const process = confirmModalState.onYes();
					if (process instanceof Promise) {
						setLoading(true);
						process.finally(() => {
							setLoading(false);
							confirmModal.close();
						});
						return;
					}
				}}
			>
				<p>{confirmModalState.message}</p>
				<div class="flex justify-end gap-4">
					<Button
						onClick={() => {
							confirmModalState.onNo();
							confirmModal.close();
						}}
						variant="outline"
					>
						No
					</Button>
					<Button autofocus class="flex items-center gap-2 self-end" type="submit">
						<Show when={debouncedIsLoading()}>
							<span class="i-svg-spinners:180-ring-with-bg text-lg" />
						</Show>
						<span>Yes</span>
					</Button>
				</div>
			</form>
		</CardModal>
	);
}

export function useConfirmModal() {
	return {
		close: () =>
			setConfirmModalState(() => ({
				message: '',
				onNo: () => {},
				onYes: () => {},
				open: false,
				title: ''
			})),
		open: ({
			message,
			onNo = () => {},
			onYes = () => {},
			title
		}: Omit<TConfirmModalState, 'onNo' | 'onYes' | 'open'> &
			Partial<Pick<TConfirmModalState, 'onNo' | 'onYes'>>) =>
			setConfirmModalState(() => ({
				message,
				onNo,
				onYes,
				open: true,
				title
			}))
	};
}

export default ConfirmModal;
