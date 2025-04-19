import React, { useState } from 'react';
import { usePluginData } from '@docusaurus/useGlobalData';
import { useLocation } from '@docusaurus/router';

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

interface BlogPluginData {
  blogPosts: BlogPost[];
}

export default function BlogSidebar(): JSX.Element {
  const location = useLocation();
  const blogPluginData = usePluginData('docusaurus-plugin-content-blog', 'default') as BlogPluginData;
  const blogData = blogPluginData?.blogPosts || [];
  
  // Group posts by year
  const postsByYear: BlogPostsByYear = blogData.reduce((result: BlogPostsByYear, post: BlogPost) => {
    const year = new Date(post.metadata.date).getFullYear().toString();
    if (!result[year]) {
      result[year] = [];
    }
    result[year].push(post);
    return result;
  }, {});
  
  // Sort years in descending order
  const sortedYears = Object.keys(postsByYear).sort((a, b) => parseInt(b) - parseInt(a));
  
  // Track which years are expanded
  const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>(
    // Default to expand current year
    sortedYears.reduce((acc, year) => {
      acc[year] = true; // Start with all expanded
      return acc;
    }, {} as Record<string, boolean>)
  );
  
  const toggleYear = (year: string) => {
    setExpandedYears({
      ...expandedYears,
      [year]: !expandedYears[year],
    });
  };

  if (sortedYears.length === 0) {
    return <div className="p-4 text-gray-500">No blog posts found</div>;
  }

  return (
    <div className="p-4 border-r border-gray-700/20 dark:border-gray-700 h-[calc(100vh-var(--ifm-navbar-height))] overflow-y-auto sticky top-[var(--ifm-navbar-height)]">
      <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Blog Archives</h3>
      <div className="space-y-4">
        {sortedYears.map((year) => (
          <div key={year} className="group">
            <div 
              onClick={() => toggleYear(year)}
              className="flex items-center gap-2 cursor-pointer hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <span className="text-xs transition-transform duration-200" 
                    style={{ transform: expandedYears[year] ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                ▶
              </span>
              <span className="font-medium">
                {year} ({postsByYear[year].length})
              </span>
            </div>
            
            {expandedYears[year] && (
              <ul className="mt-2 ml-4 space-y-2">
                {postsByYear[year].map((post) => (
                  <li key={post.id}>
                    <a 
                      href={post.metadata.permalink}
                      className={`text-sm hover:text-primary-600 dark:hover:text-primary-400 transition-colors
                        ${location.pathname === post.metadata.permalink ? 
                          'text-primary-600 dark:text-primary-400 font-medium' : 
                          'text-gray-600 dark:text-gray-400'}`}
                    >
                      {post.metadata.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
