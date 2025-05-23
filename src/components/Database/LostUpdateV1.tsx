import React, { useState, useEffect, useRef } from 'react';

// Define key moments for explanations and highlighting for Lost Update
// Note: 'step' is 1-based, corresponding to currentStep
const keyMomentsDefinitionLostUpdate = [
  {
    step: 3, // T1 Reads balance
    text: "T1 reads the current balance of account 'A'. It intends to perform a calculation based on this value (100).",
    autoPause: true,
    isCritical: false,
    highlight: {
      timelineOps: [{ transaction: 'T1', time: 10 }],
      currentOpPanel: true,
      dbRead: ['A'], // Special highlight for what's being read from DB
    }
  },
  {
    step: 4, // T2 Reads balance
    text: "T2 also reads the balance of account 'A'. Crucially, T1 has not yet written its update. Both T1 and T2 now hold the same original value (100) in their local 'memory'.",
    autoPause: true,
    isCritical: true, // Critical because this sets up the lost update
    highlight: {
      timelineOps: [{ transaction: 'T1', time: 10 }, { transaction: 'T2', time: 15 }],
      currentOpPanel: true,
      dbRead: ['A'],
    }
  },
  {
    step: 5, // T1 Writes balance (uncommitted)
    text: "T1 calculates a new balance (100 - 20 = 80) and writes it. This write is currently UNCOMMITTED.",
    autoPause: true,
    isCritical: false,
    highlight: {
      uncommitted: ['w1A'],
      timelineOps: [{ transaction: 'T1', time: 30 }],
      currentOpPanel: true,
    }
  },
  {
    step: 6, // T2 Writes balance (uncommitted) - THE LOST UPDATE MOMENT (before commit)
    text: "⚠️ POTENTIAL LOST UPDATE! T2 calculates its new balance (100 + 50 = 150) based on its *original read* (100), unaware of T1's uncommitted write. T2 now writes 150. If both commit, T1's update (to 80) will be lost.",
    autoPause: true,
    isCritical: true,
    highlight: {
      uncommitted: ['w1A', 'w2A'], // Show both, T2's will effectively "win" if it commits after T1
      timelineOps: [{ transaction: 'T1', time: 30 }, { transaction: 'T2', time: 35 }],
      currentOpPanel: true,
    }
  },
  {
    step: 7, // T1 Commits
    text: "T1 commits its change. The database balance for 'A' is now officially 80. However, T2 still has an uncommitted write of 150 pending.",
    autoPause: true,
    isCritical: false,
    highlight: {
      db: ['A'],
      uncommitted: ['w2A'],
      timelineOps: [{ transaction: 'T1', time: 50 }],
      currentOpPanel: true,
    }
  },
  {
    step: 8, // T2 Commits - LOST UPDATE FINALIZED
    text: "💥 LOST UPDATE FINALIZED! T2 commits its change (150). This overwrites T1's previously committed value (80). T1's update (-20) has been lost. The final balance is 150, instead of the expected 130 (100 - 20 + 50).",
    autoPause: false,
    isCritical: true,
    highlight: {
      db: ['A'], // Show the final, "wrong" DB state
      timelineOps: [{ transaction: 'T2', time: 60 }],
      currentOpPanel: true,
    }
  },
];


