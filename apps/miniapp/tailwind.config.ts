import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--tg-theme-button-color, #3b82f6)',
        'primary-text': 'var(--tg-theme-button-text-color, #ffffff)',
        bg: 'var(--tg-theme-bg-color, #0f172a)',
        'bg-secondary': 'var(--tg-theme-secondary-bg-color, #1e293b)',
        text: 'var(--tg-theme-text-color, #f8fafc)',
        'text-secondary': 'var(--tg-theme-hint-color, #94a3b8)',
        link: 'var(--tg-theme-link-color, #60a5fa)',
      },
    },
  },
  plugins: [],
};

export default config;
