import { createSignal, createUniqueId, type JSXElement, mergeProps, type Setter } from 'solid-js';

import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import Untrack from '~/components/Untrack';
import { cn } from '~/utils/tailwind';

import BaseModal from './BaseModal';

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
	fluid?: boolean;
	id?: string;
	onOpenChange?: (value: boolean) => void;
	open: boolean;
	ref?: ((el: HTMLDialogElement) => void) | HTMLDialogElement;
	setOpen: Setter<boolean>;
	source?: TModalSource;
	title: string;
};

export function CardModal(props: Props) {
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

	return (
		<BaseModal
			closeOnOutsideClick={mergedProps.closeOnOutsideClick}
			id={mergedProps.id}
			onOpenChange={mergedProps.onOpenChange}
			open={mergedProps.open}
			ref={mergedProps.ref}
			setOpen={mergedProps.setOpen}
			source={mergedProps.source}
		>
			<Card
				class={cn(
					'flex max-h-[90%] w-full flex-col overflow-hidden border-0 border-t sm:border',
					mergedProps.fluid ? 'h-full' : 'sm:max-w-96'
				)}
				data-dialog-content
			>
				<CardHeader>
					<CardTitle>{props.title}</CardTitle>
				</CardHeader>
				<CardContent class="grow">
					<Untrack>
						{typeof props.children === 'function' ?
							props.children(() => mergedProps.setOpen(false))
						:	props.children}
					</Untrack>
				</CardContent>
			</Card>
		</BaseModal>
	);
}

export default CardModal;
