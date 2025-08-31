import { useQueryClient } from '@tanstack/solid-query';
import { type } from 'arktype';
import { create } from 'mutative';
import { createStore } from 'solid-js/store';

import ValidationErrors from '~/components/form/ValidationErrors';
import CardModal, { type TModalSource } from '~/components/modals/CardModal';
import { Button } from '~/components/ui/button';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { useApp } from '~/context/app';
import { getPathByNodeId } from '~/db/queries/nodes';
import { queries } from '~/queries';
import { parseFormErrors } from '~/utils/arktype';
import { createForm } from '~/utils/form';
import { createMessages } from '~/utils/messages';

const [modalData, setModalData] = createStore<{
	open: boolean;
	source: TModalSource;
}>({
	open: false,
	source: null
});

export const setRenameFileModalOpen = (open: boolean, source: TModalSource = null) => {
	setModalData({ open, source });
};

const formSchema = type({
	name: type('string.trim')
		.narrow((name, ctx) => {
			if (!name.includes('/')) return true;
			return ctx.reject({
				problem: `cannot contain / (was "${name}")`
			});
		})
		.pipe((name) => (name.endsWith('.list') ? name : name + '.list')),
	id: 'string'
});
export default function RenameFileModal() {
	let el!: HTMLDialogElement;

	const queryClient = useQueryClient();
	const [appContext, _] = useApp();

	const [{ form, formErrors }, { resetForm, setForm, setFormErrors }] = createForm(
		formSchema,
		() => ({
			name: appContext.currentNode?.name.slice(0, '.list'.length * -1) ?? '',
			id: appContext.currentNode?.id ?? ''
		})
	);

	return (
		<CardModal
			onOpenChange={(open) => {
				if (open) {
					resetForm();
					queueMicrotask(() => {
						(el.querySelector('input[name="name"]') as HTMLInputElement).select();
					});
				}
			}}
			open={modalData.open}
			ref={el}
			setOpen={(value) => setRenameFileModalOpen(value, modalData.source)}
			source={modalData.source}
			title="Rename File"
		>
			{(close) => (
				<form
					class="flex flex-col gap-4"
					onSubmit={async (event) => {
						event.preventDefault();
						const form = event.target as HTMLFormElement;
						const parsedFormData = formSchema(Object.fromEntries(new FormData(form)));
						if (parsedFormData instanceof type.errors) {
							setFormErrors(parseFormErrors(parsedFormData));
							return;
						}

						const node = await queries.getNodeById(parsedFormData.id);
						if (!node) {
							setFormErrors({ form: ['Something went wrong. Please try again later.'] });
							throw new Error('Node not found');
						}

						const parentPath = await getPathByNodeId(node.parentId!);
						if (!parentPath) {
							setFormErrors({ form: ['Something went wrong. Please try again.'] });
							return;
						}

						const existingNode = await queries.getNodeByNameAndParentId({
							name: parsedFormData.name,
							parentId: node.parentId
						});

						if (existingNode && !existingNode.deleted) {
							setFormErrors({
								name: [`File with name ${parsedFormData.name} already exists`]
							});
							return;
						}

						await createMessages({
							user_intent: 'rename_node',
							meta: {
								parentPath,
								oldName: node.name,
								newName: parsedFormData.name
							}
						});

						queryClient.invalidateQueries({ queryKey: queries.nodes.all() });
						close();
					}}
				>
					<ValidationErrors errors={formErrors.form} />
					<input name="id" type="hidden" value={form.id} />
					<TextField class="grid w-full items-center gap-1.5">
						<TextFieldLabel for="name">Name</TextFieldLabel>
						<TextFieldInput
							autocomplete="off"
							autofocus
							id="name"
							name="name"
							onInput={(event) =>
								setForm(
									create((draft) => {
										draft.name = event.currentTarget.value;
									})
								)
							}
							placeholder="Name"
							required
							type="text"
							value={form.name}
						/>
						<ValidationErrors errors={formErrors.name} />
					</TextField>
					<Button class="flex items-center gap-2 self-end" type="submit">
						<span>Submit</span>
					</Button>
				</form>
			)}
		</CardModal>
	);
}
