import { createSignal, For, onMount } from 'solid-js';

import BaseModal from './modals/BaseModal';
import { Button } from './ui/button';

type SelectProps = {
	id?: string;
	name: string;
	options: Array<{ label: string; value: string }>;
	setValue: (option: { label: string; value: string }) => void;
	value: { label: string; value: string };
};
function Select(props: SelectProps) {
	const [open, setOpen] = createSignal(false);

	return (
		<>
			<input id={props.id} name={props.name} type="hidden" value={props.value.value} />
			<Button onClick={() => setOpen(true)} variant="outline">
				<span>{props.value.label}</span>
				<span class="i-heroicons:chevron-up-down" />
			</Button>
			<BaseModal open={open()} setOpen={setOpen}>
				<ul class="bg-secondary flex max-h-[80vh] min-w-sm flex-col gap-px overflow-y-auto border">
					<For each={props.options}>
						{(option) => (
							<li class="contents">
								<Button
									class="bg-background"
									onClick={() => {
										props.setValue(option);
										setOpen(false);
									}}
									variant="ghost"
								>
									{option.label}
								</Button>
							</li>
						)}
					</For>
				</ul>
			</BaseModal>
		</>
	);
}

export { Select };
export type { SelectProps };
