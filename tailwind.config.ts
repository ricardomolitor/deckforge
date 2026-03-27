import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF4EE',
          100: '#FFECE0',
          200: '#FFD6BD',
          300: '#FFB88A',
          400: '#FF8F4D',
          500: '#FF5800',
          600: '#E04E00',
          700: '#B84000',
          800: '#943300',
          900: '#7A2B00',
          950: '#4D1A00',
        },
        nero: {
          950: '#030304',
          900: '#08080b',
          800: '#0e0e12',
          700: '#18181f',
          600: '#1e1e26',
          500: '#28282f',
          400: '#35353d',
          300: '#45454e',
          200: '#5a5a64',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
