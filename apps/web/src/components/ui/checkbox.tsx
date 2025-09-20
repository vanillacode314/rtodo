import type { PolymorphicProps } from '@kobalte/core/polymorphic';
import type { ValidComponent } from 'solid-js';

import * as CheckboxPrimitive from '@kobalte/core/checkbox';
import { Match, splitProps, Switch } from 'solid-js';

import { cn } from '~/utils/tailwind';

type CheckboxRootProps<T extends ValidComponent = 'div'> =
	CheckboxPrimitive.CheckboxRootProps<T> & { class?: string | undefined };

const Checkbox = <T extends ValidComponent = 'div'>(
	props: PolymorphicProps<T, CheckboxRootProps<T>>
) => {
	const [local, others] = splitProps(props as CheckboxRootProps, ['class']);
	return (
		<CheckboxPrimitive.Root
			class={cn('items-top group relative flex space-x-2', local.class)}
			{...others}
		>
			<CheckboxPrimitive.Input class="peer" />
			<CheckboxPrimitive.Control class="border-primary ring-offset-background peer-focus-visible:ring-ring data-[checked]:bg-primary data-[indeterminate]:bg-primary data-[checked]:text-primary-foreground data-[indeterminate]:text-primary-foreground size-4 shrink-0 rounded-sm border peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:border-none data-[indeterminate]:border-none">
				<CheckboxPrimitive.Indicator>
					<Switch>
						<Match when={!others.indeterminate}>
							<svg
								class="size-4"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M5 12l5 5l10 -10" />
							</svg>
						</Match>
						<Match when={others.indeterminate}>
							<svg
								class="size-4"
								fill="none"
								stroke="currentColor"
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								viewBox="0 0 24 24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M5 12l14 0" />
							</svg>
						</Match>
					</Switch>
				</CheckboxPrimitive.Indicator>
			</CheckboxPrimitive.Control>
		</CheckboxPrimitive.Root>
	);
};

export { Checkbox };
