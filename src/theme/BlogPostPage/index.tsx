import React, {type ReactNode} from 'react';
import BlogPostPage from '@theme-original/BlogPostPage';
import type BlogPostPageType from '@theme/BlogPostPage';
import type {WrapperProps} from '@docusaurus/types';
import Link from '@docusaurus/Link';

type Props = WrapperProps<typeof BlogPostPageType>;

export default function BlogPostPageWrapper(props: Props): ReactNode {
  return (
    <>
      <div className="container margin-vert--lg">
        <Link 
          to="/" 
          className="button button--secondary button--sm margin-bottom--md"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to all posts
        </Link>
      </div>
      <BlogPostPage {...props} sidebar={{ items: [] }} />
    </>
  );
}
