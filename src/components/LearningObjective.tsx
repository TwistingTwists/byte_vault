import React, { useState } from 'react';

interface LearningObjectiveProps {
  question: string;
  children: React.ReactNode;
  id?: string;
  defaultExpanded?: boolean;
}

const LearningObjective: React.FC<LearningObjectiveProps> = ({ 
  question, 
  children, 
  id = `learning-objective-${question}`,
  defaultExpanded = true
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const toggle = () => setIsExpanded(prev => !prev);

  return (
    <div className="my-3 sm:my-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg overflow-hidden shadow-sm dark:shadow-blue-900/5 border-l-4 border-blue-400 dark:border-blue-600">
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 dark:bg-blue-900/30 rounded-md group relative">
            <svg 
              className="w-4 h-4 text-blue-600 dark:text-blue-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
              aria-label="Learning Objective"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" 
              />
            </svg>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1.5 py-0.5 text-xs text-white bg-gray-800 dark:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
              Learning Objective
            </div>
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-base font-medium text-blue-900 dark:text-blue-100 break-words">
              {question}
            </p>
          </div>
          <button
            id={`${id}-button`}
            onClick={toggle}
            className="
              flex items-center gap-1 px-2 py-1 ml-auto
              text-2xs sm:text-xs font-medium text-blue-600 dark:text-blue-400
              hover:text-blue-800 dark:hover:text-blue-300
              transition-colors duration-200
              focus:outline-none
            "
            aria-expanded={isExpanded}
            aria-controls={id}
          >
            {isExpanded ? (
              <>
                Hide
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Show
                <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
        
        <div 
          id={id}
          role="region"
          aria-labelledby={`${id}-button`}
          className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="pt-2 border-t border-blue-100 dark:border-blue-800 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningObjective;
