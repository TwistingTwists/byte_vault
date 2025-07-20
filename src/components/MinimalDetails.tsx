import React, { useState } from 'react';

interface MinimalDetailsProps {
  summary: string;
  children: React.ReactNode;
}

const MinimalDetails: React.FC<MinimalDetailsProps> = ({ summary, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          inline-flex items-center gap-2 
          text-sm text-blue-600 dark:text-blue-400 
          hover:text-blue-800 dark:hover:text-blue-300
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded-md
          px-2 py-1 -mx-2 -my-1
        "
        aria-expanded={isOpen}
      >
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {summary}
      </button>
      
      <div 
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'}
        `}
      >
        <div className="border-l-2 border-gray-200 dark:border-gray-700 pl-4 text-sm">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MinimalDetails;