import { defineConfig, presetIcons, presetWebFonts } from 'unocss'

export default defineConfig({
  presets: [
    presetIcons({
      extraProperties: {
        color: 'inherit',
        display: 'inline-block',
        'vertical-align': 'baseline',
      },
    }),
    presetWebFonts({
      fonts: {
        sans: 'Inter:400,500,600,700,800,900',
      },
    }),
  ],
})
