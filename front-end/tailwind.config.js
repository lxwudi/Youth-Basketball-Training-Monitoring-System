import tailwindcssAnimate from 'tailwindcss-animate';

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#1f4ab8',
          foreground: '#f8fafc',
          muted: '#d0dcff',
        },
        accent: '#ff6b6b',
      },
      boxShadow: {
        brand: '0 20px 45px -20px rgba(31, 74, 184, 0.45)',
      },
      borderRadius: {
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
