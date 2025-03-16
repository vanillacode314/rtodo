import { defineConfig, presetIcons, presetWebFonts } from 'unocss';

export default defineConfig({
	presets: [
		presetIcons({
			extraProperties: {
				color: 'auto',
				display: 'inline-block',
				'vertical-align': 'middle'
			}
		}),
		presetWebFonts({
			fonts: {
				sans: 'Inter:400,500,600,700,800,900'
			}
		})
	]
});
