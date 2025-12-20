import React from 'react';
import Link from '@docusaurus/Link';

interface ProjectCardProps {
  title: string;
  description: string;
  tags: string[];
  demoLink?: string;
  githubLink?: string;
  preview?: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  tags,
  demoLink,
  githubLink,
  preview
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-200 p-6">
      {/* Title */}
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
        {title}
      </h3>
      
      {/* Description */}
      <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
        {description}
      </p>
      
      {/* Preview Text */}
      {preview && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">
          {preview}
        </p>
      )}
      
      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-xs font-medium rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
      
      {/* Action Links */}
      <div className="flex gap-3">
        {demoLink && (
          <Link
            to={demoLink}
            className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors duration-200 no-underline hover:no-underline"
          >
            View Demo
          </Link>
        )}
        {githubLink && (
          <Link
            href={githubLink}
            className="inline-flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md transition-colors duration-200 no-underline hover:no-underline"
          >
            GitHub
          </Link>
        )}
      </div>
    </div>
  );
};