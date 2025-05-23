import React, { useState, useEffect, useRef } from 'react';

// Define key moments for explanations and highlighting
// Note: 'step' is 1-based, corresponding to currentStep
const keyMomentsDefinition = [
  {
    step: 5, // Corresponds to T1's write operation (index 4 in allOperations)
    text: "T1 writes x = 120. This value is now in 'Uncommitted Writes'. It's not yet permanent in the database.",
    autoPause: true,
    isCritical: false,
    highlight: {
      uncommitted: ['w1'],
      timelineOps: [{ transaction: 'T1', time: 30 }],
      currentOpPanel: true,
    }
  },
  {
    step: 6, // Corresponds to T2's write operation (index 5 in allOperations)
    text: "⚠️ DIRTY WRITE! T2 writes x = 80. T2 has overwritten T1's uncommitted value for 'x' in the shared (uncommitted) space. If T1 were to abort now, and T2 committed, T2's commit would be based on an assumption (that T1's write was the latest) that is no longer true. Both 'w1' and 'w2' target 'x' and are uncommitted.",
    autoPause: true,
    isCritical: true,
    highlight: {
      uncommitted: ['w1', 'w2'], // Highlight both conflicting uncommitted writes
      timelineOps: [{ transaction: 'T2', time: 40 }, { transaction: 'T1', time: 30 }],
      currentOpPanel: true,
    }
  },
  {
    step: 7, // Corresponds to T1's commit operation (index 6 in allOperations)
    text: "T1 commits. Its write (x = 120) becomes permanent in the 'Committed Database State'. T2's uncommitted write (x = 80) is still pending. If T2 were to commit now, it would overwrite T1's committed value, leading to a 'Lost Update'.",
    autoPause: true,
    isCritical: false,
    highlight: {
      db: ['x'],
      uncommitted: ['w2'],
      timelineOps: [{ transaction: 'T1', time: 60 }, { transaction: 'T2', time: 40 }],
      currentOpPanel: true,
    }
  },
  {
    step: 8, // Corresponds to T2's abort operation (index 7 in allOperations)
    text: "T2 aborts. Its uncommitted write (x = 80) is discarded. The 'Committed Database State' (x = 120 from T1's commit) remains. In this specific sequence, the dirty write by T2 did not corrupt the final committed data because T1 committed its own intended value first, and T2 aborted.",
    autoPause: false,
    isCritical: false,
    highlight: {
      db: ['x'],
      timelineOps: [{ transaction: 'T2', time: 70 }],
      currentOpPanel: true,
    }
  },
];


