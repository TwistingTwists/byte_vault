// src/components/Database/DirtyReadsTimeline.tsx

import React, { useState, useCallback } from 'react';

// --- Type Definitions ---
interface AnimationStateType {
  isRunning: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
}

interface DbDataState {
  key: string;
  committedValue: string;
  uncommittedValue: string | null;
  writerTx: 'T1' | 'T2' | null; // Which Tx holds the uncommitted write
}

interface TransactionState {
  status: 'idle' | 'reading' | 'writing' | 'holding_read' | 'holding_uncommitted_write' | 'committed' | 'error_dirty_read';
  lastReadValue: string | null;
  isDirtyRead: boolean; // Flag specifically for the dirty read state
}

interface SystemStateType {
  dbData: DbDataState;
  transaction1: TransactionState;
  transaction2: TransactionState;
}

// --- Component ---
const DirtyReadsTimeline: React.FC = () => {
  const [animationState, setAnimationState] = useState<AnimationStateType>({
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: 7, // Steps 0 through 6 for Dirty Read scenario
    speed: 1,
  });

  const [systemState, setSystemState] = useState<SystemStateType>({
    dbData: { key: 'name', committedValue: 'abhishek', uncommittedValue: null, writerTx: null },
    transaction1: { status: 'idle', lastReadValue: null, isDirtyRead: false },
    transaction2: { status: 'idle', lastReadValue: null, isDirtyRead: false },
  });

  const [currentStatus, setCurrentStatus] = useState<string>("Ready to visualize Dirty Read.");

  // Define the animation steps and their effects on system state
  const animationSteps = [
    // Step 0: Initial State
    {
      action: () => {
        resetSimulation();
        return "Initial State: Database 'name' = 'abhishek'. Transactions Idle.";
      }
    },
    // Step 1: T1 Reads Initial Value
    {
      action: () => {
        setSystemState(prev => ({
          ...prev,
          transaction1: { 
            ...prev.transaction1, 
            status: 'holding_read', 
            lastReadValue: prev.dbData.committedValue 
          }
        }));
        return `T1: Reads 'name'. Value = '${systemState.dbData.committedValue}' (Committed).`;
      }
    },
    // Step 2: T2 Begins Write Operation
    {
      action: () => {
        setSystemState(prev => ({
          ...prev,
          transaction2: { ...prev.transaction2, status: 'writing' }
        }));
        return `T2: Begins writing 'john' to 'name'.`;
      }
    },
    // Step 3: T2 Completes Write (Uncommitted)
    {
      action: () => {
        setSystemState(prev => ({
          ...prev,
          dbData: {
            ...prev.dbData,
            uncommittedValue: 'john',
            writerTx: 'T2'
          },
          transaction2: { ...prev.transaction2, status: 'holding_uncommitted_write' }
        }));
        return `T2: Finishes writing. 'name' now has uncommitted value 'john'.`;
      }
    },
    // Step 4: T1 Reads Again (Dirty Read!)
    {
      action: () => {
        const valueRead = systemState.dbData.uncommittedValue ?? systemState.dbData.committedValue;
        const isDirty = systemState.dbData.uncommittedValue !== null;
        
        setSystemState(prev => ({
          ...prev,
          transaction1: {
            ...prev.transaction1,
            status: isDirty ? 'error_dirty_read' : 'holding_read',
            lastReadValue: valueRead,
            isDirtyRead: isDirty
          }
        }));

        const statusMessage = `T1: Reads 'name' again. Value = '${valueRead}'.`;
        return isDirty
          ? `${statusMessage} *** DIRTY READ! *** (Reading uncommitted data from T2)`
          : `${statusMessage} (Committed)`;
      }
    },
    // Step 5: T2 Commits its Write
    {
      action: () => {
        setSystemState(prev => ({
          ...prev,
          dbData: {
            ...prev.dbData,
            committedValue: prev.dbData.uncommittedValue ?? prev.dbData.committedValue,
            uncommittedValue: null,
            writerTx: null
          },
          transaction2: { ...prev.transaction2, status: 'committed' }
        }));
        return `T2: Commits the write. 'name' is now permanently 'john'.`;
      }
    },
    // Step 6: T1 Commits (Potentially Based on Dirty Data)
    {
      action: () => {
        setSystemState(prev => ({
          ...prev,
          transaction1: { ...prev.transaction1, status: 'committed', isDirtyRead: false }
        }));
        return `T1: Commits. (Note: T1's logic might have been based on the dirty value '${systemState.transaction1.lastReadValue}')`;
      }
    },
    // Step 7: End State
    {
      action: () => {
        setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false }));
        return "Simulation Complete. Final committed value for 'name' is 'john'.";
      }
    }
  ];

  // Reset simulation to initial state
  const resetSimulation = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false, currentStep: 0 }));
    const initialDbState = { key: 'name', committedValue: 'abhishek', uncommittedValue: null, writerTx: null };
    const initialTxState: TransactionState = { status: 'idle', lastReadValue: null, isDirtyRead: false };
    
    setSystemState({
      dbData: initialDbState,
      transaction1: { ...initialTxState },
      transaction2: { ...initialTxState },
    });
    
    setCurrentStatus("Simulation Reset. Ready to visualize Dirty Read.");
  }, []);

  // Update animation step
  const updateAnimationStep = useCallback(() => {
    const { currentStep, totalSteps } = animationState;

    if (currentStep < totalSteps) {
      if (animationSteps[currentStep]) {
        const stepResult = animationSteps[currentStep].action();
        setCurrentStatus(stepResult || `Executing step ${currentStep + 1}...`);
        setAnimationState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
      } else {
        console.error("Animation step not found:", currentStep);
        setAnimationState(prev => ({ ...prev, isRunning: false }));
      }
    } else {
      if (animationState.isRunning) {
        setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false }));
      }
    }
  }, [animationState, animationSteps]);

  // Control handlers
  const handlePlay = useCallback(() => {
    if (animationState.currentStep >= animationState.totalSteps) {
      resetSimulation();
      setTimeout(() => {
        setAnimationState(prev => ({ ...prev, isRunning: true, isPaused: false }));
        updateAnimationStep();
      }, 100);
    } else {
      setAnimationState(prev => ({ ...prev, isRunning: true, isPaused: false }));
      updateAnimationStep();
    }
  }, [animationState.currentStep, animationState.totalSteps, resetSimulation, updateAnimationStep]);

  const handlePause = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const handleStep = useCallback(() => {
    if (!animationState.isRunning && animationState.currentStep < animationState.totalSteps) {
      setAnimationState(prev => ({ ...prev, isPaused: true }));
      updateAnimationStep();
    }
  }, [animationState.isRunning, animationState.currentStep, animationState.totalSteps, updateAnimationStep]);

  const handleSpeedChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAnimationState(prev => ({ ...prev, speed: parseFloat(event.target.value) }));
  }, []);

  // Timeline visualization component
  const TimelineVisualization = () => {
    const timelineSteps = animationSteps.length;
    const currentStep = animationState.currentStep;
    
    // Generate timeline events based on animation steps
    const events = [
      { step: 0, tx: null, action: "Initial State", position: 0 },
      { step: 1, tx: "T1", action: "Read", position: 1 },
      { step: 2, tx: "T2", action: "Begin Write", position: 2 },
      { step: 3, tx: "T2", action: "Write (Uncommitted)", position: 3 },
      { step: 4, tx: "T1", action: "Dirty Read", position: 4, highlight: true },
      { step: 5, tx: "T2", action: "Commit", position: 5 },
      { step: 6, tx: "T1", action: "Commit", position: 6 },
      { step: 7, tx: null, action: "Final State", position: 7 },
    ];

    return (
      <div className="w-full mt-8 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600">Transaction Timeline</h3>
        <div className="relative h-48 bg-gray-900 rounded-lg border border-gray-600 overflow-hidden p-4 mx-4 my-2">
          {/* Timeline base line */}
          <div className="absolute top-1/2 left-12 right-12 h-1 bg-gray-600 rounded-full"></div>
          
          {/* T1 and T2 swim lanes */}
          <div className="absolute top-1/4 left-12 right-12 h-0.5 bg-gray-700 opacity-50"></div>
          <div className="absolute top-3/4 left-12 right-12 h-0.5 bg-gray-700 opacity-50"></div>
          
          {/* Transaction labels */}
          <div className="absolute top-1/4 left-4 transform -translate-y-1/2 text-sm font-bold text-cyan-400 px-1.5 py-1 bg-gray-800/90 rounded-md shadow-sm">T1</div>
          <div className="absolute top-3/4 left-4 transform -translate-y-1/2 text-sm font-bold text-orange-400 px-1.5 py-1 bg-gray-800/90 rounded-md shadow-sm">T2</div>
          
          {/* Event markers */}
          {events.map((event, index) => {
            // Calculate position with margins for the first and last items
            const leftMargin = 12; // 3rem in percentage
            const rightMargin = 12; // 3rem in percentage
            const usableWidth = 100 - leftMargin - rightMargin;
            const position = `${leftMargin + (event.position / (timelineSteps)) * usableWidth}%`;
            
            const isActive = currentStep > event.step;
            const isCurrent = currentStep === event.step;
            
            // Determine which lane to use
            let top = '50%'; // Default center
            if (event.tx === 'T1') top = '25%';
            if (event.tx === 'T2') top = '75%';
            
            // Determine colors based on transaction and state
            let bgColor = 'bg-gray-500';
            let textColor = 'text-white';
            
            if (event.tx === 'T1') {
              bgColor = isActive ? 'bg-cyan-500' : 'bg-cyan-800';
              if (event.highlight) bgColor = isActive ? 'bg-yellow-500' : 'bg-yellow-800';
            } else if (event.tx === 'T2') {
              bgColor = isActive ? 'bg-orange-500' : 'bg-orange-800';
            } else {
              bgColor = isActive ? 'bg-indigo-500' : 'bg-indigo-800';
            }
            
            if (isCurrent) {
              bgColor = bgColor.replace('500', '400').replace('800', '600');
            }
            
            return (
              <div key={index} 
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center`}
                style={{ left: position, top }}>
                {/* Event marker */}
                <div className={`w-5 h-5 rounded-full ${bgColor} ${isCurrent ? 'ring-2 ring-white shadow-lg scale-125' : ''} shadow-md flex items-center justify-center`}>
                  {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                </div>
                
                {/* Event label - alternate above/below to avoid overlap */}
                <div className={`absolute whitespace-nowrap text-sm font-medium ${textColor} px-2.5 py-1.5 rounded-md ${top === '25%' ? 'bottom-8' : 'top-8'} ${bgColor.replace('bg-', 'bg-')}/30 backdrop-blur-sm border border-gray-700/50 shadow-md ${isCurrent ? 'font-bold' : ''}`}>
                  {event.action}
                </div>
                
                {/* Vertical connector line */}
                {event.tx && (
                  <div className={`absolute h-20 w-0.5 ${bgColor} opacity-70`}
                    style={{ top: top === '25%' ? '0%' : '-100%' }}></div>
                )}
              </div>
            );
          })}
          
          {/* Progress indicator */}
          <div className="absolute top-0 left-0 h-full bg-indigo-900 opacity-20"
            style={{ width: `${(currentStep / timelineSteps) * 100}%` }}></div>
        </div>
        
        {/* Timeline legend */}
        <div className="flex flex-wrap justify-center items-center gap-6 mt-4 text-sm text-white">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
            <span>T1 Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span>T2 Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Dirty Read</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
            <span>System Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-white ring-1 ring-white"></div>
            <span>Current Step</span>
          </div>
        </div>
      </div>
    );
  };

  // Database State Visualization component
  const DatabaseStateVisualization = () => {
    const { dbData, transaction1, transaction2 } = systemState;
    const currentStep = animationState.currentStep;
    
    // Determine transaction states
    const t1State = transaction1.status;
    const t2State = transaction2.status;
    const isDirtyRead = transaction1.isDirtyRead;
    
    return (
      <div className="w-full mt-6 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600">Database State</h3>
        
        {/* Database visualization */}
        <div className="flex justify-center mb-8">
          <div className="relative bg-gray-900 rounded-lg border border-gray-600 p-6 w-64 shadow-lg">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold">
              Database
            </div>
            
            {/* Table visualization */}
            <table className="w-full text-white border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-700 py-2 text-left">Key</th>
                  <th className="border-b border-gray-700 py-2 text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 font-mono">{dbData.key}</td>
                  <td className="py-2 font-mono">
                    <span className="text-blue-400">{dbData.committedValue}</span>
                    <span className="text-xs ml-1 text-blue-300">(committed)</span>
                  </td>
                </tr>
                {dbData.uncommittedValue && (
                  <tr className="bg-red-900/20">
                    <td className="py-2 font-mono">{dbData.key}</td>
                    <td className="py-2 font-mono">
                      <span className="text-red-400">{dbData.uncommittedValue}</span>
                      <span className="text-xs ml-1 text-red-300">(uncommitted by {dbData.writerTx})</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Transactions state */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Transaction 1 */}
          <div className={`relative bg-gray-900 rounded-lg border ${isDirtyRead ? 'border-yellow-500' : 'border-gray-600'} p-4 shadow-lg`}>
            <div className={`absolute -top-3 left-4 ${isDirtyRead ? 'bg-yellow-500' : 'bg-cyan-600'} text-white px-3 py-1 rounded-md text-sm font-bold`}>
              Transaction 1
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${getStatusColor(t1State)}`}>{formatStatus(t1State)}</span>
              </div>
              
              {transaction1.lastReadValue && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Last Read:</span>
                  <span className={`font-mono ${isDirtyRead ? 'text-yellow-400' : 'text-white'}`}>
                    '{transaction1.lastReadValue}'
                    {isDirtyRead && <span className="ml-1 text-xs text-yellow-300">(dirty!)</span>}
                  </span>
                </div>
              )}
              
              {/* Visual indicator for dirty read */}
              {isDirtyRead && (
                <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-300 text-sm">
                  <span className="font-bold">⚠️ Dirty Read:</span> Reading uncommitted data from T2
                </div>
              )}
            </div>
          </div>
          
          {/* Transaction 2 */}
          <div className="relative bg-gray-900 rounded-lg border border-gray-600 p-4 shadow-lg">
            <div className="absolute -top-3 left-4 bg-orange-600 text-white px-3 py-1 rounded-md text-sm font-bold">
              Transaction 2
            </div>
            
            <div className="mt-3">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Status:</span>
                <span className={`font-medium ${getStatusColor(t2State)}`}>{formatStatus(t2State)}</span>
              </div>
              
              {dbData.writerTx === 'T2' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Writing:</span>
                  <span className="font-mono text-orange-400">'{dbData.uncommittedValue}'</span>
                </div>
              )}
              
              {/* Visual indicator for transaction holding uncommitted write */}
              {t2State === 'holding_uncommitted_write' && (
                <div className="mt-3 p-2 bg-orange-900/30 border border-orange-800 rounded text-orange-300 text-sm">
                  <span className="font-bold">🔒 Lock:</span> Holding write lock on '{dbData.key}'
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Helper functions for formatting
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'reading': return 'Reading';
      case 'writing': return 'Writing';
      case 'holding_read': return 'Holding Read';
      case 'holding_uncommitted_write': return 'Holding Uncommitted Write';
      case 'committed': return 'Committed';
      case 'error_dirty_read': return 'DIRTY READ ERROR';
      default: return status;
    }
  };
  
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'idle': return 'text-gray-300';
      case 'reading': 
      case 'holding_read': return 'text-cyan-400';
      case 'writing':
      case 'holding_uncommitted_write': return 'text-orange-400';
      case 'committed': return 'text-green-400';
      case 'error_dirty_read': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  // Render method
  return (
    <div className="flex flex-col items-center p-4 min-h-screen bg-gradient-to-br from-gray-800 to-indigo-900 font-sans">
      <h2 className="text-3xl font-bold mb-5 text-white shadow-sm px-4 py-1 rounded bg-black/30">
        Concurrency Issue: Dirty Read Visualization
      </h2>

      {/* Controls Area */}
      <div className="w-full max-w-4xl flex flex-wrap justify-center items-center gap-3 mb-4 p-3 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
        {/* Buttons */}
        <button 
          onClick={handlePlay} 
          disabled={animationState.isRunning && !animationState.isPaused} 
          className="px-5 py-2 text-base bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
        >
          {animationState.currentStep >= animationState.totalSteps ? 'Replay' : (animationState.isPaused ? 'Resume' : 'Play')}
        </button>
        <button 
          onClick={handlePause} 
          disabled={!animationState.isRunning || animationState.isPaused} 
          className="px-5 py-2 text-base bg-yellow-500 text-white font-semibold rounded-md shadow hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
        >
          Pause
        </button>
        <button 
          onClick={handleStep} 
          disabled={animationState.isRunning || animationState.currentStep >= animationState.totalSteps} 
          className="px-5 py-2 text-base bg-green-500 text-white font-semibold rounded-md shadow hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
        >
          Step Forward
        </button>
        <button 
          onClick={resetSimulation} 
          className="px-5 py-2 text-base bg-red-500 text-white font-semibold rounded-md shadow hover:bg-red-600 transition-all duration-150 ease-in-out"
        >
          Reset
        </button>
        {/* Speed Control */}
        <div className="flex items-center gap-2 ml-4 p-2 bg-gray-700 rounded border border-gray-600">
          <label htmlFor="speedControl" className="text-sm font-medium text-white whitespace-nowrap">Anim Speed:</label>
          <input 
            type="range" 
            id="speedControl" 
            min="0.2" 
            max="5" 
            step="0.1" 
            value={animationState.speed} 
            onChange={handleSpeedChange} 
            className="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-sm font-medium text-white w-8 text-right">{animationState.speed.toFixed(1)}x</span>
        </div>
      </div>

      {/* Status Display Area */}
      <div className="w-full max-w-4xl mt-1 p-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md text-center border border-gray-700">
        <p className="font-medium text-white text-lg leading-tight">
          <span className="font-bold text-indigo-300">Status:</span> {currentStatus}
          <span className="ml-6 text-gray-300 text-base">(Step: {animationState.currentStep}/{animationState.totalSteps})</span>
        </p>
      </div>
      
      {/* Database State Visualization */}
      <div className="w-full max-w-4xl">
        <DatabaseStateVisualization />
      </div>
      
      {/* Timeline Visualization */}
      <div className="w-full max-w-4xl">
        <TimelineVisualization />
      </div>
    </div>
  );
};

export default DirtyReadsTimeline;
