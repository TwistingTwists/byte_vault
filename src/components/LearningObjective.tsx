import React, { useState } from 'react';

interface LearningObjectiveProps {
  question: string;
  children: React.ReactNode;
}

const LearningObjective: React.FC<LearningObjectiveProps> = ({ question, children }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl overflow-hidden">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 p-3 bg-blue-100 rounded-lg">
            <svg 
              className="w-6 h-6 text-blue-600" 
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              After reading this, you will be able to answer:
            </h3>
            <p className="text-xl font-medium text-blue-900">
              {question}
            </p>
          </div>
        </div>
        
        <div 
          className={`
            transition-all duration-500 ease-in-out 
            ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <div className="pt-4 border-t border-blue-100">
            {children}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="
            inline-flex items-center gap-2 px-4 py-2
            text-sm font-medium text-blue-700
            bg-blue-100 rounded-lg
            transition-all duration-200
            hover:bg-blue-200
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          "
        >
          {isExpanded ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide Answer
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show Answer
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default LearningObjective;
