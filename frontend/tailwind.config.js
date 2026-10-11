/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: { xs: '375px', sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px' },
    extend: {
      colors: {
        brand: { 50: '#ECF7F2', 100: '#D3EDE2', 500: '#169A70', 600: '#0F7D5A', 700: '#0B6248', 900: '#063A2B' },
        marigold: { 50: '#FFF6E0', 400: '#FFBB33', 500: '#F59E0B' },
        ink: { DEFAULT: '#16201C', soft: '#4A5750', mute: '#7B867F' },
        surface: { DEFAULT: '#FFFFFF', alt: '#F4F6F3', line: '#E3E8E4' },
        danger: '#D64545',
      },
      fontFamily: { sans: ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'] },
      borderRadius: { card: '16px', pill: '999px' },
      boxShadow: {
        card: '0 1px 2px rgba(22,32,28,.05), 0 4px 12px rgba(22,32,28,.05)',
        sheet: '0 -8px 30px rgba(22,32,28,.14)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        up: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
      },
      animation: { up: 'up .18s ease-out' },
    },
  },
  plugins: [],
};
