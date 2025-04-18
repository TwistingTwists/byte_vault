// // src/plugins/tailwind-plugin.js
// module.exports = function tailwindPlugin(context, options) {
//     return {
//       name: "tailwind-integration",
//       configurePostCss(postcssOptions) {
//         // Tailwind v3 configuration
//         postcssOptions.plugins.push(require("tailwindcss"));
//         postcssOptions.plugins.push(require("autoprefixer"));
        
//         // For Tailwind v4
//         // postcssOptions.plugins.push(require("@tailwindcss/postcss"));
        
//         return postcssOptions;
//       },
//     };
//   };
  

// src/plugins/tailwind-plugin.js (v4 specific)
module.exports = function tailwindPlugin(context, options) {
    return {
      name: "tailwind-v4-integration",
      configurePostCss(postcssOptions) {
        postcssOptions.plugins = [
          require("@tailwindcss/postcss")({
            config: "./tailwind.config.js"
          })
        ];
        return postcssOptions;
      },
    };
  };
  