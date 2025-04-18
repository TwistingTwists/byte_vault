import React, { useState } from 'react';

interface CollapsibleSectionProps {
  summary: string;
  children: React.ReactNode;
}

/**
 * CollapsibleSection: Simple React component for MDX to collapse/expand details.
 */
export default function CollapsibleSection({ summary, children }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          px-4 py-2 rounded-lg
          bg-blue-600 hover:bg-blue-700
          text-white font-medium text-sm
          transition-all duration-200
          hover:shadow-md active:scale-95
          dark:bg-blue-500 dark:hover:bg-blue-600
        "
      >
        {isExpanded ? 'Hide Details' : 'Show Details'}
      </button>
      <div className="mt-2">
        <strong className="text-gray-900 dark:text-gray-100">{summary}</strong>
      </div>
      {isExpanded && (
        <div className="mt-3 p-4 rounded-lg bg-slate-900/5 dark:bg-slate-50/5">
          {children}
        </div>
      )}
    </div>
  );
}
