import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import remarkGfm from "remark-gfm";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  markdown:{
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],
  title: "Byte Vault",
  tagline: "Things I know about things I don't know",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://twistingtwists.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/byte_vault",
  trailingSlash: false, // Recommended for GitHub Pages

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "TwistingTwists", // Usually your GitHub org/user name.
  projectName: "bytevault", // Usually your repo name.
  scripts:[
    {src: "/scripts/processMultiline.ts", async: true}
  ],
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  plugins: [
    process.env.RSDOCTOR === "true" && ["rsdoctor", {}],
    "./src/plugins/tailwind-plugin.js",
  ],
  presets: [
    [
      "classic",
      {
        docs: false,
      
        // docs: {
        //   sidebarPath: './sidebars.ts',
        //   // Please change this to your repo.
        //   // Remove this to remove the "edit this page" links.
        //   editUrl:
        //     'https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/',
        // },
        gtag: {
          trackingID: 'G-B9R18KF2Y1',
          anonymizeIP: false,
        },
        blog: {
          routeBasePath: '/', // Serve the blog at the site's root
          showReadingTime: true,
          feedOptions: {
            type: ["rss", "atom"],
            xslt: true,
            createFeedItems: async (params) => {
              const {blogPosts, defaultCreateFeedItems, ...rest} = params;
              return defaultCreateFeedItems({
                // keep only the 10 most recent blog posts in the feed
                blogPosts: blogPosts.filter((item, index) => index < 10),
                ...rest,
              });
            },
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          // editUrl:
          //   "https://github.com/facebook/docusaurus/tree/main/packages/create-docusaurus/templates/shared/",
          // Useful options to enforce blogging best practices
          onInlineTags: "warn",
          onInlineAuthors: "warn",
          onUntruncatedBlogPosts: "warn",
          remarkPlugins: [remarkGfm],
          blogSidebarTitle: 'All posts',
          blogSidebarCount: 'ALL',
          // feed generator
          // include: ['**/*.{md,mdx}'],
          // exclude: [
          //   '**/_*.{js,jsx,ts,tsx,md,mdx}',
          //   '**/_*/**',
          //   '**/*.test.{js,jsx,ts,tsx}',
          //   '**/__tests__/**',
          // ],
          postsPerPage: 10,
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/docusaurus-social-card.jpg",
    // docs:{
    //   sidebar: {
    //     hideable: true,
    //     autoCollapseCategories: true ,
    //   },
    // },
    blog: {
      sidebar: {
        groupByYear: true,
      },
    },
    navbar: {
      title: "Byte Vault",
      logo: {
        alt: "Byte Vault",
        src: "img/logo.svg",
      },
      items: [
        // {
        //   type: 'docSidebar',
        //   sidebarId: 'tutorialSidebar',
        //   position: 'left',
        //   label: 'Tutorial',
        // },
        { to: "/", label: "Blog", position: "left" },
        // { to: "/blog", label: "Blog", position: "left" },
        {
          href: "https://github.com/TwistingTwists/bytevault",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        // {
        //   title: "Docs",
        //   items: [
        //     {
        //       label: "Tutorial",
        //       to: "/docs/intro",
        //     },
        //   ],
        // },
        // {
          // title: "Community",
          // items: [
          //   {
          //     label: "Stack Overflow",
          //     href: "https://stackoverflow.com/questions/tagged/docusaurus",
          //   },
          //   {
          //     label: "Discord",
          //     href: "https://discordapp.com/invite/docusaurus",
          //   },
          //   {
          //     label: "X",
          //     href: "https://x.com/docusaurus",
          //   },
          // ],
        // },
        {
          title: "More",
          items: [
            {
              label: "Blog",
              to: "/",
            },
            {
              label: "GitHub",
              href: "https://github.com/TwistingTwists/bytevault",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Abhishek Tripathi`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
