import React, { useState } from 'react';

interface SimpleAccordionProps {
  summary: string;
  children: React.ReactNode;
  id?: string;
}

export default function SimpleAccordion({ 
  summary, 
  children, 
  id 
}: SimpleAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-4 border rounded-lg border-gray-200 dark:border-gray-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left bg-gray-50 dark:bg-gray-900 rounded-t-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
        id={id}
        aria-expanded={isExpanded}
      >
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {summary}
        </span>
        <svg 
          className={`w-5 h-5 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div 
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="p-4 prose dark:prose-invert max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
}
