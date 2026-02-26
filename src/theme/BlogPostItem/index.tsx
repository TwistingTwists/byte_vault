import React, {type ReactNode} from 'react';
import BlogPostItem from '@theme-original/BlogPostItem';
import type BlogPostItemType from '@theme/BlogPostItem';
import type {WrapperProps} from '@docusaurus/types';
import {useBlogPost} from '@docusaurus/plugin-content-blog/client';
import Link from '@docusaurus/Link';

type Props = WrapperProps<typeof BlogPostItemType>;

export default function BlogPostItemWrapper(props: Props): ReactNode {
  const {isBlogPostPage} = useBlogPost();

  return (
    <>
      {isBlogPostPage && (
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            fontSize: '0.95rem',
            color: 'var(--ifm-color-emphasis-600)',
            marginBottom: '1rem',
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
          }}
        >
          ← Back to all posts
        </Link>
      )}
      <BlogPostItem {...props} />
    </>
  );
}
