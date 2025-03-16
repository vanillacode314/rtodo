import type { Component, ComponentProps } from 'solid-js';

import { Toaster as Sonner } from 'solid-sonner';

type ToasterProps = ComponentProps<typeof Sonner>;

const Toaster: Component<ToasterProps> = (props) => {
	return (
		<Sonner
			class="toaster group"
			toastOptions={{
				classes: {
					toast:
						'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg border',
					description: 'group-[.toast]:text-muted-foreground',
					actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
					cancelButton:
						'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground border group-[.toaster]:border-border border',
					closeButton:
						'hover:group-[.toast]:bg-muted group-[.toast]:text-muted-foreground border group-[.toaster]:border-border border'
				}
			}}
			{...props}
		/>
	);
};

export { Toaster };
