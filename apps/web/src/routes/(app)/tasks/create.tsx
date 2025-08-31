import { useQueryClient } from '@tanstack/solid-query';
import { createFileRoute } from '@tanstack/solid-router';
import { type } from 'arktype';
import { create } from 'mutative';
import { nanoid } from 'nanoid';
import { Show } from 'solid-js';
import { toast } from 'solid-sonner';

import DatePicker from '~/components/DatePicker';
import ValidationErrors from '~/components/form/ValidationErrors';
import { Select } from '~/components/Select';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import {
	TextFieldInput,
	TextField,
	TextFieldLabel,
	TextFieldTextArea
} from '~/components/ui/text-field';
import { getNodeByPath } from '~/db/queries/nodes';
import { queries } from '~/queries';
import { parseFormErrors } from '~/utils/arktype';
import { createForm } from '~/utils/form';
import { randomFloat } from '~/utils/math';
import { createMessages } from '~/utils/messages';

export const Route = createFileRoute('/(app)/tasks/create')({
	component: CreateTaskPage,
	validateSearch: type({
		path: 'string'
	})
});

const VALID_HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const VALID_MINUTES = Array.from({ length: 60 }, (_, i) => i);
const formSchema = type({
	body: type('string.trim'),
	id: type('string | undefined').pipe((v) => v ?? nanoid()),
	path: 'string',
	hour: type('string').pipe.try(Number).to('1 <= number <= 12'),
	minute: type('string').pipe.try(Number).to('0 <= number <= 59'),
	ampm: '"am"|"pm"',
	date: type('Date | string').pipe.try((value) => {
		if (value instanceof Date) return value;
		const milliseconds = Date.parse(value);
		if (isNaN(milliseconds)) {
			throw new Error('Invalid Date');
		}
		return new Date(milliseconds);
	}),
	repeatsEveryCount: type('string | undefined').pipe.try(Number).to('number>0 | null'),
	repeatsEveryDuration: type('("day"|"month"|"year") | null | undefined')
}).narrow((value, ctx) => {
	const year = value.date.getFullYear();
	const month = value.date.getMonth();
	const day = value.date.getDate();
	const hour = value.hour + (value.ampm === 'pm' ? 12 : 0) - 1;
	const minute = value.minute;
	const now = new Date();
	const todayYear = now.getFullYear();
	const todayMonth = now.getMonth();
	const todayDay = now.getDate();
	const todayHour = now.getHours();
	const todayMinute = now.getMinutes();
	if (year < todayYear) {
		return ctx.reject({ problem: 'Task must be set in the future' });
	}
	if (year === todayYear && month < todayMonth) {
		return ctx.reject({ problem: 'Task must be set in the future' });
	}
	if (year === todayYear && month === todayMonth && day < todayDay) {
		return ctx.reject({ problem: 'Task must be set in the future' });
	}
	if (year === todayYear && month === todayMonth && day === todayDay && hour < todayHour) {
		return ctx.reject({ problem: 'Task must be set in the future' });
	}
	if (
		year === todayYear &&
		month === todayMonth &&
		day === todayDay &&
		hour === todayHour &&
		minute < todayMinute
	) {
		return ctx.reject({ problem: 'Task must be set in the future' });
	}
	return true;
});
export default function CreateTaskPage() {
	const queryClient = useQueryClient();
	const searchParams = Route.useSearch();
	const navigate = Route.useNavigate();

	const [{ form, formErrors }, { setForm, resetFormErrors, setFormErrors }] = createForm(
		formSchema,
		() => {
			const now = new Date();
			const hour = (now.getHours() + 1) % 12;
			const minute = now.getMinutes();
			const ampm = now.getHours() > 12 ? 'pm' : 'am';

			return {
				body: '',
				path: searchParams().path,
				id: nanoid(),
				hour,
				minute,
				ampm,
				date: now,
				repeatsEveryCount: null,
				repeatsEveryDuration: null
			} as const;
		}
	);

	return (
		<form
			class="flex flex-col gap-4 p-5"
			method="post"
			onSubmit={async (event) => {
				event.preventDefault();
				resetFormErrors();
				const form = event.target as HTMLFormElement;
				const parsedFormData = formSchema(Object.fromEntries(new FormData(form)));
				if (parsedFormData instanceof type.errors) {
					setFormErrors(parseFormErrors(parsedFormData));
					return;
				}

				const [node] = await getNodeByPath(parsedFormData.path);
				if (!node) {
					toast.error('Something went wrong. Please try again later.');
					return;
				}
				const maxIndex = await queries.getMaxTaskIndexByNodeId(node.id);
				const index = randomFloat({ min: maxIndex });
				parsedFormData.date.setHours(
					parsedFormData.hour + (parsedFormData.ampm === 'pm' ? 12 : 0),
					parsedFormData.minute
				);
				await createMessages({
					user_intent: 'create_task',
					meta: {
						goesOffAt: parsedFormData.date,
						path: parsedFormData.path,
						body: parsedFormData.body,
						index,
						repeatsEvery:
							parsedFormData.repeatsEveryCount && parsedFormData.repeatsEveryDuration ?
								{
									count: parsedFormData.repeatsEveryCount,
									duration: parsedFormData.repeatsEveryDuration
								}
							:	null
					}
				});

				await navigate({ to: '/home/$', params: { _splat: parsedFormData.path } });
				queryClient.invalidateQueries({ queryKey: queries.tasks.all() });
			}}
		>
			<ValidationErrors errors={formErrors.form} />
			<input name="path" type="hidden" value={form.path} />
			<input name="id" type="hidden" value={form.id} />

			<TextField class="flex h-full flex-col gap-1.5">
				<TextFieldLabel for="title">Body</TextFieldLabel>
				<TextFieldTextArea
					autocomplete="off"
					autofocus
					class="grow"
					id="body"
					name="body"
					onInput={(event) =>
						setForm(
							create((draft) => {
								draft.body = event.currentTarget.value;
							})
						)
					}
					required
					value={form.body}
				/>
				<ValidationErrors errors={formErrors.body} />
			</TextField>
			<div class="flex flex-col gap-1.5">
				<Label>At</Label>
				<div class="flex items-baseline gap-4">
					<DatePicker
						name="date"
						setValue={(value) => {
							setForm(
								create((draft) => {
									draft.date = value;
								})
							);
						}}
						value={form.date}
					/>
					<Select
						name="hour"
						options={VALID_HOURS.map((hour) => ({
							value: hour.toString(),
							label: hour.toString().padStart(2, '0')
						}))}
						setValue={({ value }) => {
							setForm(
								create((draft) => {
									draft.hour = Number(value);
								})
							);
						}}
						value={{ value: form.hour.toString(), label: form.hour.toString().padStart(2, '0') }}
					/>
					:
					<Select
						name="minute"
						options={VALID_MINUTES.map((minute) => ({
							value: minute.toString(),
							label: minute.toString().padStart(2, '0')
						}))}
						setValue={({ value }) => {
							setForm(
								create((draft) => {
									draft.minute = Number(value);
								})
							);
						}}
						value={{
							value: form.minute.toString(),
							label: form.minute.toString().padStart(2, '0')
						}}
					/>
					<Select
						name="ampm"
						options={['am', 'pm'].map((ampm) => ({
							value: ampm,
							label: ampm.toUpperCase()
						}))}
						setValue={({ value }) => {
							setForm(
								create((draft) => {
									draft.ampm = value as 'am' | 'pm';
								})
							);
						}}
						value={{ value: form.ampm, label: form.ampm.toUpperCase() }}
					/>
				</div>
				<ValidationErrors errors={formErrors.date} />
				<ValidationErrors errors={formErrors.hour} />
				<ValidationErrors errors={formErrors.minute} />
				<ValidationErrors errors={formErrors.ampm} />
			</div>
			<div class="flex flex-col gap-1.5">
				<Label>Repeats Every</Label>
				<div class="flex items-baseline gap-4">
					<TextField class="grow">
						<TextFieldLabel for="repeatsEveryCount">Count</TextFieldLabel>
						<TextFieldInput
							type="number"
							min="1"
							id="repeatsEveryCount"
							name="repeatsEveryCount"
							value={form.repeatsEveryCount ?? ''}
							onInput={(event) =>
								setForm(
									create((draft) => {
										draft.repeatsEveryCount =
											event.currentTarget.value ? Number(event.currentTarget.value) : null;
									})
								)
							}
						/>
					</TextField>
					<Select
						name="repeatsEveryDuration"
						options={['day', 'month', 'year'].map((duration) => ({
							value: duration,
							label: duration
						}))}
						setValue={({ value }) => {
							setForm(
								create((draft) => {
									draft.repeatsEveryDuration = value as 'day' | 'month' | 'year';
								})
							);
						}}
						value={
							form.repeatsEveryDuration ?
								{ value: form.repeatsEveryDuration, label: form.repeatsEveryDuration }
							:	{ value: null, label: 'Choose' }
						}
					/>
				</div>
				<ValidationErrors errors={formErrors.repeatsEveryCount} />
				<ValidationErrors errors={formErrors.repeatsEveryDuration} />
			</div>
			<Button class="flex items-center gap-2 self-end" type="submit">
				<Show when={false /* createNode.isPending */}>
					<span class="i-svg-spinners:180-ring-with-bg text-lg" />
				</Show>
				<span>Submit</span>
			</Button>
		</form>
	);
}
