import React, { useState } from 'react';

interface LearningObjectiveProps {
  question: string;
  children: React.ReactNode;
}

const LearningObjective: React.FC<LearningObjectiveProps> = ({ question, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg overflow-hidden shadow-sm">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-md">
            <svg 
              className="w-4 h-4 text-blue-600" 
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
          <div className="flex-grow">
            <h3 className="text-sm font-medium text-gray-700">
              After reading this section:
            </h3>
            <p className="text-base font-medium text-blue-900">
              {question}
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="
              flex items-center gap-1 px-2 py-1
              text-xs font-medium text-blue-600
              hover:text-blue-800
              transition-colors duration-200
              focus:outline-none
            "
          >
            {isExpanded ? (
              <>
                Hide
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Show
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
        
        <div 
          className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="pt-2 border-t border-blue-100 text-sm text-gray-700">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningObjective;
