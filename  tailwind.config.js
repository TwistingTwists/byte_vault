// tailwind.config.js
module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {},
    },
    plugins: [],
    corePlugins: {
      preflight: false, // Prevents Tailwind from resetting Docusaurus styles
    },
    darkMode: ['class', '[data-theme="dark"]'], // Enables compatibility with Docusaurus dark mode
  };
  