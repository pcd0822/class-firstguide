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
        seat: {
          empty: 'rgb(248 250 252)',
          seated: 'rgb(134 239 172)',
        },
      },
    },
  },
  plugins: [],
};
export default config;
