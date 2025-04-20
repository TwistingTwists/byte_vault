// src/components/Database/DirtyReadsTimeline.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAnimationState } from './hooks/useAnimationState';
import { useSystemState } from './hooks/useSystemState';
import TimelineVisualization from './TimelineVisualization';
import ControlPanel from './ControlPanel';
import DatabaseStateVisualization from './DatabaseStateVisualization';
import { TimelineEvent } from './types';

const DirtyReadsTimeline: React.FC = () => {
  // Constants
  const TOTAL_STEPS = 7;
  const INITIAL_DB_KEY = 'account_balance';
  const INITIAL_DB_VALUE = '$1000';
  
  // Timeline events
  const events: TimelineEvent[] = [
    { step: 0, tx: null, action: 'Initial State', position: 0 },
    { step: 1, tx: 'T2', action: 'Begin Transaction', position: 1 },
    { step: 2, tx: 'T2', action: 'Read balance=$1000', position: 2 },
    { step: 3, tx: 'T2', action: 'Write balance=$800', position: 3 },
    { step: 4, tx: 'T1', action: 'Begin Transaction', position: 4 },
    { step: 5, tx: 'T1', action: 'Read balance=$800', position: 5, highlight: true },
    { step: 6, tx: 'T2', action: 'Abort Transaction', position: 6 },
    { step: 7, tx: null, action: 'Dirty Read Occurred!', position: 7 }
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
    else if (currentStep === 2) {
      // T2 reads balance
      setSystemState(prev => ({
        ...prev,
        transaction2: {
          ...prev.transaction2,
          status: 'reading',
          lastReadValue: prev.dbData.committedValue
        }
      }));
      setCurrentStatus('T2 reads balance=$1000');
    }
    else if (currentStep === 3) {
      // T2 writes new balance but doesn't commit
      setSystemState(prev => ({
        ...prev,
        dbData: {
          ...prev.dbData,
          uncommittedValue: '$800',
          writerTx: 'T2'
        },
        transaction2: {
          ...prev.transaction2,
          status: 'holding_uncommitted_write',
          lastWriteValue: '$800'
        }
      }));
      setCurrentStatus('T2 writes balance=$800 but has not committed yet');
    }
    else if (currentStep === 4) {
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
    else if (currentStep === 5) {
      // T1 reads uncommitted value (DIRTY READ)
      setSystemState(prev => ({
        ...prev,
        transaction1: {
          ...prev.transaction1,
          status: 'error_dirty_read',
          lastReadValue: prev.dbData.uncommittedValue,
          isDirtyRead: true
        }
      }));
      setCurrentStatus('T1 reads uncommitted balance=$800 - THIS IS A DIRTY READ!');
    }
    else if (currentStep === 6) {
      // T2 aborts transaction
      setSystemState(prev => ({
        ...prev,
        dbData: {
          ...prev.dbData,
          uncommittedValue: null,
          writerTx: null
        },
        transaction2: {
          ...prev.transaction2,
          status: 'idle',
          lastReadValue: null,
          lastWriteValue: null
        }
      }));
      setCurrentStatus('T2 aborts transaction, changes are rolled back');
    }
    else if (currentStep === 7) {
      // Final state - dirty read issue highlighted
      setCurrentStatus('Issue Detected: T1 read data that was never committed (dirty read)');
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
      <h2 className="text-2xl font-bold text-white mb-6">Dirty Read Anomaly Demonstration</h2>
      
      {/* Explanation box */}
      <div className="bg-gray-800/80 backdrop-blur-sm rounded-lg border border-gray-700 p-4 mb-6 text-gray-300">
        <h3 className="text-xl font-semibold text-white mb-2">What is a Dirty Read?</h3>
        <p className="mb-3">
          A dirty read occurs when a transaction reads data that has been modified by another concurrent transaction but not yet committed. 
          If the transaction that made the changes rolls back, the data read by the first transaction becomes invalid.
        </p>
        <p>
          In this example, Transaction T1 reads a balance that Transaction T2 modified but never committed. When T2 aborts, 
          T1 is left with data that never existed in the committed database state.
        </p>
      </div>
      
      {/* Timeline visualization */}
      <TimelineVisualization events={events} animationState={animationState} />
      
      {/* Database state visualization */}
      <DatabaseStateVisualization 
        systemState={systemState} 
        animationState={animationState} 
        currentStatus={currentStatus}
        issueType="dirty-read"
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

export default DirtyReadsTimeline;