const LostUpdateVisualizer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [dbState, setDbState] = useState({ A: 100 }); // Account A with initial balance
  const [uncommittedState, setUncommittedState] = useState({});
  const [completedOperations, setCompletedOperations] = useState([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
  const [readValueStore, setReadValueStore] = useState({}); // To store what each TX read
  const timelineRef = useRef(null);

  const transactions = {
    T1: { // Withdraws 20
      color: '#3b82f6', // Blue
      operations: [
        { type: 'begin', time: 0 },
        { type: 'read', time: 10, target: 'A' },
        // Implicit: T1 calculates A = A - 20
        { type: 'write', time: 30, target: 'A', valueFunction: (val) => val - 20, writeId: 'w1A' },
        { type: 'commit', time: 50 }
      ]
    },
    T2: { // Deposits 50
      color: '#10b981', // Emerald/Green
      operations: [
        { type: 'begin', time: 5 },
        { type: 'read', time: 15, target: 'A' },
        // Implicit: T2 calculates A = A + 50
        { type: 'write', time: 35, target: 'A', valueFunction: (val) => val + 50, writeId: 'w2A' },
        { type: 'commit', time: 60 }
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

  // Store initial read values for each transaction
  const populateReadValues = (operationsToProcess) => {
    let tempDb = { A: 100 }; // Initial state for calculation
    const newReadValues = {};
    const txCommittedWrites = {}; // Tracks committed writes to ensure reads see latest committed data

    operationsToProcess.forEach(op => {
        if (op.type === 'read') {
            if (!newReadValues[op.transaction]) {
                newReadValues[op.transaction] = {};
            }
            // Read sees the latest committed value at the time of the read
            newReadValues[op.transaction][op.target] = tempDb[op.target];
        } else if (op.type === 'write') {
            // This is just for simulating commits to update tempDb for subsequent reads
            // The actual write value application happens in calculateDbStateUpToStep
        } else if (op.type === 'commit') {
            // Simulate commit for tempDb
            const tx = transactions[op.transaction];
            const writesToCommit = tx.operations.filter(txOp => txOp.type === 'write' && txOp.time < op.time);
            writesToCommit.forEach(writeOp => {
                const readVal = newReadValues[op.transaction]?.[writeOp.target] ?? tempDb[writeOp.target];
                tempDb[writeOp.target] = writeOp.valueFunction(readVal);
            });
        }
    });
    setReadValueStore(newReadValues);
  };


  const calculateDbStateUpToStep = (step) => {
    const operationsToProcess = allOperations.slice(0, step);
    let currentDb = { A: 100 };
    let currentUncommitted = {};
    let currentCompleted = [];
    const txStates = {};
    const localTxReadValues = JSON.parse(JSON.stringify(readValueStore)); // Use stored read values

    operationsToProcess.forEach(op => {
      const txName = op.transaction;
      if (!txStates[txName]) txStates[txName] = { status: 'active', writes: [], localReads: localTxReadValues[txName] || {} };

      if (op.type === 'read') {
        // Value already stored in readValueStore, just mark as completed
      } else if (op.type === 'write') {
        if (txStates[txName].status === 'active') {
          const baseValue = txStates[txName].localReads[op.target] ?? currentDb[op.target]; // Use TX's read value
          const calculatedValue = op.valueFunction(baseValue);
          txStates[txName].writes.push({ ...op, value: calculatedValue }); // Store actual value
          currentUncommitted[op.writeId] = {
            transaction: txName,
            target: op.target,
            value: calculatedValue,
            color: op.color
          };
        }
      } else if (op.type === 'commit') {
        if (txStates[txName].status === 'active') {
          txStates[txName].writes.forEach(writeOp => {
            currentDb[writeOp.target] = writeOp.value; // Apply the calculated value
            delete currentUncommitted[writeOp.writeId];
          });
          txStates[txName].status = 'committed';
        }
      } else if (op.type === 'abort') { // Not used in this scenario, but good to have
        if (txStates[txName].status === 'active') {
          txStates[txName].writes.forEach(writeOp => {
            delete currentUncommitted[writeOp.writeId];
          });
          txStates[txName].status = 'aborted';
        }
      }
      currentCompleted.push({ ...op, 
        value: op.type === 'write' ? (currentUncommitted[op.writeId]?.value ?? op.value) : op.value 
      });
    });
    return { dbState: currentDb, uncommitted: currentUncommitted, completed: currentCompleted };
  };
  
  useEffect(() => {
    // Pre-populate read values once when allOperations are available
    if (allOperations.length > 0) {
        populateReadValues(allOperations);
    }
  }, [allOperations.length]); // Careful with dependencies if allOperations can change


  const updateStateForStep = (newStep) => {
    if (newStep === 0) {
      setCurrentTime(0);
      setDbState({ A: 100 });
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

      const moment = keyMomentsDefinitionLostUpdate.find(km => km.step === newStep);
      if (moment) {
        setKeyMomentInfo({ ...moment, step: newStep });
        if (moment.autoPause && isRunning && !isPaused) {
          setIsPaused(true);
        }
      } else {
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
            setIsPaused(false);
            return prev;
          }
          const newStep = prev + 1;
          updateStateForStep(newStep);
          return newStep;
        });
      }, 1200); // Slightly slower for this one

      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused]);

  const startSimulation = () => {
    // Repopulate read values on each fresh start if needed, or rely on initial useEffect
    populateReadValues(allOperations); // Ensure read values are fresh for this run
    setCurrentStep(0); 
    setIsRunning(true);
    setIsPaused(false);
    setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
     setCurrentStep(prev => { 
        const newStep = 1;
        if (newStep <= allOperations.length) updateStateForStep(newStep);
        return newStep;
     });
  };

  const pauseSimulation = () => setIsPaused(true);
  const resumeSimulation = () => {
    setIsPaused(false);
    if (keyMomentInfo.autoPause && keyMomentInfo.step === currentStep) {
        setKeyMomentInfo(prev => ({ ...prev, autoPause: false })); 
    }
  };
  const resetSimulation = () => {
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStep(0);
    updateStateForStep(0); 
    populateReadValues(allOperations); // Reset read values too
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

  const getTimePosition = (time) => (time / maxTime) * 95;

  const isOperationActive = (op, txName) => {
    return completedOperations.some(
      completed => completed.time === op.time && completed.transaction === txName && completed.type === op.type
    );
  };
  
  const getCurrentOperation = () => {
    if (currentStep === 0 || currentStep > allOperations.length) return null;
    const op = allOperations[currentStep - 1];
    // For write operations, show the calculated value
    if (op.type === 'write' && uncommittedState[op.writeId]) {
        return {...op, value: uncommittedState[op.writeId].value };
    }
    return op;
  };

  const getReadDisplayValue = (op, txName) => {
    if (op.type !== 'read') return null;
    const val = readValueStore[txName]?.[op.target];
    return val !== undefined ? val : 'N/A';
  };
  
  const currentOp = getCurrentOperation();
  const currentOpIsHighlighted = currentOp && keyMomentInfo.highlight?.currentOpPanel && keyMomentInfo.step === currentStep;

  return (
    <div className="w-full min-h-screen bg-gray-50 p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Transaction Timeline: Lost Update Anomaly
        </h1>
        <p className="text-gray-600">
          T1 withdraws 20 from Account A (initially 100). T2 deposits 50 to Account A.
          Observe how T2's deposit, based on the original balance, causes T1's withdrawal to be lost.
          Expected final balance (serial execution): 100 - 20 + 50 = 130.
        </p>
      </div>

      {/* Controls and State Display (similar structure to previous, adapted for Lost Update) */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          {/* Control Buttons */}
          <div className="flex gap-3">
            <button onClick={startSimulation} disabled={isRunning && !isPaused} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
              {isRunning && !isPaused ? 'Running...' : isRunning && isPaused ? 'Paused' : 'Auto Run'}
            </button>
            {isRunning && (isPaused ? 
              <button onClick={resumeSimulation} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Resume</button> :
              <button onClick={pauseSimulation} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Pause</button>
            )}
            <button onClick={resetSimulation} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Reset</button>
            <div className="border-l border-gray-300 pl-3 flex gap-2">
              <button onClick={stepBackward} disabled={currentStep === 0 || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400">← Step</button>
              <button onClick={stepForward} disabled={currentStep >= allOperations.length || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400">Step →</button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono">Step: {currentStep} / {allOperations.length}</div>
            <div className="text-sm text-gray-600">Time: {currentTime}</div>
          </div>
        </div>

        {/* State Displays */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.db?.length > 0 ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-gray-100'}`}>
            <h3 className="font-semibold mb-2">Committed Database State</h3>
            {Object.entries(dbState).map(([key, value]) => (
                 <div key={key} className={`font-mono ${keyMomentInfo.highlight?.db?.includes(key) ? 'font-bold text-blue-700 text-lg' : ''}`}>
                    {key} = {value}
                 </div>
            ))}
          </div>
          
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.uncommitted?.length > 0 ? 'ring-2 ring-yellow-500 bg-yellow-50' : 'bg-yellow-100'}`}>
            <h3 className="font-semibold mb-2">Uncommitted Writes</h3>
            {Object.entries(uncommittedState).map(([writeId, write]) => (
              <div key={writeId} className={`font-mono text-sm ${keyMomentInfo.highlight?.uncommitted?.includes(writeId) ? 'font-bold ring-1 ring-offset-1 ring-red-500 p-0.5 rounded bg-red-100' : ''}`}>
                <span style={{ color: write.color }}>{write.transaction} ({writeId})</span>: {write.target} = {write.value}
              </div>
            ))}
            {Object.keys(uncommittedState).length === 0 && <div className="text-gray-500 italic">None</div>}
          </div>

          <div className={`p-3 rounded ${currentOpIsHighlighted ? 'ring-2 ring-purple-500 bg-purple-50' : 'bg-blue-100'}`}>
            <h3 className="font-semibold mb-2">Current Operation</h3>
            {currentOp ? (
              <div className={`font-mono text-sm ${currentOpIsHighlighted ? 'font-bold text-purple-700' : ''}`}>
                <span style={{ color: currentOp.color }}>{currentOp.transaction}</span>: {currentOp.type.toUpperCase()}
                {currentOp.target && ` ${currentOp.target}`}
                {currentOp.type === 'read' && ` (reads: ${getReadDisplayValue(currentOp, currentOp.transaction)})`}
                {currentOp.type === 'write' && currentOp.value !== undefined && ` = ${currentOp.value}`}
                {currentOp.writeId && ` (id: ${currentOp.writeId})`}
              </div>
            ) : <div className="text-gray-500 italic">None</div>}
          </div>
          
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.dbRead?.length > 0 ? 'ring-2 ring-green-500 bg-green-50' : 'bg-green-100'}`}>
            <h3 className="font-semibold mb-2">Transaction Read Values</h3>
            {Object.entries(readValueStore).map(([txName, reads]) => (
                <div key={txName}>
                    <span style={{color: transactions[txName]?.color || '#000'}}>{txName} read:</span>
                    {Object.entries(reads).map(([target, value]) => (
                        <span key={target} className={`font-mono ml-2 ${keyMomentInfo.highlight?.dbRead?.includes(target) && currentOp?.transaction === txName ? 'font-bold text-green-700' : ''}`}>
                            {target}={value}
                        </span>
                    ))}
                </div>
            ))}
            {Object.keys(readValueStore).length === 0 && <div className="text-gray-500 italic">No reads yet</div>}
          </div>
        </div>
      </div>

      {/* Key Moment Panel */}
      {keyMomentInfo.text && (
        <div className={`my-6 p-4 rounded-lg border-2 transition-all duration-300 ease-in-out ${
            keyMomentInfo.isCritical ? 'border-red-400 bg-red-50 shadow-lg scale-105' : 'border-blue-400 bg-blue-50'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${keyMomentInfo.isCritical ? 'text-red-700' : 'text-blue-700'}`}>
            🔍 Insight at Step {keyMomentInfo.step} (Time: {allOperations[keyMomentInfo.step-1]?.time})
          </h3>
          <p className={`text-sm ${keyMomentInfo.isCritical ? 'text-red-600' : 'text-blue-600'}`}>{keyMomentInfo.text}</p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button onClick={resumeSimulation} className="mt-3 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">Continue</button>
          )}
        </div>
      )}

      {/* Timeline Visualization (similar structure, ensure op details are correct) */}
      <div className="bg-white rounded-lg shadow-md p-6" ref={timelineRef}>
        <h2 className="text-xl font-semibold mb-4">Transaction Timelines</h2>
        <div className="relative mb-8 pt-4"> {/* Time axis */}
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-300"></div>
          <div className="flex justify-between text-xs text-gray-500 mt-2 px-[2.5%] w-[95%]">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const timeVal = i * 10;
              if (timeVal > maxTime -5) return null;
              return (
                <div key={i} className="relative flex flex-col items-center">
                  <div className="absolute w-px h-2 bg-gray-300 -top-2"></div><div>{timeVal}</div>
                </div>);
            })}
          </div>
          {(isRunning || currentStep > 0) && (
            <div className="absolute top-[6px] w-0.5 h-6 bg-red-500 transition-all duration-200 ease-linear z-20"
              style={{ left: `${getTimePosition(currentTime)}%` }}>
              <div className="absolute -top-2 -left-[7px] w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
            </div>
          )}
        </div>

        <div className="space-y-8"> {/* Transaction timelines */}
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-2">
                <div className="w-4 h-4 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: tx.color }}></div>
                <h3 className="text-lg font-semibold">{txName}</h3>
              </div>
              <div className="relative h-12 bg-gray-100 rounded">
                <div className="absolute top-0 left-0 h-full rounded opacity-30"
                  style={{ backgroundColor: tx.color, width: `${getTimePosition(tx.operations[tx.operations.length - 1].time)}%`}}>
                </div>
                {tx.operations.map((op, idx) => {
                  const isActiveOp = isOperationActive(op, txName);
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(
                    hOp => hOp.transaction === txName && hOp.time === op.time) && keyMomentInfo.step !== null;
                  
                  let displayValue = "";
                  if (op.type === 'read') displayValue = `R(${op.target})`;
                  else if (op.type === 'write') {
                    const uncommittedVal = uncommittedState[op.writeId]?.value;
                    const committedVal = completedOperations.find(co => co.transaction === txName && co.type === 'write' && co.writeId === op.writeId)?.value;
                    displayValue = `W(${op.target}, ${uncommittedVal ?? committedVal ?? 'calc'})`;
                  } else displayValue = op.type.charAt(0).toUpperCase();

                  return (
                    <div
                      key={`${txName}-${op.type}-${op.time}-${idx}`}
                      className={`absolute top-1 w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group
                        ${isActiveOp ? 'bg-white shadow-lg scale-105' : 'bg-gray-200 opacity-70'}
                        ${isHighlightedOp ? 'ring-4 ring-offset-1 ring-red-500 scale-125 z-10' : ''}`}
                      style={{ 
                        left: `calc(${getTimePosition(op.time)}% - 20px)`, borderColor: tx.color,
                        color: isActiveOp ? tx.color : '#6b7280',
                      }}
                      title={`${op.type.toUpperCase()}${op.target ? ` ${op.target}` : ''}${op.writeId ? ` (id: ${op.writeId})` : ''}`}
                    >
                      {op.type.charAt(0).toUpperCase()}
                      {isActiveOp && (
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-30 opacity-0 group-hover:opacity-100 pointer-events-none">
                          {displayValue}
                          {op.type === 'read' && ` (value: ${getReadDisplayValue(op, txName)})`}
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
        {/* Legend (same as before) */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2 text-sm">
            {['Begin', 'Read', 'Write', 'Commit', 'Abort'].map(item => (
                 <div key={item} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-500 bg-white flex items-center justify-center text-xs font-bold text-gray-700">{item.charAt(0)}</div>
                    <span>{item}</span>
                 </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Panel */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">Understanding Lost Updates</h3>
        <p className="text-yellow-700 text-sm mb-3">
          A <strong>Lost Update</strong> occurs when two transactions read the same data item, and then both update it based on the original value they read. The second transaction to write overwrites the update made by the first, causing the first update to be "lost."
          This typically happens when transactions don't use proper locking or versioning mechanisms (e.g., optimistic concurrency control with checks, or pessimistic locking like `SELECT ... FOR UPDATE`).
        </p>
        <div className="bg-yellow-100 p-3 rounded text-sm mt-2">
          <h4 className="font-semibold mb-1">Key Observation Points:</h4>
          <ul className="text-xs space-y-1 list-disc list-inside text-yellow-700">
            <li><strong>Step 3 & 4:</strong> Both T1 and T2 read Account A's balance as 100.</li>
            <li><strong>Step 5:</strong> T1 intends to set balance to 80 (100-20), writes this uncommitted.</li>
            <li><strong>Step 6:</strong> T2, using its original read of 100, intends to set balance to 150 (100+50). Its uncommitted write effectively shadows T1's.</li>
            <li><strong>Step 7:</strong> T1 commits. Database balance becomes 80.</li>
            <li><strong>Step 8:</strong> T2 commits. Database balance becomes 150, overwriting T1's 80. <strong>T1's withdrawal of 20 is lost.</strong></li>
            <li>The correct final balance, if operations were serialized (e.g., T1 completes, then T2 completes), would be 100 - 20 + 50 = 130.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LostUpdateVisualizer;