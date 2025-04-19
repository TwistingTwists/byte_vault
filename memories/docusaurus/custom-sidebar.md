<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Creating a Custom TypeScript Sidebar for Docusaurus Blog

Before diving into the implementation details, I'll explore available themes with effective sidebar implementations and then provide a comprehensive guide to creating your own TypeScript-based sidebar component for a Docusaurus blog.

## Docusaurus Themes with Nice Sidebars

While Docusaurus has robust sidebar support for documentation, blog sidebars aren't as feature-rich by default. Here are some themes and approaches with good sidebar implementations:

### 1. Classic Theme with Customizations

The default classic theme can be extended with custom components to add blog sidebar functionality. This isn't built-in but provides the most flexibility[^1].

### 2. Community Themes

- **Docusaurus Theme Blog Plus**: Enhances the blog capabilities with better sidebar categorization
- **Thindot Theme**: Offers collapsible blog archives in the sidebar
- **Docusaurus Theme GitHub Codeblock**: While not specifically for blogs, demonstrates good component extension patterns[^7]


### 3. Custom Implementations

Some developers have shared their approaches to building blog sidebars, like Mark Needham's implementation mentioned in the search results[^10].

## Creating a Custom TypeScript Sidebar for Docusaurus Blog

### Step 1: Set Up TypeScript in Your Docusaurus Project

First, ensure your project supports TypeScript:

```bash
npm install --save-dev typescript @docusaurus/module-type-aliases @tsconfig/docusaurus
```

Create a `tsconfig.json` file in your project root[^6]:

```json
{
  "extends": "@tsconfig/docusaurus/tsconfig.json",
  "compilerOptions": {
    "baseUrl": "."
  }
}
```


### Step 2: Create the Basic Sidebar Component Structure

Create a new TypeScript file for your sidebar component in the `src/components` directory:

```tsx
// src/components/BlogSidebar/index.tsx
import React from 'react';
import { useAllPluginData } from '@docusaurus/useGlobalData';
import styles from './styles.module.css';

interface BlogPost {
  id: string;
  metadata: {
    permalink: string;
    title: string;
    date: string;
    formattedDate: string;
  };
}

export default function BlogSidebar(): JSX.Element {
  // We'll implement the component content in subsequent steps
  return (
    <div>
      <h3>Blog Archives</h3>
      {/* Sidebar content will go here */}
    </div>
  );
}
```

Create a corresponding CSS module file:

```css
/* src/components/BlogSidebar/styles.module.css */
.blogSidebar {
  padding: 1rem;
  border-right: 1px solid var(--ifm-toc-border-color);
  max-height: calc(100vh - var(--ifm-navbar-height));
  overflow-y: auto;
  position: sticky;
  top: var(--ifm-navbar-height);
}

.blogSidebarTitle {
  font-size: var(--ifm-h3-font-size);
  margin-bottom: 1rem;
}

.yearGroup {
  margin-bottom: 1rem;
}

.yearHeader {
  display: flex;
  align-items: center;
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.postsList {
  list-style: none;
  padding-left: 1rem;
  margin-bottom: 0.5rem;
}

.postItem {
  margin-bottom: 0.5rem;
}

.postLink {
  font-size: 0.9rem;
  color: var(--ifm-font-color-base);
  text-decoration: none;
}

.postLink:hover {
  color: var(--ifm-color-primary);
  text-decoration: none;
}
```


### Step 3: Fetch and Organize Blog Posts by Year

Enhance your component to fetch blog posts and organize them by year:

```tsx
// src/components/BlogSidebar/index.tsx
import React, { useState } from 'react';
import { useAllPluginData } from '@docusaurus/useGlobalData';
import { useLocation } from '@docusaurus/router';
import styles from './styles.module.css';

interface BlogPost {
  id: string;
  metadata: {
    permalink: string;
    title: string;
    date: string;
    formattedDate: string;
  };
}

interface BlogPostsByYear {
  [year: string]: BlogPost[];
}

export default function BlogSidebar(): JSX.Element {
  const location = useLocation();
  const allPluginData = useAllPluginData();
  const blogPluginData = allPluginData?.['docusaurus-plugin-content-blog']?.default;
  const blogData = blogPluginData?.blogs || [];
  
  // Group posts by year
  const postsByYear: BlogPostsByYear = blogData.reduce((result: BlogPostsByYear, post: BlogPost) =&gt; {
    const year = new Date(post.metadata.date).getFullYear().toString();
    if (!result[year]) {
      result[year] = [];
    }
    result[year].push(post);
    return result;
  }, {});
  
  // Sort years in descending order
  const sortedYears = Object.keys(postsByYear).sort((a, b) =&gt; parseInt(b) - parseInt(a));
  
  // Track which years are expanded
  const [expandedYears, setExpandedYears] = useState&lt;Record&lt;string, boolean&gt;&gt;(
    // Default to expand current year
    sortedYears.reduce((acc, year) =&gt; {
      acc[year] = true; // Start with all expanded
      return acc;
    }, {} as Record&lt;string, boolean&gt;)
  );
  
  const toggleYear = (year: string) =&gt; {
    setExpandedYears({
      ...expandedYears,
      [year]: !expandedYears[year],
    });
  };

  if (sortedYears.length === 0) {
    return <div>No blog posts found</div>;
  }

  return (
    <div>
      <h3>Blog Archives</h3>
      {sortedYears.map((year) =&gt; (
        <div>
          <div> toggleYear(year)}
          &gt;
            <span>
              {expandedYears[year] ? '▼' : '►'}
            </span>
            <span>{year} ({postsByYear[year].length})</span>
          </div>
          
          {expandedYears[year] &amp;&amp; (
            <ul>
              {postsByYear[year].map((post) =&gt; (
                <li>
                  <a href="{post.metadata.permalink}">
                    {post.metadata.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
```


