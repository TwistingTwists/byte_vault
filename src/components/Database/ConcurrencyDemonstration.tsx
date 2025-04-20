// src/components/Database/ConcurrencyDemonstration.tsx

import React, { useState } from 'react';
import DirtyReadsTimeline from './DirtyReadsTimeline';
import DirtyWritesTimeline from './DirtyWritesTimeline';

const ConcurrencyDemonstration: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'dirty-read' | 'dirty-write'>('dirty-read');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            Database Concurrency Issues
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Interactive demonstrations of common database transaction anomalies that can occur without proper isolation levels
          </p>
        </header>

        {/* Demo selector */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              onClick={() => setActiveDemo('dirty-read')}
              className={`px-5 py-2.5 text-sm font-medium rounded-l-lg ${
                activeDemo === 'dirty-read'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Dirty Read Demo
            </button>
            <button
              onClick={() => setActiveDemo('dirty-write')}
              className={`px-5 py-2.5 text-sm font-medium rounded-r-lg ${
                activeDemo === 'dirty-write'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Dirty Write Demo
            </button>
          </div>
        </div>

        {/* Content area */}
        {activeDemo === 'dirty-read' ? <DirtyReadsTimeline /> : <DirtyWritesTimeline />}

        {/* Footer with info */}
        <footer className="text-center mt-16 mb-8 text-gray-400 text-sm">
          <p>
            These demonstrations illustrate why proper transaction isolation levels are crucial
            for maintaining data consistency in concurrent database systems.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ConcurrencyDemonstration;