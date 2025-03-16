import { useQueryClient } from '@tanstack/solid-query';
import { type } from 'arktype';
import { and, eq, isNull } from 'drizzle-orm';
import { createStore } from 'solid-js/store';

import ValidationErrors from '~/components/form/ValidationErrors';
import BaseModal, { TModalSource } from '~/components/modals/BaseModal';
import { Button } from '~/components/ui/button';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { useApp } from '~/context/app';
import { db } from '~/db/client';
import * as schema from '~/db/schema';
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

export const setRenameFolderModalOpen = (open: boolean, source: TModalSource = null) => {
	setModalData({ open, source });
};

const formSchema = type({
	name: type('string.trim')
		.narrow((name, ctx) => {
			if (!name.endsWith('.list')) return true;
			return ctx.reject({
				problem: `cannot end with .list (was "${name}")`
			});
		})
		.narrow((name, ctx) => {
			if (!name.includes('/')) return true;
			return ctx.reject({
				problem: `cannot contain / (was "${name}")`
			});
		}),
	id: 'string'
});
export default function RenameFolderModal() {
	let el!: HTMLDialogElement;

	const queryClient = useQueryClient();
	const [appContext, _] = useApp();

	const [{ form, formErrors }, { resetForm, setForm, setFormErrors }] = createForm(
		formSchema,
		() => ({
			name: appContext.currentNode?.name ?? '',
			id: appContext.currentNode?.id ?? ''
		})
	);

	return (
		<BaseModal
			onOpenChange={(open) => {
				if (open) {
					resetForm();
					queueMicrotask(() => {
						(el!.querySelector('input[name="name"]') as HTMLInputElement).select();
					});
				}
			}}
			open={modalData.open}
			ref={el}
			setOpen={(value) => setRenameFolderModalOpen(value, modalData.source)}
			source={modalData.source}
			title="Rename Folder"
		>
			{(close) => (
				<form
					class="flex flex-col gap-4"
					method="post"
					onSubmit={async (event) => {
						event.preventDefault();
						const form = event.target as HTMLFormElement;
						const parsedFormData = formSchema(Object.fromEntries(new FormData(form)));
						if (parsedFormData instanceof type.errors) {
							setFormErrors(parseFormErrors(parsedFormData));
							return;
						}
						const node = await queries.getNodeById(parsedFormData.id);

						if (!node) throw new Error('Node not found');
						const [conflictingNode] = await db
							.select({
								id: schema.nodes.id,
								parentId: schema.nodes.parentId,
								deleted: schema.nodes.deleted
							})
							.from(schema.nodes)
							.where(
								and(
									eq(schema.nodes.name, parsedFormData.name),
									node.parentId === null ?
										isNull(schema.nodes.parentId)
									:	eq(schema.nodes.parentId, node.parentId)
								)
							);

						if (!conflictingNode) {
							await createMessages(schema.nodes, parsedFormData);
						} else if (
							conflictingNode &&
							conflictingNode.id !== node.id &&
							conflictingNode.deleted
						) {
							const children = await db
								.select()
								.from(schema.nodes)
								.where(eq(schema.nodes.parentId, parsedFormData.id));
							await createMessages(
								schema.nodes,
								{ ...parsedFormData, id: conflictingNode.id, deleted: false },
								{ id: parsedFormData.id, deleted: true },
								...children.map((child) => ({
									id: child.id,
									parentId: conflictingNode.id
								}))
							);
						} else {
							setFormErrors({ name: [`Folder with name ${parsedFormData.name} already exists`] });
							return;
						}

						queryClient.invalidateQueries({ queryKey: queries.nodes._def });
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
		</BaseModal>
	);
}
