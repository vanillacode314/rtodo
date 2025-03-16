import {
	createEffect,
	createSignal,
	createUniqueId,
	type JSXElement,
	mergeProps,
	onCleanup,
	type Setter,
	untrack
} from 'solid-js';
import { Portal } from 'solid-js/web';

import { syncToURLHash } from '~/utils/signals';
import { cn } from '~/utils/tailwind';

export type TModalSource =
	| HTMLElement
	| null
	| {
			height: number;
			left: number;
			top: number;
			width: number;
	  };

type Props = {
	children: ((close: () => void) => JSXElement) | JSXElement;
	closeOnOutsideClick?: boolean;
	id?: string;
	onOpenChange?: (value: boolean) => void;
	open: boolean;
	ref?: ((el: HTMLDialogElement) => void) | HTMLDialogElement;
	setOpen: Setter<boolean>;
	source?: TModalSource;
};

export function Modal(props: Props) {
	const internalId = createUniqueId();
	const [internalOpen, setInternalOpen] = createSignal<boolean>(false);
	const mergedProps = mergeProps(
		{
			closeOnOutsideClick: true,
			id: internalId,
			onOpenChange: () => {},
			get open() {
				return internalOpen();
			},
			setOpen: setInternalOpen,
			source: null
		},
		props
	);
	void syncToURLHash([() => mergedProps.open, mergedProps.setOpen], `modal-${internalId}`);
	const [el, setEl] = createSignal<HTMLDialogElement>();
	// const animation: AnimationPlaybackControls | null = null;

	createEffect(() => {
		const { open, source, onOpenChange } = mergedProps;
		const $el = el();
		untrack(() => {
			onOpenChange(open);
			if (!$el) return;
			// const modalContentEl = $el.querySelector('[data-dialog-content]')! as HTMLElement;
			if (open) {
				$el.showModal();
				// if (isMobile()) return;
				//
				// if (source instanceof HTMLElement) {
				// 	const sourceRect = source.getBoundingClientRect();
				// 	const destinationRect = modalContentEl.getBoundingClientRect();
				// 	Object.assign(modalContentEl.style, {
				// 		position: 'absolute',
				// 		minWidth: '0px',
				// 		minHeight: '0px'
				// 	});
				// 	animation = animate(
				// 		modalContentEl,
				// 		{
				// 			top: [sourceRect.top, destinationRect.top],
				// 			left: [sourceRect.left, destinationRect.left],
				// 			width: [sourceRect.width, destinationRect.width],
				// 			height: [sourceRect.height, destinationRect.height]
				// 		},
				// 		{ type: spring, mass: 0.5 }
				// 	);
				// 	animation.then(() => {
				// 		Object.assign(modalContentEl.style, {
				// 			position: '',
				// 			minWidth: '',
				// 			minHeight: '',
				// 			top: '',
				// 			left: '',
				// 			width: '',
				// 			height: ''
				// 		});
				// 		animation = null;
				// 	});
				// }
			} else {
				// animation?.complete();
				$el.close();
			}
		});
	});

	onCleanup(() => {
		mergedProps.setOpen(false);
	});

	return (
		<Portal>
			<dialog
				class="relative isolate m-0 h-full max-h-full w-full max-w-full bg-transparent"
				id={mergedProps.id}
				onClose={() => mergedProps.setOpen(false)}
				ref={(el) => {
					setEl(el);
					typeof props.ref === 'function' ? props.ref(el) : (props.ref = el);
				}}
			>
				<div
					class={cn(
						'sm:content-grid grid h-full w-full items-end sm:items-center sm:justify-items-center'
					)}
					onClick={(event) => {
						if (mergedProps.closeOnOutsideClick && event.target === event.currentTarget) {
							mergedProps.setOpen(false);
						}
					}}
				>
					{typeof props.children === 'function' ?
						props.children(() => mergedProps.setOpen(false))
					:	props.children}
				</div>
			</dialog>
		</Portal>
	);
}

export default Modal;
