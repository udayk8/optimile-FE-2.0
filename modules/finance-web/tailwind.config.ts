import type { Config } from 'tailwindcss'

// Finance keeps its own visual identity (Inter + Fraunces, standard Tailwind
// palette, custom keyframes) rather than the shared HSL design tokens, so the
// 26 ported pages render pixel-identical to the original standalone app.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