### Step 4: Create a Custom Layout for Blog Pages

First, create a custom blog layout component that includes your sidebar:

```tsx
// src/theme/BlogLayout/index.tsx
import React from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import BlogSidebar from '@site/src/components/BlogSidebar';
import { ThemeClassNames } from '@docusaurus/theme-common';
import styles from './styles.module.css';

export default function BlogLayout(props) {
  const { children, sidebar, toc, ...layoutProps } = props;
  
  return (
    &lt;Layout
      {...layoutProps}
      className={ThemeClassNames.wrapper.blogPages}
    &gt;
      <div>
        <div>
          &lt;BlogSidebar /&gt;
        </div>
        &lt;main className={styles.blogContent}&gt;
          {children}
        &lt;/main&gt;
        {toc &amp;&amp; (
          <div>
            {toc}
          </div>
        )}
      </div>
    &lt;/Layout&gt;
  );
}
```

Create corresponding styles:

```css
/* src/theme/BlogLayout/styles.module.css */
.blogContainer {
  display: flex;
  width: 100%;
  max-width: var(--ifm-container-width);
  margin: 0 auto;
  padding: 0 var(--ifm-spacing-horizontal);
}

.sidebarContainer {
  width: 280px;
  margin-right: 2rem;
  display: flex;
}

.blogContent {
  flex: 1;
  min-width: 0;
}

.tocContainer {
  width: 240px;
  margin-left: 1rem;
}

@media (max-width: 996px) {
  .blogContainer {
    flex-direction: column;
  }

  .sidebarContainer {
    width: 100%;
    margin-right: 0;
    margin-bottom: 1.5rem;
  }

  .tocContainer {
    display: none;
  }
}
```


### Step 5: Register your Custom Layout through Swizzling

Swizzle the blog components to use your custom layout:

```bash
npm run swizzle @docusaurus/theme-classic BlogListPage -- --typescript
npm run swizzle @docusaurus/theme-classic BlogPostPage -- --typescript
```

Then modify both components to use your custom layout.

For `BlogListPage`:

```tsx
// src/theme/BlogListPage/index.tsx
// Modify the imported Layout to use your custom BlogLayout
import BlogLayout from '@theme/BlogLayout';
// ... rest of the file remains the same, just replace Layout with BlogLayout
```

Similarly for `BlogPostPage`.

### Step 6: Configure Theme Options for Better Sidebar Experience

Update your `docusaurus.config.js` to enable the sidebar behavior:

```js
module.exports = {
  // ... other config
  themeConfig: {
    // ... other theme config
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
  },
};
```


### Step 7: Add TypeScript Type Definitions

Create a types file for better TypeScript support:

```tsx
// src/types/blog.d.ts
declare module '@theme/BlogLayout' {
  import type { ReactNode } from 'react';
  
  export interface Props {
    children: ReactNode;
    sidebar?: ReactNode;
    toc?: ReactNode;
    title?: string;
    description?: string;
  }
  
  export default function BlogLayout(props: Props): JSX.Element;
}
```


## Implementing Advanced Features

For more advanced functionality, you might want to consider:

1. Adding filters for post categories or tags[^1]
2. Implementing search within the sidebar
3. Adding a "sticky" behavior that highlights the current post[^2]
4. Using localStorage to remember expanded/collapsed states between sessions

With this implementation, you'll have a fully functional TypeScript-based sidebar for your Docusaurus blog that organizes posts by year in a collapsible format[^7][^10].

Remember that creating custom components requires knowledge of React and Docusaurus's architecture. The approach above gives you full control over the sidebar's appearance and behavior while maintaining TypeScript type safety[^6].

<div style="text-align: center">⁂</div>

[^1]: https://docusaurus.io/docs/sidebar

[^2]: https://www.nikhilajain.com/post/how-to-set-up-multiple-sidebars-in-docusaurus

[^3]: https://stackoverflow.com/questions/58831318/make-sidebar-not-collapsable-and-always-expanded-in-docusaurus-v2-classic-preset

[^4]: https://github.com/facebook/docusaurus/issues/7227

[^5]: https://docusaurus.io/docs/sidebar/items

[^6]: https://docusaurus.io/docs/2.x/typescript-support

[^7]: https://docusaurus.io/docs/next/sidebar/autogenerated

[^8]: https://docusaurus.io/docs/next/sidebar/multiple-sidebars

[^9]: https://docusaurus.io/docs/sidebar/multiple-sidebars

[^10]: https://github.com/facebook/docusaurus/issues/2305

[^11]: https://github.com/facebook/docusaurus/issues/2305

[^12]: https://docusaurus.io/docs/blog

[^13]: https://github.com/facebook/docusaurus/issues/8918

[^14]: https://www.youtube.com/watch?v=Rc6mdSRaikE

[^15]: https://github.com/facebook/docusaurus/issues/9902

[^16]: https://kinsta.com/blog/docusaurus/

[^17]: https://docusaurus.io/docs/api/themes/configuration

[^18]: https://docusaurus.io/docs/configuration

[^19]: https://stackoverflow.com/questions/78653475/how-to-create-a-new-menu-in-docusaurus-and-different-sidebar-content

[^20]: https://docusaurus.io/docs/styling-layout

[^21]: https://docusaurus.io/feature-requests/p/collapse-expand-all-sections-button-in-sidebar

[^22]: https://docusaurus.io/feature-requests/p/please-add-the-ability-to-customize-sidebar-elements-use-react-components-as-sid
