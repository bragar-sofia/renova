/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './views/**/*.ejs',
    './views/**/*.html',

    './assets/**/*.js',
    './assets/**/*.ts',

    './api/**/*.js',
    './config/**/*.js',
  ],

  safelist: [
    'hidden',
    'block',
    'flex',
    'inline-flex',

    'md:hidden',
    'md:flex',

    'lg:hidden',
    'lg:flex',

    'translate-x-24',
    'translate-x-0',

    'opacity-0',
    'opacity-100',

    'absolute',
    'relative',
    'right-3',

    'px-2',
    'px-3',

    'py-2',
    'py-3',

    'text-sm',
    'text-xs',
  ],

  theme: {
    extend: {
      colors: {
        navy: '#012a4a',
        sky: '#eff6f9',
        steel: '#527b8d',
      },

      fontFamily: {
        sans: [
          'Open Sans',
          'Arial',
          'sans-serif',
        ],

        display: [
          'Geologica',
          'Arial',
          'sans-serif',
        ],
      },

      borderRadius: {
        pill: '0.5rem',
        blob: '1.25rem',
        card: '1.875rem',
        hero: '2.1875rem',
      },

      maxWidth: {
        shell: '122rem',
      },

      fontSize: {
        h1: [
          'clamp(2rem, 0.5rem + 3.125vw, 4rem)',
          {
            lineHeight: '1.05',
            letterSpacing: '-0.03em',
          },
        ],

        h2: [
          'clamp(1.25rem, 0.3125rem + 1.953125vw, 2.5rem)',
          {
            lineHeight: '1.05',
            letterSpacing: '-0.03em',
          },
        ],

        h3: [
          'clamp(1.125rem, 0.1875rem + 1.171875vw, 1.5rem)',
          {
            lineHeight: '1.05',
            letterSpacing: '-0.03em',
          },
        ],

        h4: [
          '1rem',
          {
            lineHeight: '1.35',
          },
        ],
      },
    },
  },

  plugins: [],
};
