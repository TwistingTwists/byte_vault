// tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./blog/**/*.{md,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'Fira Code', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: theme('colors.slate.800'),
            a: {
              color: theme('colors.teal.600'),
              '&:hover': {
                color: theme('colors.teal.700'),
              },
            },
            h1: { color: theme('colors.slate.900'), fontWeight: '700', fontSize: '2.25em' },
            h2: { color: theme('colors.slate.900'), fontWeight: '600', fontSize: '1.5em' },
            h3: { color: theme('colors.slate.900'), fontWeight: '600', fontSize: '1.25em' },
            h4: { color: theme('colors.slate.900'), fontWeight: '600', fontSize: '1em' },
            code: {
              color: theme('colors.slate.900'),
              backgroundColor: theme('colors.slate.100'),
              padding: '0.25rem 0.375rem',
              borderRadius: '0.25rem',
              fontWeight: '400',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
        invert: {
          css: {
            color: theme('colors.slate.300'),
            a: {
              color: theme('colors.teal.400'),
              '&:hover': {
                color: theme('colors.teal.300'),
              },
            },
            h1: { color: theme('colors.white') },
            h2: { color: theme('colors.white') },
            h3: { color: theme('colors.white') },
            h4: { color: theme('colors.white') },
            code: {
              color: theme('colors.white'),
              backgroundColor: theme('colors.slate.800'),
            },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  corePlugins: {
    preflight: false, // Prevents Tailwind from resetting Docusaurus styles
  },
  darkMode: ['class', '[data-theme="dark"]'], // Enables compatibility with Docusaurus dark mode
};
  