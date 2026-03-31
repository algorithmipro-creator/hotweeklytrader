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
        primary: '#3b82f6',
        'primary-hover': '#2563eb',
        bg: '#0f172a',
        'bg-secondary': '#1e293b',
        'bg-tertiary': '#334155',
        text: '#f8fafc',
        'text-secondary': '#94a3b8',
        link: '#60a5fa',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
  plugins: [],
};

export default config;
