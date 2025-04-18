# Build-Time OG Image Generation Plan for ByteVault Blog

## Overview

This plan outlines a strategy for generating Open Graph (OG) images at build time for ByteVault blog posts. Each image will display the content before the truncate tag (typically the TL;DR section), ensuring social media shares provide a meaningful preview of the article.

## Implementation Steps

### 1. Create OG Image Generation Script

- **Technology Stack**: Node.js script using:
  - `satori` for React → SVG conversion
  - `@resvg/resvg-js` for SVG → PNG conversion
  - `gray-matter` for parsing MDX frontmatter
  - `mdast-util-from-markdown` for parsing MDX content

- **Location**: `/scripts/generate-og-images.js`

### 2. MDX Content Extraction

- Parse each MDX file in the `/blog` directory
- Extract content before the truncate tag (`<!--truncate-->` or `{/* truncate */}`)
- For posts using React components (like TldrTimeline), extract the props data

### 3. Image Generation Logic

- Create a React template for OG images (1200×630px)
- For each blog post:
  - Extract title, date, and pre-truncate content
  - Render the content into the OG image template
  - For TldrTimeline components, render a visually similar timeline in the image
  - Apply ByteVault branding (logo, colors, typography)
  - Save as PNG to `/static/img/og/[slug].png`

### 4. Docusaurus Integration

- Update `docusaurus.config.js` to use a custom plugin that:
  - Runs the OG image generation script during build
  - Injects the OG image URLs into each blog post's metadata

- Add to each blog post's frontmatter:
```yaml
image: /img/og/[slug].png
```

### 5. Build Process Integration

- Add a pre-build hook in `package.json`:
```json
"scripts": {
  "prebuild": "node ./scripts/generate-og-images.js",
  "build": "docusaurus build"
}
```

### 6. Styling and Templates

- Create OG image templates that match ByteVault's branding
- Design special handling for different component types:
  - TldrTimeline → Timeline-style OG image
  - TldrComic → Comic-style OG image
  - TldrCallout → Callout-style OG image
  - Regular text → Clean text layout

## Technical Implementation Details

### Content Extraction Function

```javascript
function extractPreTruncateContent(mdxContent) {
  // Find truncate marker
  const truncateIndex = mdxContent.indexOf('<!--truncate-->') || 
                       mdxContent.indexOf('{/* truncate */}');
  
  if (truncateIndex === -1) return mdxContent.substring(0, 500); // Fallback
  
  // Extract content before truncate marker
  return mdxContent.substring(0, truncateIndex);
}
```

### Component Detection

```javascript
function detectAndExtractComponents(content) {
  // Look for TldrTimeline, TldrComic, etc.
  const tldrMatch = content.match(/<TldrTimeline\s+steps=\{([\s\S]*?)\}/);
  
  if (tldrMatch) {
    // Parse the steps prop data
    return { type: 'timeline', data: parseTldrSteps(tldrMatch[1]) };
  }
  
  // Similar detection for other components
  
  return { type: 'text', data: content };
}
```

## Next Steps

1. Create the script directory and base files
2. Implement content extraction functions
3. Set up the OG image templates
4. Integrate with Docusaurus build process
5. Test with various blog post formats
6. Add to CI/CD pipeline

## Resources

- Satori: https://github.com/vercel/satori
- Resvg: https://github.com/yisibl/resvg-js
- Docusaurus plugins: https://docusaurus.io/docs/api/plugins