const TransactionTimelineVisualizer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [dbState, setDbState] = useState({ x: 100 });
  const [uncommittedState, setUncommittedState] = useState({});
  const [completedOperations, setCompletedOperations] = useState([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
  const timelineRef = useRef(null);

  // Transaction definitions for dirty write scenario
  const transactions = {
    T1: {
      color: '#22c55e', // Green
      operations: [
        { type: 'begin', time: 0, target: null, value: null },
        { type: 'read', time: 10, target: 'x', value: null },
        { type: 'write', time: 30, target: 'x', value: 120, writeId: 'w1' },
        { type: 'commit', time: 60, target: null, value: null }
      ]
    },
    T2: {
      color: '#f59e0b', // Orange
      operations: [
        { type: 'begin', time: 5, target: null, value: null },
        { type: 'read', time: 20, target: 'x', value: null },
        { type: 'write', time: 40, target: 'x', value: 80, writeId: 'w2' },
        { type: 'abort', time: 70, target: null, value: null }
      ]
    }
  };

  const maxTime = Math.max(
    ...Object.values(transactions).flatMap(tx => 
      tx.operations.map(op => op.time)
    )
  ) + 10;

  const getAllOperations = () => {
    const allOps = [];
    Object.entries(transactions).forEach(([txName, tx]) => {
      tx.operations.forEach(op => {
        allOps.push({ ...op, transaction: txName, color: tx.color });
      });
    });
    return allOps.sort((a, b) => a.time - b.time);
  };

  const allOperations = getAllOperations();

  const calculateDbStateUpToStep = (step) => {
    const operationsToProcess = allOperations.slice(0, step);
    let currentDb = { x: 100 };
    let currentUncommitted = {};
    let currentCompleted = [];
    
    const txStates = {}; // Tracks status ('active', 'committed', 'aborted') and writes for each tx
    
    operationsToProcess.forEach(op => {
      const txName = op.transaction;
      
      if (!txStates[txName]) {
        txStates[txName] = { status: 'active', writes: [] };
      }
      
      if (op.type === 'write') {
        // Only add to uncommitted if transaction is active
        if (txStates[txName].status === 'active') {
            txStates[txName].writes.push(op);
            currentUncommitted[op.writeId] = { 
              transaction: txName, 
              target: op.target, 
              value: op.value,
              color: op.color
            };
        }
      } else if (op.type === 'commit') {
        if (txStates[txName].status === 'active') {
            txStates[txName].writes.forEach(writeOp => {
              currentDb[writeOp.target] = writeOp.value;
              delete currentUncommitted[writeOp.writeId];
            });
            txStates[txName].status = 'committed';
        }
      } else if (op.type === 'abort') {
         if (txStates[txName].status === 'active') {
            txStates[txName].writes.forEach(writeOp => {
              delete currentUncommitted[writeOp.writeId];
            });
            txStates[txName].status = 'aborted';
        }
      }
      currentCompleted.push(op);
    });
    
    return { dbState: currentDb, uncommitted: currentUncommitted, completed: currentCompleted };
  };

  const updateStateForStep = (newStep) => {
    if (newStep === 0) {
      setCurrentTime(0);
      setDbState({ x: 100 });
      setUncommittedState({});
      setCompletedOperations([]);
      setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
    } else {
      const operation = allOperations[newStep - 1];
      setCurrentTime(operation.time);
      
      const state = calculateDbStateUpToStep(newStep);
      setDbState(state.dbState);
      setUncommittedState(state.uncommitted);
      setCompletedOperations(state.completed);

      const moment = keyMomentsDefinition.find(km => km.step === newStep);
      if (moment) {
        setKeyMomentInfo({ ...moment, step: newStep });
        if (moment.autoPause && isRunning && !isPaused) {
          setIsPaused(true);
        }
      } else {
        // Clear if not a key moment, or if we stepped away from one
         if (keyMomentInfo.step !== null && keyMomentInfo.step !== newStep) {
           setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
         }
      }
    }
  };


  useEffect(() => {
    if (isRunning && !isPaused) {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= allOperations.length) {
            setIsRunning(false);
            setIsPaused(false); // Ensure pause is also reset
            return prev;
          }
          const newStep = prev + 1;
          updateStateForStep(newStep);
          return newStep;
        });
      }, 1000); 

      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, allOperations]); // updateStateForStep is not needed here due to its nature

  const startSimulation = () => {
    setCurrentStep(0); // updateStateForStep(0) will be called by stepForward next
    setIsRunning(true);
    setIsPaused(false);
    setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null }); // Clear on new start
    // Trigger the first step immediately if desired, or let useEffect handle it
     setCurrentStep(prev => { // Manually advance to step 1 to kick things off
        const newStep = 1;
        if (newStep <= allOperations.length) {
             updateStateForStep(newStep);
        }
        return newStep;
     });
  };

  const pauseSimulation = () => {
    setIsPaused(true);
  };

  const resumeSimulation = () => {
    setIsPaused(false);
    // If resuming from an auto-paused key moment, clear it so it doesn't re-trigger text
    // Or let the natural progression via `updateStateForStep` handle clearing if next step is not a key moment
    // For now, let's clear the autoPause flag of the current key moment if user explicitly resumes
    if (keyMomentInfo.autoPause && keyMomentInfo.step === currentStep) {
        setKeyMomentInfo(prev => ({ ...prev, autoPause: false })); // Prevent re-pausing on this step
    }
  };

  const resetSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(0);
    updateStateForStep(0); // This will reset states and keyMomentInfo
  };

  const stepForward = () => {
    if (currentStep < allOperations.length) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      updateStateForStep(newStep);
    }
  };

  const stepBackward = () => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      updateStateForStep(newStep);
    }
  };

  const getTimePosition = (time) => (time / maxTime) * 95; // Use 95% to give some padding

  const isOperationActive = (op, txName) => {
    return completedOperations.some(
      completed => completed.time === op.time && completed.transaction === txName && completed.type === op.type
    );
  };
  
  const getCurrentOperation = () => {
    if (currentStep === 0 || currentStep > allOperations.length) return null;
    return allOperations[currentStep - 1];
  };

  const getReadValue = (op, txName) => {
    if (op.type !== 'read' || !isOperationActive(op, txName)) return `Value not read yet`;
  
    // Find the latest write to op.target from ANY transaction that occurred *before or at* this read op's time
    // and whose transaction eventually committed (if this read should see committed values)
    // or the latest uncommitted write from THIS transaction if it exists.
    // For simplicity, let's assume reads see the last written value (committed or uncommitted by *any* active TX)
    // This is a simplification; real systems have complex read phenomena.

    // Check uncommitted writes first, from any transaction, up to current op's time.
    // This logic needs to be careful about the *order* of operations up to the point of the read.
    const opsUpToRead = allOperations.slice(0, completedOperations.findIndex(co => co.transaction === txName && co.time === op.time && co.type === 'read') + 1);
    let lastWriteValue = 100; // Initial DB state for x
    let dirty = false;

    const tempDb = { x: 100 };
    const tempUncommitted = {};
    const tempTxStates = {};

    opsUpToRead.forEach(processedOp => {
        if (!tempTxStates[processedOp.transaction]) {
            tempTxStates[processedOp.transaction] = { status: 'active', writes: [] };
        }

        if (processedOp.type === 'write') {
            tempTxStates[processedOp.transaction].writes.push(processedOp);
            tempUncommitted[processedOp.writeId] = { value: processedOp.value, transaction: processedOp.transaction };
            if (processedOp.target === op.target) {
                lastWriteValue = processedOp.value;
                // If this write is from another transaction AND that transaction is still active/uncommitted
                if (processedOp.transaction !== txName && tempTxStates[processedOp.transaction]?.status === 'active') {
                    dirty = true;
                } else {
                    dirty = false; // Reset if own write or committed write
                }
            }
        } else if (processedOp.type === 'commit') {
            if (tempTxStates[processedOp.transaction]) {
                 tempTxStates[processedOp.transaction].writes.forEach(w => {
                    if (w.target === op.target) {
                        tempDb[w.target] = w.value;
                        lastWriteValue = w.value;
                        dirty = false; // Committed values are not dirty
                    }
                    delete tempUncommitted[w.writeId];
                });
                tempTxStates[processedOp.transaction].status = 'committed';
            }
        } else if (processedOp.type === 'abort') {
             if (tempTxStates[processedOp.transaction]) {
                tempTxStates[processedOp.transaction].writes.forEach(w => {
                    delete tempUncommitted[w.writeId];
                });
                tempTxStates[processedOp.transaction].status = 'aborted';
                // If the aborted write was the one we read, we need to find the previous value
                // This part can get complex. For now, the `lastWriteValue` logic above should suffice.
            }
        }
    });
    
    // If the read is happening, check the current uncommitted state for its target
    const uncommittedRead = Object.values(uncommittedState).find(u => u.target === op.target);
    if (uncommittedRead && uncommittedRead.transaction !== txName) {
        // If reading an uncommitted value from another transaction
        // This determination of "dirty" needs to be more robust based on the actual state AT THE TIME OF THE READ
        // The current `getReadValue` is called when rendering, which uses the *latest* `uncommittedState`.
        // A more accurate `getReadValue` would re-calculate state up to the point of that specific read operation.
        // For now, we'll use the simplified logic based on `dbState` and current `uncommittedState`.
        const uncommittedWritesToTarget = Object.values(uncommittedState)
            .filter(write => write.target === op.target);
        
        if (uncommittedWritesToTarget.length > 0) {
            // Find the uncommitted write that is "latest" but active
            // This simplified version just takes the first one it finds from another TX
            const dirtyWrite = uncommittedWritesToTarget.find(uw => uw.transaction !== txName);
            if (dirtyWrite) return `${dirtyWrite.value} (dirty)`;
        }
    }
    
    return `${dbState[op.target]}${dirty ? ' (was dirty)' : ''}`;
  };


  const currentOp = getCurrentOperation();
  const currentOpIsHighlighted = currentOp && keyMomentInfo.highlight?.currentOpPanel && keyMomentInfo.step === currentStep;

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Transaction Timeline Visualization (Dirty Write)
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive visualization of a dirty write anomaly. Use controls to step through.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <button
              onClick={startSimulation}
              disabled={isRunning && !isPaused}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isRunning && !isPaused ? 'Running...' : isRunning && isPaused ? 'Paused (Auto)' : 'Auto Run'}
            </button>
            
            {isRunning && (
              <>
                {isPaused ? (
                  <button
                    onClick={resumeSimulation}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Resume
                  </button>
                ) : (
                  <button
                    onClick={pauseSimulation}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  >
                    Pause
                  </button>
                )}
              </>
            )}
            
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Reset
            </button>
            
            <div className="border-l border-gray-300 pl-3 flex gap-2">
              <button
                onClick={stepBackward}
                disabled={currentStep === 0 || (isRunning && !isPaused)}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
                title="Step Backward"
              >
                ← Step
              </button>
              <button
                onClick={stepForward}
                disabled={currentStep >= allOperations.length || (isRunning && !isPaused)}
                className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400"
                title="Step Forward"
              >
                Step →
              </button>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-mono">
              Step: {currentStep} / {allOperations.length}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Time: {currentTime}
            </div>
          </div>
        </div>

        {/* State Displays */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/* Committed DB State */}
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.db?.length > 0 ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/70' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <h3 className="font-semibold mb-2 dark:text-gray-200">Committed Database State</h3>
            {Object.entries(dbState).map(([key, value]) => (
                 <div key={key} className={`font-mono ${keyMomentInfo.highlight?.db?.includes(key) ? 'font-bold text-blue-700 dark:text-blue-300' : 'dark:text-gray-100'}`}>
                    {key} = {value}
                 </div>
            ))}
          </div>
          
          {/* Uncommitted Writes */}
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.uncommitted?.length > 0 ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900' : 'bg-yellow-100 dark:bg-yellow-900/50'}`}>
            <h3 className="font-semibold mb-2 dark:text-gray-200">Uncommitted Writes</h3>
            {Object.entries(uncommittedState).map(([writeId, write]) => (
              <div key={writeId} className={`font-mono text-sm ${keyMomentInfo.highlight?.uncommitted?.includes(writeId) ? 'font-bold ring-1 ring-offset-1 ring-red-500 p-0.5 rounded bg-red-100' : ''}`}>
                <span style={{ color: write.color }}>
                  {write.transaction} ({writeId})
                </span>: {write.target} = {write.value}
              </div>
            ))}
            {Object.keys(uncommittedState).length === 0 && (
              <div className="text-gray-500 dark:text-gray-400 italic">None</div>
            )}
          </div>

          {/* Current Operation */}
          <div className={`p-3 rounded ${currentOpIsHighlighted ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/70' : 'bg-blue-100 dark:bg-gray-800'}`}>
            <h3 className="font-semibold mb-2 dark:text-gray-200">Current Operation</h3>
            {currentOp ? (
              <div className={`font-mono text-sm ${currentOpIsHighlighted ? 'font-bold text-purple-700 dark:text-purple-300' : 'dark:text-gray-100'}`}>
                <span style={{ color: currentOp.color }}>
                  {currentOp.transaction}
                </span>: {currentOp.type.toUpperCase()}
                {currentOp.target && ` ${currentOp.target}`}
                {currentOp.value !== null && ` = ${currentOp.value}`}
                {currentOp.writeId && ` (id: ${currentOp.writeId})`}
              </div>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 italic">None (Press 'Auto Run' or 'Step →')</div>
            )}
          </div>
          
          {/* Anomaly Explanation (Static) */}
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-3 rounded">
            <h3 className="font-semibold text-red-700 mb-2">Dirty Write Anomaly</h3>
            <div className="text-xs text-red-600 dark:text-red-400">
              Occurs if T2 overwrites an uncommitted value of T1, and then T1 commits based on stale info or T2 aborts after T1 used its data. Focus on step 6.
            </div>
          </div>
        </div>
      </div>

      {/* Key Moment Explanation Panel */}
      {keyMomentInfo.text && (
        <div className={`my-6 p-4 rounded-lg border-2 transition-all duration-300 ease-in-out ${
            keyMomentInfo.isCritical 
                ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg scale-105' 
                : 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'
            }`}
        >
          <h3 className={`text-lg font-semibold mb-2 ${keyMomentInfo.isCritical ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
            🔍 Key Insight at Step {keyMomentInfo.step} (Time: {allOperations[keyMomentInfo.step-1].time})
          </h3>
          <p className={`text-sm ${keyMomentInfo.isCritical ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
            {keyMomentInfo.text}
          </p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button
              onClick={resumeSimulation}
              className="mt-3 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Continue Simulation
            </button>
          )}
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6" ref={timelineRef}>
        <h2 className="text-xl font-semibold mb-4">Transaction Timelines</h2>
        
        <div className="relative mb-8 pt-4">
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex justify-between text-xs text-gray-500 mt-2 px-[2.5%] w-[95%]">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const timeVal = i * 10;
              if (timeVal > maxTime -5) return null; // Avoid clutter at the end
              return (
                <div key={i} className="relative flex flex-col items-center">
                  <div className="absolute w-px h-2 bg-gray-300 -top-2"></div>
                  <div>{timeVal}</div>
                </div>
              );
            })}
          </div>
          
          {(isRunning || currentStep > 0) && (
            <div 
              className="absolute top-[6px] w-0.5 h-6 bg-red-500 transition-all duration-200 ease-linear z-20"
              style={{ left: `${getTimePosition(currentTime)}%` }}
            >
              <div className="absolute -top-2 -left-[7px] w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
            </div>
          )}
        </div>

        <div className="space-y-8">
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-2">
                <div 
                  className="w-4 h-4 rounded-full mr-3 flex-shrink-0"
                  style={{ backgroundColor: tx.color }}
                ></div>
                <h3 className="text-lg font-semibold">{txName}</h3>
              </div>
              
              <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded">
                <div 
                  className="absolute top-0 left-0 h-full rounded opacity-30"
                  style={{ 
                    backgroundColor: tx.color,
                    width: `${getTimePosition(tx.operations[tx.operations.length - 1].time)}%`
                  }}
                ></div>
                
                {tx.operations.map((op, idx) => {
                  const isActiveOp = isOperationActive(op, txName);
                  const readVal = op.type === 'read' ? getReadValue(op, txName) : null;
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(
                    hOp => hOp.transaction === txName && hOp.time === op.time
                  ) && keyMomentInfo.step !== null;

                  return (
                    <div
                      key={`${txName}-${op.type}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group
                        ${isActiveOp 
                          ? 'bg-white shadow-lg scale-105' 
                          : 'bg-gray-200 opacity-70'}
                        ${isHighlightedOp ? 'ring-4 ring-offset-1 ring-red-500 scale-125 z-10' : ''}
                      `}
                      style={{ 
                        left: `calc(${getTimePosition(op.time)}% - 14px)`, // 14px is half of width
                        borderColor: tx.color,
                        color: isActiveOp ? tx.color : '#6b7280', // gray-500
                      }}
                      title={`${op.type.toUpperCase()}${op.target ? ` ${op.target}` : ''}${op.value !== undefined && op.value !== null ? ` = ${op.value}` : ''}${op.writeId ? ` (id: ${op.writeId})` : ''}`}
                    >
                      {op.type.charAt(0).toUpperCase()}
                      
                      {isActiveOp && (
                        <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                                        bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-30
                                        transition-opacity duration-200 pointer-events-none
                                        ${(isHighlightedOp || isActiveOp) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                          {op.type === 'read' && `R(${op.target}) = ${readVal}`}
                          {op.type === 'write' && `W(${op.target}, ${op.value})${op.writeId ? ` [${op.writeId}]` : ''}`}
                          {op.type === 'begin' && 'BEGIN'}
                          {op.type === 'commit' && 'COMMIT'}
                          {op.type === 'abort' && 'ABORT'}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-black"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2 text-sm">
            {[
              {char: 'B', desc: 'Begin'}, {char: 'R', desc: 'Read'}, {char: 'W', desc: 'Write'},
              {char: 'C', desc: 'Commit'}, {char: 'A', desc: 'Abort'}
            ].map(item => (
                 <div key={item.char} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-500 bg-white flex items-center justify-center text-xs font-bold text-gray-700">{item.char}</div>
                    <span>{item.desc}</span>
                 </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis */}
      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Understanding Dirty Writes</h3>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
          A <strong>dirty write</strong> occurs when a transaction overwrites data that another concurrent transaction has modified but not yet committed.
          If the first transaction (whose data was overwritten) later aborts, the change made by the second transaction might be based on data that never officially existed.
          If the first transaction commits, and then the second transaction (that performed the dirty write) aborts, the first transaction's update could be unintentionally undone.
          This scenario (T1 writes, T2 writes over T1's uncommitted, T1 commits, T2 aborts) avoids data corruption *because T1 commits its own intended value*. The risk is higher if T1 were to *use* T2's dirty data before T2 aborts, or if T2 committed.
        </p>
        <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded text-sm mt-2">
          <h4 className="font-semibold mb-1">Key Observation Points:</h4>
          <ul className="text-xs space-y-1 list-disc list-inside text-yellow-700 dark:text-yellow-300">
            <li><strong>Step 5:</strong> T1 writes x=120 (uncommitted).</li>
            <li><strong>Step 6:</strong> T2 writes x=80 (uncommitted), overwriting T1's uncommitted x. This is the <strong>dirty write</strong>.</li>
            <li><strong>Step 7:</strong> T1 commits x=120. Database now has x=120.</li>
            <li><strong>Step 8:</strong> T2 aborts. Its write of x=80 is rolled back. Final state is x=120.</li>
            <li>Consider what would happen if T1 aborted at step 7, and T2 then committed. The database would show x=80, which might be inconsistent if T2's logic depended on T1's original data.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TransactionTimelineVisualizer;