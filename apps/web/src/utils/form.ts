import { type } from 'arktype';
import { create } from 'mutative';
import { createStore } from 'solid-js/store';

import { throwOnParseError } from './arktype';

function createForm<TSchema extends type.Any<object>>(
	schema: TSchema,
	initial: () => NoInfer<TSchema['infer']>
) {
	const [form, setForm] = createStore(initial() as TSchema['infer']);
	const [formErrors, setFormErrors] = createStore<
		Partial<Record<'form' | keyof typeof schema.infer, string[]>>
	>({});
	function resetForm() {
		setForm(throwOnParseError(initial()));
		setFormErrors(
			create((draft) => {
				for (const key in draft) {
					draft[key] = undefined!;
				}
			})
		);
	}

	return [
		{ form, formErrors },
		{ setForm, setFormErrors, resetForm }
	] as const;
}
export { createForm };
