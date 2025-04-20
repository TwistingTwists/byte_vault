I'll create a component for visualizing dirty writes while abstracting common elements that can be reused for future concurrency issue visualizations like lost writes, write skew, etc.

Let's start by breaking down the existing component and identifying the common elements that we can extract:

1. **Common Components**:
   - Animation state management
   - Timeline visualization
   - Database state visualization
   - Control buttons
   - System state management

2. **Specific Components**:
   - Dirty Read scenario steps
   - Dirty Write scenario steps

Here's how I'll structure the files:

1. `types.ts` - Common types
2. `useAnimationState.ts` - Custom hook for animation state
3. `useSystemState.ts` - Custom hook for system state
4. `TimelineVisualization.tsx` - Timeline visualization component
5. `DatabaseStateVisualization.tsx` - Database state visualization component
6. `ControlPanel.tsx` - Control buttons component
7. `DirtyReadsTimeline.tsx` - Refactored existing component for dirty reads
8. `DirtyWritesTimeline.tsx` - New component for dirty writes

Let's create these files one by one:

## 1. types.ts

```typescript
// src/components/Database/types.ts

export interface AnimationStateType {
  isRunning: boolean;
  isPaused: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
}

export interface DbDataState {
  key: string;
  committedValue: string;
  uncommittedValue: string | null;
  writerTx: 'T1' | 'T2' | null; // Which Tx holds the uncommitted write
}

export interface TransactionState {
  status: 'idle' | 'reading' | 'writing' | 'holding_read' | 'holding_uncommitted_write' | 'committed' | 'error_dirty_read' | 'error_dirty_write';
  lastReadValue: string | null;
  lastWriteValue: string | null;
  isDirtyRead: boolean;
  isDirtyWrite: boolean;
}

export interface SystemStateType {
  dbData: DbDataState;
  transaction1: TransactionState;
  transaction2: TransactionState;
}

export interface TimelineEvent {
  step: number;
  tx: 'T1' | 'T2' | null;
  action: string;
  position: number;
  highlight?: boolean;
}

export interface AnimationStep {
  action: () => string;
}
```

## 2. useAnimationState.ts

```typescript
// src/components/Database/hooks/useAnimationState.ts

import { useState, useCallback } from 'react';
import { AnimationStateType } from '../types';

export const useAnimationState = (totalSteps: number) => {
  const [animationState, setAnimationState] = useState<AnimationStateType>({
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: totalSteps,
    speed: 1,
  });

  const handleSpeedChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAnimationState(prev => ({ ...prev, speed: parseFloat(event.target.value) }));
  }, []);

  const resetAnimation = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false, currentStep: 0 }));
  }, []);

  const startAnimation = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: true, isPaused: false }));
  }, []);

  const pauseAnimation = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const stepForward = useCallback(() => {
    setAnimationState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  const setTotalSteps = useCallback((steps: number) => {
    setAnimationState(prev => ({ ...prev, totalSteps: steps }));
  }, []);

  return {
    animationState,
    setAnimationState,
    handleSpeedChange,
    resetAnimation,
    startAnimation,
    pauseAnimation,
    stepForward,
    setTotalSteps
  };
};
```

## 3. useSystemState.ts

```typescript
// src/components/Database/hooks/useSystemState.ts

import { useState, useCallback } from 'react';
import { SystemStateType, TransactionState } from '../types';

export const useSystemState = (initialKey: string, initialValue: string) => {
  const initialTxState: TransactionState = { 
    status: 'idle', 
    lastReadValue: null, 
    lastWriteValue: null,
    isDirtyRead: false,
    isDirtyWrite: false
  };

  const [systemState, setSystemState] = useState<SystemStateType>({
    dbData: { 
      key: initialKey, 
      committedValue: initialValue, 
      uncommittedValue: null, 
      writerTx: null 
    },
    transaction1: { ...initialTxState },
    transaction2: { ...initialTxState },
  });

  const resetSystem = useCallback(() => {
    setSystemState({
      dbData: { 
        key: initialKey, 
        committedValue: initialValue, 
        uncommittedValue: null, 
        writerTx: null 
      },
      transaction1: { ...initialTxState },
      transaction2: { ...initialTxState },
    });
  }, [initialKey, initialValue]);

  return {
    systemState,
    setSystemState,
    resetSystem
  };
};
```

