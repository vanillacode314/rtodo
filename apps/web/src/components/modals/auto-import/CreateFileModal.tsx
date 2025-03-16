import { useQueryClient } from '@tanstack/solid-query';
import { type } from 'arktype';
import { and, eq } from 'drizzle-orm';
import { create } from 'mutative';
import { nanoid } from 'nanoid';
import { Show } from 'solid-js';
import { createStore } from 'solid-js/store';

import ValidationErrors from '~/components/form/ValidationErrors';
import BaseModal, { TModalSource } from '~/components/modals/BaseModal';
import { Button } from '~/components/ui/button';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';
import { RESERVED_PATHS } from '~/consts';
import { useApp } from '~/context/app';
import { db } from '~/db/client';
import { getPathByNodeId } from '~/db/queries/nodes';
import * as schema from '~/db/schema';
import { queries } from '~/queries';
import { parseFormErrors } from '~/utils/arktype';
import { createForm } from '~/utils/form';
import { createMessages } from '~/utils/messages';
import * as path from '~/utils/path';

const [modalData, setModalData] = createStore<{
	open: boolean;
	source: TModalSource;
}>({
	open: false,
	source: null
});
export const setCreateFileModalOpen = (open: boolean, source: TModalSource = null) => {
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
		.pipe((name) => {
			if (name === '') return name;
			if (name.endsWith('.list')) return name;
			return name + '.list';
		}),
	id: type('string | undefined').pipe((v) => v ?? nanoid()),
	parentId: 'string'
});
export default function CreateFileModal() {
	const queryClient = useQueryClient();
	const [appContext, _setAppContext] = useApp();

	const [{ form, formErrors }, { resetForm, setForm, setFormErrors }] = createForm(
		formSchema,
		() => ({
			name: '',
			parentId: appContext.currentNode?.id ?? '',
			id: nanoid()
		})
	);

	return (
		<BaseModal
			onOpenChange={(open) => open && resetForm()}
			open={modalData.open}
			setOpen={(value) => setCreateFileModalOpen(value, modalData.source)}
			source={modalData.source}
			title="Create File"
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

						const existingNode = await queries.getNodeByNameAndParentId(parsedFormData);

						if (!existingNode) {
							const parentPath = await getPathByNodeId(parsedFormData.parentId);
							const nodePath = path.join(parentPath, parsedFormData.name);
							if (RESERVED_PATHS.includes(nodePath)) {
								setFormErrors({ name: [`${nodePath} is a reserved path`] });
								return;
							}
							await createMessages(schema.nodes, parsedFormData);
						} else if (existingNode.deleted) {
							await createMessages(schema.nodes, { id: existingNode.id, deleted: false });
						} else {
							setFormErrors({ name: ['File already exists'] });
							return;
						}
						queryClient.invalidateQueries({ queryKey: queries.nodes._def });
						close();
					}}
				>
					<ValidationErrors errors={formErrors.form} />
					<input name="parentId" type="hidden" value={form.parentId} />
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
						<Show when={false /* createNode.isPending */}>
							<span class="i-svg-spinners:180-ring-with-bg text-lg" />
						</Show>
						<span>Submit</span>
					</Button>
				</form>
			)}
		</BaseModal>
	);
}
