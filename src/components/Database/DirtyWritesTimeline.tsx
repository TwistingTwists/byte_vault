// src/components/Database/DirtyWritesTimeline.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAnimationState } from './hooks/useAnimationState';
import { useSystemState } from './hooks/useSystemState';
import TimelineVisualization from './TimelineVisualization';
import ControlPanel from './ControlPanel';
import DatabaseStateVisualization from './DatabaseStateVisualization';
import { TimelineEvent } from './types';

const DirtyWritesTimeline: React.FC = () => {
  // Constants
  const TOTAL_STEPS = 9;
  const INITIAL_DB_KEY = 'account_balance';
  const INITIAL_DB_VALUE = '$1000';
  
  // Timeline events
  const events: TimelineEvent[] = [
    { step: 0, tx: null, action: 'Initial State', position: 0 },
    { step: 1, tx: 'T1', action: 'Begin Transaction', position: 1 },
    { step: 2, tx: 'T1', action: 'Read balance=$1000', position: 2 },
    { step: 3, tx: 'T1', action: 'Calculate: $1000-$200', position: 3 },
    { step: 4, tx: 'T1', action: 'Write balance=$800', position: 4 },
    { step: 5, tx: 'T2', action: 'Begin Transaction', position: 5 },
    { step: 6, tx: 'T2', action: 'Read balance=$1000', position: 6 },
    { step: 7, tx: 'T2', action: 'Calculate: $1000-$300', position: 7 },
    { step: 8, tx: 'T2', action: 'Write balance=$700', position: 8, highlight: true },
    { step: 9, tx: null, action: 'Dirty Write Occurred!', position: 9 }
  ];
  
  // Animation state
  const {
    animationState,
    setAnimationState,
    handleSpeedChange,
    resetAnimation,
    startAnimation,
    pauseAnimation,
    stepForward,
    setTotalSteps
  } = useAnimationState(TOTAL_STEPS);
  
  // System state
  const {
    systemState,
    setSystemState,
    resetSystem
  } = useSystemState(INITIAL_DB_KEY, INITIAL_DB_VALUE);
  
  // Status message state
  const [currentStatus, setCurrentStatus] = useState('Database is in initial state');
  
  // Reference to animation interval
  const animationInterval = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup animation interval on unmount
  useEffect(() => {
    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, []);
  
  // Animation step handler
  const handleAnimationStep = useCallback(() => {
    const currentStep = animationState.currentStep;
    
    // Execute actions based on current step
    if (currentStep === 0) {
      // Initial state
      setCurrentStatus('Database is in initial state');
    }
    else if (currentStep === 1) {
      // T1 begins transaction
      setSystemState(prev => ({
        ...prev,
        transaction1: {
          ...prev.transaction1,
          status: 'idle'
        }
      }));
      setCurrentStatus('Transaction T1 begins');
    }
    else if (currentStep === 2) {
      // T1 reads balance
      setSystemState(prev => ({
        ...prev,
        transaction1: {
          ...prev.transaction1,
          status: 'reading',
          lastReadValue: prev.dbData.committedValue
        }
      }));
      setCurrentStatus('T1 reads balance=$1000');
    }
    else if (currentStep === 3) {
      // T1 calculates new balance
      setSystemState(prev => ({
        ...prev,
        transaction1: {
          ...prev.transaction1,
          status: 'holding_read'
        }
      }));
      setCurrentStatus('T1 calculates new balance: $1000-$200=$800');
    }
    else if (currentStep === 4) {
      // T1 writes new balance but doesn't commit
      setSystemState(prev => ({
        ...prev,
        dbData: {
          ...prev.dbData,
          uncommittedValue: '$800',
          writerTx: 'T1'
        },
        transaction1: {
          ...prev.transaction1,
          status: 'holding_uncommitted_write',
          lastWriteValue: '$800'
        }
      }));
      setCurrentStatus('T1 writes balance=$800 but has not committed yet');
    }
    else if (currentStep === 5) {
      // T2 begins transaction
      setSystemState(prev => ({
        ...prev,
        transaction2: {
          ...prev.transaction2,
          status: 'idle'
        }
      }));
      setCurrentStatus('Transaction T2 begins');
    }
    else if (currentStep === 6) {
      // T2 reads the original committed value (not T1's uncommitted change)
      setSystemState(prev => ({
        ...prev,
        transaction2: {
          ...prev.transaction2,
          status: 'reading',
          lastReadValue: prev.dbData.committedValue
        }
      }));
      setCurrentStatus('T2 reads the committed balance=$1000 (ignoring T1\'s uncommitted write)');
    }
    else if (currentStep === 7) {
      // T2 calculates new balance
      setSystemState(prev => ({
        ...prev,
        transaction2: {
          ...prev.transaction2,
          status: 'holding_read'
        }
      }));
      setCurrentStatus('T2 calculates new balance: $1000-$300=$700');
    }
    else if (currentStep === 8) {
      // T2 writes new balance - THIS IS A DIRTY WRITE!
      setSystemState(prev => ({
        ...prev,
        dbData: {
          ...prev.dbData,
          uncommittedValue: '$700',
          writerTx: 'T2'
        },
        transaction1: {
          ...prev.transaction1,
          isDirtyWrite: true
        },
        transaction2: {
          ...prev.transaction2,
          status: 'error_dirty_write',
          lastWriteValue: '$700',
          isDirtyWrite: true
        }
      }));
      setCurrentStatus('T2 writes balance=$700, overwriting T1\'s uncommitted write - THIS IS A DIRTY WRITE!');
    }
    else if (currentStep === 9) {
      // Final state - dirty write issue highlighted
      setCurrentStatus('Issue Detected: T2 overwrote T1\'s uncommitted changes (dirty write). When T1 commits, its changes will be lost!');
      pauseAnimation();
    }
    
    // Move to next step
    if (currentStep < TOTAL_STEPS) {
      setAnimationState(prev => ({
        ...prev,
        currentStep: prev.currentStep + 1
      }));
    } else {
      pauseAnimation();
    }
  }, [animationState.currentStep, setAnimationState, setSystemState, pauseAnimation, TOTAL_STEPS]);
  
  // Animation controller
  useEffect(() => {
    if (animationState.isRunning && !animationState.isPaused) {
      // Clear previous interval if exists
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
      
      // Setup new interval
      const speed = animationState.speed;
      const interval = 1000 / speed;
      
      animationInterval.current = setInterval(() => {
        if (animationState.currentStep < TOTAL_STEPS) {
          handleAnimationStep();
        } else {
          pauseAnimation();
        }
      }, interval);
    } else if (animationInterval.current) {
      clearInterval(animationInterval.current);
    }
    
    return () => {
      if (animationInterval.current) {
        clearInterval(animationInterval.current);
      }
    };
  }, [animationState.isRunning, animationState.isPaused, animationState.speed, animationState.currentStep, handleAnimationStep, TOTAL_STEPS, pauseAnimation]);
  
  // Handlers for control panel
  const handlePlay = useCallback(() => {
    if (animationState.currentStep >= TOTAL_STEPS) {
      // Reset if at the end
      resetSystem();
      resetAnimation();
    }
    startAnimation();
  }, [animationState.currentStep, TOTAL_STEPS, resetSystem, resetAnimation, startAnimation]);
  
  const handleStep = useCallback(() => {
    if (animationState.currentStep < TOTAL_STEPS) {
      handleAnimationStep();
    }
  }, [animationState.currentStep, TOTAL_STEPS, handleAnimationStep]);
  
  const handleReset = useCallback(() => {
    resetSystem();
    resetAnimation();
    setCurrentStatus('Database is in initial state');
  }, [resetSystem, resetAnimation]);
  
  return (
    <div className="w-full max-w-4xl mx-auto mt-8 mb-20">
      <h2 className="text-2xl font-bold text-white mb-6">Dirty Write Anomaly Demonstration</h2>
      
      {/* Explanation box */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 p-4 mb-6 text-gray-300">
        <h3 className="text-xl font-semibold text-white mb-2">What is a Dirty Write?</h3>
        <p className="mb-3">
          A dirty write occurs when multiple transactions try to update the same data concurrently without proper isolation,
          potentially causing one transaction to overwrite changes made by another uncommitted transaction.
        </p>
        <p>
          In this example, Transaction T1 writes a new balance but doesn't commit. Before T1 commits, Transaction T2 
          also writes to the same record, overwriting T1's uncommitted changes. This leads to lost updates and data inconsistency.
        </p>
      </div>
      
      {/* Timeline visualization */}
      <TimelineVisualization events={events} animationState={animationState} />
      
      {/* Database state visualization */}
      <DatabaseStateVisualization 
        systemState={systemState} 
        animationState={animationState} 
        currentStatus={currentStatus}
        issueType="dirty-write"
      />
      
      {/* Control panel */}
      <ControlPanel 
        animationState={animationState}
        handlePlay={handlePlay}
        handlePause={pauseAnimation}
        handleStep={handleStep}
        handleReset={handleReset}
        handleSpeedChange={handleSpeedChange}
      />
    </div>
  );
};

export default DirtyWritesTimeline;