## 4. TimelineVisualization.tsx

```typescript
// src/components/Database/TimelineVisualization.tsx

import React, { useState, useEffect } from 'react';
import { AnimationStateType, TimelineEvent } from './types';

interface TimelineVisualizationProps {
  events: TimelineEvent[];
  animationState: AnimationStateType;
  title?: string;
}

const TimelineVisualization: React.FC<TimelineVisualizationProps> = ({ 
  events, 
  animationState,
  title = "Transaction Timeline" 
}) => {
  const [showLegend, setShowLegend] = useState(true);
  const { currentStep, totalSteps } = animationState;
  
  // Hide legend after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLegend(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full mt-2 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
      <h3 className="text-xl font-bold text-white mb-4 pb-2 border-b border-gray-600/50">{title}</h3>
      
      {/* Timeline legend */}
      <div className={`flex flex-wrap justify-center items-center gap-4 mb-4 text-xs text-white/90 transition-all duration-300 
        ${showLegend ? 'opacity-100 -translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-[0_0_6px_0_rgba(34,211,238,0.4)]"></div>
          <span>T1 Events</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_0_rgba(249,115,22,0.4)]"></div>
          <span>T2 Events</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-[0_0_8px_0_rgba(234,179,8,0.4)]"></div>
          <span>Concurrency Issue</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_0_rgba(99,102,241,0.4)]"></div>
          <span>System Events</span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-md bg-gray-800/30 border border-gray-700/30">
          <div className="w-2.5 h-2.5 rounded-full bg-white ring-1 ring-white/30"></div>
          <span>Current Step</span>
        </div>
      </div>

      <div 
        className="relative h-52 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-700/50 overflow-hidden px-8 py-6 mx-4 my-2 group"
        onMouseEnter={() => setShowLegend(true)}
        onMouseLeave={() => setShowLegend(false)}
      >
        {/* Timeline base line */}
        <div className="absolute top-1/2 left-16 right-16 h-[2px] bg-gray-700/50 rounded-full"></div>
        
        {/* T1 and T2 swim lanes */}
        <div className="absolute top-1/3 left-16 right-16 h-[2px] bg-gray-700/30"></div>
        <div className="absolute top-2/3 left-16 right-16 h-[2px] bg-gray-700/30"></div>
        
        {/* T1 and T2 progress fills */}
        {(() => {
          const t1Events = events.filter(e => e.tx === 'T1');
          const t2Events = events.filter(e => e.tx === 'T2');
          
          const getProgressWidth = (events: typeof t1Events) => {
            for (let i = events.length - 1; i >= 0; i--) {
              if (events[i].step < currentStep) {
                const position = events[i].position;
                return `${(position / (totalSteps - 1)) * 100}%`;
              }
            }
            return '0%';
          };

          return (
            <>
              {/* T1 Progress */}
              <div 
                className="absolute top-1/3 left-16 h-[2px] bg-cyan-500/50 backdrop-blur transition-all duration-300 shadow-[0_0_8px_0_rgba(34,211,238,0.4)]"
                style={{ width: getProgressWidth(t1Events) }}
              />
              {/* T2 Progress */}
              <div 
                className="absolute top-2/3 left-16 h-[2px] bg-orange-500/50 backdrop-blur transition-all duration-300 shadow-[0_0_8px_0_rgba(249,115,22,0.4)]"
                style={{ width: getProgressWidth(t2Events) }}
              />
            </>
          );
        })()}

        {/* Transaction labels */}
        <div className="absolute top-1/3 left-6 -translate-y-1/2 text-sm font-medium text-cyan-400/90 px-2 py-1 rounded-md bg-cyan-950/30 border border-cyan-500/20 shadow-sm">T1</div>
        <div className="absolute top-2/3 left-6 -translate-y-1/2 text-sm font-medium text-orange-400/90 px-2 py-1 rounded-md bg-orange-950/30 border border-orange-500/20 shadow-sm">T2</div>

        {/* Event markers */}
        {events.map((event, index) => {
          const leftMargin = 16;
          const rightMargin = 16;
          const usableWidth = 100 - leftMargin - rightMargin;
          const position = `${leftMargin + (event.position / (totalSteps)) * usableWidth}%`;
          
          const isActive = currentStep > event.step;
          const isCurrent = currentStep === event.step;
          
          let top = '50%';
          if (event.tx === 'T1') top = '33.333%';
          if (event.tx === 'T2') top = '66.667%';
          
          let bgColor = 'bg-gray-500';
          let glowColor = '';
          let textColor = 'text-white';
          
          if (event.tx === 'T1') {
            bgColor = isActive ? 'bg-cyan-500' : 'bg-cyan-800/50';
            glowColor = 'shadow-[0_0_8px_0_rgba(34,211,238,0.4)]';
            if (event.highlight) {
              bgColor = isActive ? 'bg-yellow-500' : 'bg-yellow-800/50';
              glowColor = 'shadow-[0_0_8px_0_rgba(234,179,8,0.4)]';
            }
          } else if (event.tx === 'T2') {
            bgColor = isActive ? 'bg-orange-500' : 'bg-orange-800/50';
            glowColor = 'shadow-[0_0_8px_0_rgba(249,115,22,0.4)]';
            if (event.highlight) {
              bgColor = isActive ? 'bg-yellow-500' : 'bg-yellow-800/50';
              glowColor = 'shadow-[0_0_8px_0_rgba(234,179,8,0.4)]';
            }
          } else {
            bgColor = isActive ? 'bg-indigo-500' : 'bg-indigo-800/50';
            glowColor = 'shadow-[0_0_8px_0_rgba(99,102,241,0.4)]';
          }
          
          if (isCurrent) {
            bgColor = bgColor.replace('500', '400').replace('800', '600');
          }
          
          return (
            <div key={index} 
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: position, top }}>
              {/* Event marker */}
              <div className={`w-4 h-4 rounded-full ${bgColor} ${glowColor} ${isCurrent ? 'ring-2 ring-white/30 scale-125' : ''} shadow-md flex items-center justify-center backdrop-blur-sm transition-all duration-300`}>
                {isCurrent && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
              </div>
              
              {/* Event label */}
              <div className={`absolute whitespace-nowrap text-xs font-medium ${textColor} px-2.5 py-1.5 rounded-lg 
                ${top === '33.333%' ? 'bottom-7' : 'top-7'} 
                ${bgColor.replace('bg-', 'bg-')}/10 backdrop-blur-sm 
                border border-gray-700/30 shadow-lg 
                ${isCurrent ? 'font-bold scale-105' : ''} 
                transition-all duration-300`}>
                {event.action}
              </div>
              
              {/* Vertical connector line */}
              {event.tx && (
                <div className={`absolute h-16 w-[1px] ${bgColor.replace('bg-', 'bg-')}/30 backdrop-blur-sm`}
                  style={{ top: top === '33.333%' ? '0%' : '-100%' }}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TimelineVisualization;
```

## 5. DatabaseStateVisualization.tsx

```typescript
// src/components/Database/DatabaseStateVisualization.tsx

import React from 'react';
import { SystemStateType, AnimationStateType } from './types';

interface DatabaseStateVisualizationProps {
  systemState: SystemStateType;
  animationState: AnimationStateType;
  currentStatus: string;
  issueType: 'dirty-read' | 'dirty-write' | 'lost-update' | 'write-skew';
}

const DatabaseStateVisualization: React.FC<DatabaseStateVisualizationProps> = ({
  systemState,
  animationState,
  currentStatus,
  issueType
}) => {
  const { dbData, transaction1, transaction2 } = systemState;
  const currentStep = animationState.currentStep;
  
  // Determine transaction states
  const t1State = transaction1.status;
  const t2State = transaction2.status;
  const isDirtyRead = transaction1.isDirtyRead;
  const isDirtyWrite = transaction1.isDirtyWrite || transaction2.isDirtyWrite;
  
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
      case 'error_dirty_write': return 'DIRTY WRITE ERROR';
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
      case 'error_dirty_write': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="w-full mt-2 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
      {/* Table visualization always on top */}
      <div className="flex justify-center mb-8">
        <div className="relative bg-gray-900 rounded-lg border border-gray-600 p-6 w-full max-w-md shadow-lg">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold">
            Database
          </div>
          
          {/* Table visualization */}
          <table className="w-full text-white border-collapse">
            <thead>
              <tr>
                <th className="border-b border-gray-700 py-2 text-left w-1/3">Key</th>
                <th className="border-b border-gray-700 py-2 text-left w-2/3">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 font-mono">{dbData.key}</td>
                <td className="py-2 font-mono flex items-center gap-2">
                  <span className="text-blue-400 whitespace-nowrap">{dbData.committedValue}</span>
                  <span className="text-xs text-blue-300 whitespace-nowrap">(committed)</span>
                </td>
              </tr>
              {dbData.uncommittedValue && (
                <tr className="bg-red-900/20">
                  <td className="py-2 font-mono">{dbData.key}</td>
                  <td className="py-2 font-mono flex items-center gap-2">
                    <span className="text-red-400 whitespace-nowrap">{dbData.uncommittedValue}</span>
                    <span className="text-xs text-red-300 whitespace-nowrap">(uncommitted by {dbData.writerTx})</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Status Display Area */}
      <div className="w-full max-w-4xl mb-4 p-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md text-center border border-gray-700 mx-auto">
        <p className="font-medium text-white text-lg leading-tight">
          <span className="font-bold text-indigo-300">Status:</span> {currentStatus}
          <span className="ml-6 text-gray-300 text-base">(Step: {animationState.currentStep}/{animationState.totalSteps})</span>
        </p>
      </div>
      {/* Transactions state */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transaction 1 */}
        <div className={`relative bg-gray-900 rounded-lg border ${
          isDirtyRead || (isDirtyWrite && transaction1.isDirtyWrite) ? 'border-yellow-500' : 'border-gray-600'
        } p-4 shadow-lg`}>
          <div className={`absolute -top-3 left-4 ${
            isDirtyRead || (isDirtyWrite && transaction1.isDirtyWrite) ? 'bg-yellow-500' : 'bg-cyan-600'
          } text-white px-3 py-1 rounded-md text-sm font-bold`}>
            Transaction 1
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${getStatusColor(t1State)}`}>{formatStatus(t1State)}</span>
            </div>
            
            {transaction1.lastReadValue && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Last Read:</span>
                <span className={`font-mono ${isDirtyRead ? 'text-yellow-400' : 'text-white'}`}>
                  '{transaction1.lastReadValue}'
                  {isDirtyRead && <span className="ml-1 text-xs text-yellow-300">(dirty!)</span>}
                </span>
              </div>
            )}
            
            {transaction1.lastWriteValue && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Write:</span>
                <span className={`font-mono ${transaction1.isDirtyWrite ? 'text-yellow-400' : 'text-white'}`}>
                  '{transaction1.lastWriteValue}'
                  {transaction1.isDirtyWrite && <span className="ml-1 text-xs text-yellow-300">(dirty!)</span>}
                </span>
              </div>
            )}
            
            {/* Visual indicator for dirty read/write */}
            {isDirtyRead && issueType === 'dirty-read' && (
              <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-300 text-sm">
                <span className="font-bold">⚠️ Dirty Read:</span> Reading uncommitted data from T2
              </div>
            )}
            
            {transaction1.isDirtyWrite && issueType === 'dirty-write' && (
              <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-300 text-sm">
                <span className="font-bold">⚠️ Dirty Write:</span> Writing over uncommitted data from T2
              </div>
            )}
          </div>
        </div>
        
        {/* Transaction 2 */}
        <div className={`relative bg-gray-900 rounded-lg border ${
          isDirtyWrite && transaction2.isDirtyWrite ? 'border-yellow-500' : 'border-gray-600'
        } p-4 shadow-lg`}>
          <div className={`absolute -top-3 left-4 ${
            isDirtyWrite && transaction2.isDirtyWrite ? 'bg-yellow-500' : 'bg-orange-600'
          } text-white px-3 py-1 rounded-md text-sm font-bold`}>
            Transaction 2
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${getStatusColor(t2State)}`}>{formatStatus(t2State)}</span>
            </div>
            
            {transaction2.lastReadValue && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Last Read:</span>
                <span className="font-mono text-white">'{transaction2.lastReadValue}'</span>
              </div>
            )}
            
            {transaction2.lastWriteValue && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Write:</span>
                <span className={`font-mono ${transaction2.isDirtyWrite ? 'text-yellow-400' : 'text-white'}`}>
                  '{transaction2.lastWriteValue}'
                  {transaction2.isDirtyWrite && <span className="ml-1 text-xs text-yellow-300">(dirty!)</span>}
                </span>
              </div>
            )}
            
            {/* Visual indicator for transaction holding uncommitted write */}
            {t2State === 'holding_uncommitted_write' && (
              <div className="mt-3 p-2 bg-orange-900/30 border border-orange-800 rounded text-orange-300 text-sm">
                <span className="font-bold">🔒 Lock:</span> Holding write lock on '{dbData.key}'
              </div>
            )}
            
            {/* Visual indicator for dirty write */}
            {transaction2.isDirtyWrite && issueType === 'dirty-write' && (
              <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-300 text-sm">
                <span className="font-bold">⚠️ Dirty Write:</span> Writing over uncommitted data from T1
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStateVisualization;
```

## 6. ControlPanel.tsx

```typescript
// src/components/Database/ControlPanel.tsx

import React, { useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AnimationStateType } from './types';

interface ControlPanelProps {
  animationState: AnimationStateType;
  handlePlay: () => void;
  handlePause: () => void;
  handleStep: () => void;
  handleReset: () => void;
  handleSpeedChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  animationState,
  handlePlay,
  handlePause,
  handleStep,
  handleReset,
  handleSpeedChange
}) => {
  // Refs for confetti buttons
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const stepBtnRef = useRef<HTMLButtonElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  // Ref to track if confetti has already fired for each button
  const confettiFired = useRef({ play: false, step: false, reset: false });

  // Confetti helper
  const triggerConfetti = (btnRef: React.RefObject<HTMLButtonElement>, key: 'play' | 'step' | 'reset') => {
    if (!confettiFired.current[key]) {
      const buttonElement = btnRef.current;
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x, y },
          colors: ['#22c55e', '#3b82f6', '#64748b', '#ef4444', '#a855f7'],
        });
        confettiFired.current[key] = true;
      }
    }
  };

  // Reset confetti fired state when needed
  useEffect(() => {
    if (animationState.currentStep === 0) {
      confettiFired.current = { play: false, step: false, reset: false };
    }
  }, [animationState.currentStep]);

  // Modified handlers to include confetti
  const handlePlayWithConfetti = () => {
    triggerConfetti(playBtnRef, 'play');
    handlePlay();
  };

  const handleStepWithConfetti = () => {
    triggerConfetti(stepBtnRef, 'step');
    handleStep();
  };

  const handleResetWithConfetti = () => {
    triggerConfetti(resetBtnRef, 'reset');
    handleReset();
  };

  return (
    <div className="w-full max-w-4xl flex flex-wrap justify-center items-center gap-3 mt-4 p-3 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700 sticky bottom-0 z-50">
      {/* Buttons */}
      <button 
        ref={playBtnRef}
        onClick={handlePlayWithConfetti} 
        disabled={animationState.isRunning && !animationState.isPaused} 
        className="px-5 py-2 text-base bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out relative overflow-visible"
      >
        {animationState.currentStep >= animationState.totalSteps ? 'Replay' : (animationState.isPaused ? 'Resume' : 'Play')}
      </button>
      <button 
        onClick={handlePause} 
        disabled={!animationState.isRunning || animationState.isPaused} 
        className="px-5 py-2 text-base bg-yellow-500 text-white font-semibold rounded-md shadow hover:bg-yellow-600 disabled:bg-gray-400


```


6. Control Panel.tsx *:


```typescript 

// src/components/Database/ControlPanel.tsx

import React, { useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AnimationStateType } from './types';

interface ControlPanelProps {
  animationState: AnimationStateType;
  handlePlay: () => void;
  handlePause: () => void;
  handleStep: () => void;
  handleReset: () => void;
  handleSpeedChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  animationState,
  handlePlay,
  handlePause,
  handleStep,
  handleReset,
  handleSpeedChange
}) => {
  // Refs for confetti buttons
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const stepBtnRef = useRef<HTMLButtonElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  // Ref to track if confetti has already fired for each button
  const confettiFired = useRef({ play: false, step: false, reset: false });

  // Confetti helper
  const triggerConfetti = (btnRef: React.RefObject<HTMLButtonElement>, key: 'play' | 'step' | 'reset') => {
    if (!confettiFired.current[key]) {
      const buttonElement = btnRef.current;
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x, y },
          colors: ['#22c55e', '#3b82f6', '#64748b', '#ef4444', '#a855f7'],
        });
        confettiFired.current[key] = true;
      }
    }
  };

  // Reset confetti fired state when needed
  useEffect(() => {
    if (animationState.currentStep === 0) {
      confettiFired.current = { play: false, step: false, reset: false };
    }
  }, [animationState.currentStep]);

  // Modified handlers to include confetti
  const handlePlayWithConfetti = () => {
    triggerConfetti(playBtnRef, 'play');
    handlePlay();
  };

  const handleStepWithConfetti = () => {
    triggerConfetti(stepBtnRef, 'step');
    handleStep();
  };

  const handleResetWithConfetti = () => {
    triggerConfetti(resetBtnRef, 'reset');
    handleReset();
  };

  return (
    <div className="w-full max-w-4xl flex flex-wrap justify-center items-center gap-3 mt-4 p-3 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700 sticky bottom-0 z-50">
      {/* Buttons */}
      <button 
        ref={playBtnRef}
        onClick={handlePlayWithConfetti} 
        disabled={animationState.isRunning && !animationState.isPaused} 
        className="px-5 py-2 text-base bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out relative overflow-visible"
      >
        {animationState.currentStep >= animationState.totalSteps ? 'Replay' : (animationState.isPaused ? 'Resume' : 'Play')}
      </button>
      <button 
        onClick={handlePause} 
        disabled={!animationState.isRunning || animationState.isPaused} 
        className="px-5 py-2 text-base bg-yellow-500 text-white font-semibold rounded-md shadow hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150"
      >
        Pause
      </button>
      <button 
        ref={stepBtnRef}
        onClick={handleStepWithConfetti} 
        disabled={animationState.isRunning || animationState.currentStep >= animationState.totalSteps} 
        className="px-5 py-2 text-base bg-purple-600 text-white font-semibold rounded-md shadow hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150"
      >
        Step
      </button>
      <button 
        ref={resetBtnRef}
        onClick={handleResetWithConfetti} 
        className="px-5 py-2 text-base bg-red-600 text-white font-semibold rounded-md shadow hover:bg-red-700 transition-all duration-150"
      >
        Reset
      </button>

      {/* Speed Slider */}
      <div className="flex items-center gap-3 px-3 md:px-5 py-2 bg-gray-700/50 backdrop-blur-sm rounded-md">
        <label htmlFor="speed-slider" className="text-white text-sm whitespace-nowrap">
          Speed: x{animationState.speed.toFixed(1)}
        </label>
        <input 
          id="speed-slider"
          type="range" 
          min="0.5" 
          max="2.5" 
          step="0.5" 
          value={animationState.speed} 
          onChange={handleSpeedChange}
          className="w-24 md:w-36 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Progress indicator */}
      <div className="hidden md:flex items-center gap-2 px-3 md:px-5 py-2 bg-gray-700/50 backdrop-blur-sm rounded-md">
        <span className="text-white text-sm whitespace-nowrap">
          Progress: {animationState.currentStep} / {animationState.totalSteps}
        </span>
        <div className="w-24 md:w-32 bg-gray-600 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(animationState.currentStep / animationState.totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

```