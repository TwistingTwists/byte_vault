import React from "react";

interface TipsSectionProps {
  contributor: string;
  contributorUrl?: string;
  children: React.ReactNode;
}

const TipsSection: React.FC<TipsSectionProps> = ({ contributor, contributorUrl, children }) => {
  return (
    <div className="relative bg-emerald-50/30 dark:bg-emerald-950/10 rounded-xl p-6 my-8 border-2 border-emerald-200 dark:border-emerald-800">
      {/* Decorative corner element */}
      <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
        <div className="absolute top-0 right-0 w-0 h-0 border-l-12 border-b-12 border-l-transparent border-b-emerald-200 dark:border-b-emerald-800"></div>
      </div>
      
      {/* Header with contributor info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
          <svg 
            className="w-5 h-5 text-emerald-600 dark:text-emerald-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
            />
          </svg>
        </div>
        
        <div>
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide">
            Pro Tips from
          </div>
          {contributorUrl ? (
            <a 
              href={contributorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
            >
              {contributor}
            </a>
          ) : (
            <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100 m-0">
              {contributor}
            </h3>
          )}
        </div>
      </div>
      
      {/* Content area with subtle border */}
      <div className="border-l-4 border-emerald-300 dark:border-emerald-700 pl-4 text-gray-700 dark:text-gray-300">
        {children}
      </div>
    </div>
  );
};

export default TipsSection;