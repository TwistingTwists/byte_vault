import React, { useState, useEffect, useRef } from 'react';

// Define initial data for the 'employees' table
const initialEmployeesData = [
  { id: 1, name: 'Alice', department: 'Engineering', salary: 90000 },
  { id: 2, name: 'Bob', department: 'Sales', salary: 75000 },
  { id: 4, name: 'David', department: 'Engineering', salary: 85000 }, // Added another engineer
];

// Define key moments for explanations and highlighting for Phantom Read
const keyMomentsDefinitionPhantomRead = [
  {
    step: 2, // Corresponds to T1's first scan operation (index 1 in allOperations)
    text: "T1 performs its first scan for employees in the 'Engineering' department. It finds Alice and David.",
    autoPause: true,
    isCritical: false,
    highlight: {
      timelineOps: [{ transaction: 'T1', time: 10 }],
      currentOpPanel: true,
      scanLogEntries: ['T1_s1_10'], // Key to identify this scan in scanLog
      dbTableRows: { // Highlight rows found by the scan
        employees: [
            initialEmployeesData.find(e => e.id === 1),
            initialEmployeesData.find(e => e.id === 4)
        ].map(e => e.id)
      }
    }
  },
  {
    step: 4, // Corresponds to T2's insert operation (index 3)
    text: "T2 inserts a new employee, 'Charlie', into the 'Engineering' department. This insert is currently uncommitted.",
    autoPause: true,
    isCritical: false,
    highlight: {
      uncommittedInserts: ['i1'],
      timelineOps: [{ transaction: 'T2', time: 25 }],
      currentOpPanel: true,
    }
  },
  {
    step: 5, // Corresponds to T2's commit operation (index 4)
    text: "T2 commits. 'Charlie' (id:3) is now a permanent part of the 'Engineering' department in the database.",
    autoPause: true,
    isCritical: false,
    highlight: {
      dbTableRows: { employees: [3] }, // Highlight the newly committed row
      timelineOps: [{ transaction: 'T2', time: 35 }],
      currentOpPanel: true,
    }
  },
  {
    step: 6, // Corresponds to T1's second scan operation (index 5)
    text: "⚠️ PHANTOM READ! T1 performs its second scan for 'Engineering' employees. This time, it sees 'Charlie' (id:3), who wasn't present during the first scan. This new, unexpected row is a 'phantom'. The set of rows has changed.",
    autoPause: true,
    isCritical: true,
    highlight: {
      timelineOps: [{ transaction: 'T1', time: 50 }, { transaction: 'T1', time: 10 }], // Highlight both scans
      currentOpPanel: true,
      scanLogEntries: ['T1_s2_50', 'T1_s1_10'], // Highlight both scan results in the log
      dbTableRows: { // Highlight all rows found by the second scan, emphasizing the new one
        employees: [
            initialEmployeesData.find(e => e.id === 1)?.id,
            initialEmployeesData.find(e => e.id === 4)?.id,
            3 // Charlie's ID
        ].filter(id => id !== undefined)
      },
      phantomRowId: 3 // Specific ID of the phantom row for extra emphasis if needed
    }
  },
  {
    step: 7, // Corresponds to T1's commit (index 6)
    text: "T1 commits. The phantom read has occurred. If T1's logic depended on a stable set of rows (e.g., calculating total salary twice), it might now be inconsistent.",
    autoPause: false,
    isCritical: false,
    highlight: {
      timelineOps: [{ transaction: 'T1', time: 60 }],
      currentOpPanel: true,
    }
  },
];


const PhantomReadVisualizer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  // DB state now includes tables
  const [dbState, setDbState] = useState({ tables: { employees: JSON.parse(JSON.stringify(initialEmployeesData)) } });
  const [uncommittedInserts, setUncommittedInserts] = useState({});
  const [scanLog, setScanLog] = useState({}); // To store results of scan operations
  const [completedOperations, setCompletedOperations] = useState([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
  const timelineRef = useRef(null);

  // Transaction definitions for phantom read scenario
  const transactions = {
    T1: {
      color: '#22c55e', // Green
      operations: [
        { type: 'begin', time: 0 },
        { type: 'scan', time: 10, table: 'employees', predicate: (emp) => emp.department === 'Engineering', scanId: 's1' },
        // Some delay or other operations could go here
        { type: 'scan', time: 50, table: 'employees', predicate: (emp) => emp.department === 'Engineering', scanId: 's2' },
        { type: 'commit', time: 60 }
      ]
    },
    T2: {
      color: '#f59e0b', // Orange
      operations: [
        { type: 'begin', time: 5 },
        { type: 'insert', time: 25, table: 'employees', data: { id: 3, name: 'Charlie', department: 'Engineering', salary: 80000 }, insertId: 'i1' },
        { type: 'commit', time: 35 }
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
    // Reset to initial state for calculation
    let currentDb = { tables: { employees: JSON.parse(JSON.stringify(initialEmployeesData)) } };
    let currentUncommittedInserts = {};
    let currentScanLog = {};
    let currentCompleted = [];
    
    const txStates = {}; // Tracks status ('active', 'committed', 'aborted') and pending inserts for each tx
    
    operationsToProcess.forEach(op => {
      const txName = op.transaction;
      
      if (!txStates[txName]) {
        txStates[txName] = { status: 'active', pendingInsertIds: [] };
      }
      
      if (op.type === 'insert') {
        if (txStates[txName].status === 'active') {
            currentUncommittedInserts[op.insertId] = { 
              transaction: txName, 
              table: op.table, 
              data: op.data,
              color: op.color
            };
            txStates[txName].pendingInsertIds.push(op.insertId);
        }
      } else if (op.type === 'scan') {
        // A scan reads from the current committed state of the database (`currentDb`)
        // The phantom read phenomenon occurs because `currentDb` changes between two scans
        // due to committed operations of other transactions.
        const tableData = currentDb.tables[op.table] || [];
        const results = tableData.filter(row => op.predicate(row));
        
        currentScanLog[`${txName}_${op.scanId}_${op.time}`] = {
            transaction: txName,
            scanId: op.scanId,
            time: op.time,
            table: op.table,
            predicateString: op.predicate.toString(), // Store for display
            results: JSON.parse(JSON.stringify(results)), // Snapshot of results
            color: op.color,
        };

      } else if (op.type === 'commit') {
        if (txStates[txName].status === 'active') {
            txStates[txName].pendingInsertIds.forEach(insertIdToCommit => {
              const insertOp = currentUncommittedInserts[insertIdToCommit];
              if (insertOp) {
                if (!currentDb.tables[insertOp.table]) {
                    currentDb.tables[insertOp.table] = [];
                }
                currentDb.tables[insertOp.table].push(insertOp.data);
                // Sort by ID to maintain order for consistent display
                currentDb.tables[insertOp.table].sort((a, b) => a.id - b.id);
                delete currentUncommittedInserts[insertIdToCommit];
              }
            });
            txStates[txName].status = 'committed';
            txStates[txName].pendingInsertIds = []; // Clear pending for this TX
        }
      } else if (op.type === 'abort') { // Not used in this specific scenario, but good practice
         if (txStates[txName].status === 'active') {
            txStates[txName].pendingInsertIds.forEach(insertIdToRollback => {
              delete currentUncommittedInserts[insertIdToRollback];
            });
            txStates[txName].status = 'aborted';
            txStates[txName].pendingInsertIds = [];
        }
      }
      currentCompleted.push(op);
    });
    
    return { dbState: currentDb, uncommittedInserts: currentUncommittedInserts, scanLog: currentScanLog, completed: currentCompleted };
  };

  const updateStateForStep = (newStep) => {
    if (newStep === 0) {
      setCurrentTime(0);
      setDbState({ tables: { employees: JSON.parse(JSON.stringify(initialEmployeesData)) } });
      setUncommittedInserts({});
      setScanLog({});
      setCompletedOperations([]);
      setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
    } else {
      const operation = allOperations[newStep - 1];
      setCurrentTime(operation.time);
      
      const state = calculateDbStateUpToStep(newStep);
      setDbState(state.dbState);
      setUncommittedInserts(state.uncommittedInserts);
      setScanLog(state.scanLog);
      setCompletedOperations(state.completed);

      const moment = keyMomentsDefinitionPhantomRead.find(km => km.step === newStep);
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
      }, 1000); 

      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused]);

  const startSimulation = () => {
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
    return allOperations[currentStep - 1];
  };
  
  const currentOp = getCurrentOperation();
  const currentOpIsHighlighted = currentOp && keyMomentInfo.highlight?.currentOpPanel && keyMomentInfo.step === currentStep;

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
          Transaction Timeline: Phantom Read Anomaly
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          T1 scans for 'Engineering' employees. T2 inserts and commits a new 'Engineering' employee. T1's subsequent identical scan finds this new 'phantom' row.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <button onClick={startSimulation} disabled={isRunning && !isPaused} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
              {isRunning && !isPaused ? 'Running...' : isRunning && isPaused ? 'Paused' : 'Auto Run'}
            </button>
            {isRunning && (isPaused ? 
              <button onClick={resumeSimulation} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Resume</button> :
              <button onClick={pauseSimulation} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700">Pause</button>
            )}
            <button onClick={resetSimulation} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Reset</button>
            <div className="border-l border-gray-300 dark:border-gray-600 pl-3 flex gap-2">
              <button onClick={stepBackward} disabled={currentStep === 0 || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400">← Step</button>
              <button onClick={stepForward} disabled={currentStep >= allOperations.length || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400">Step →</button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono dark:text-gray-100">Step: {currentStep} / {allOperations.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Time: {currentTime}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          {/* Committed DB State */}
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.dbTableRows ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/70' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <h3 className="font-semibold mb-2 dark:text-gray-200">Committed Database State</h3>
            {Object.entries(dbState.tables || {}).map(([tableName, rows]) => (
              <div key={tableName} className="mb-2">
                <h4 className="font-medium text-sm dark:text-gray-300 capitalize">{tableName}</h4>
                {rows.length === 0 ? <p className="text-xs italic dark:text-gray-400">No rows</p> : (
                  <table className="w-full text-xs table-auto">
                    <thead className="text-left dark:text-gray-300">
                      <tr>
                        {rows.length > 0 && Object.keys(rows[0]).map(col => <th key={col} className="p-1 border-b dark:border-gray-600 font-normal">{col}</th>)}
                      </tr>
                    </thead>
                    <tbody className="dark:text-gray-100">
                      {rows.map((row, idx) => {
                        const isHighlighted = keyMomentInfo.highlight?.dbTableRows?.[tableName]?.includes(row.id);
                        const isPhantom = keyMomentInfo.highlight?.phantomRowId === row.id && keyMomentInfo.step === currentStep;
                        return (
                          <tr key={idx} className={`${isHighlighted ? 'bg-blue-100 dark:bg-blue-800' : ''} ${isPhantom ? 'font-bold text-red-600 dark:text-red-400 ring-1 ring-red-500' : ''}`}>
                            {Object.values(row).map((val, vIdx) => <td key={vIdx} className="p-1 border-b dark:border-gray-700">{String(val)}</td>)}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
          
          {/* Uncommitted Inserts */}
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.uncommittedInserts?.length > 0 ? 'ring-2 ring-yellow-500 bg-yellow-50 dark:bg-yellow-900/80' : 'bg-yellow-100 dark:bg-yellow-900/50'}`}>
            <h3 className="font-semibold mb-2 dark:text-gray-200">Uncommitted Inserts</h3>
            {Object.entries(uncommittedInserts).map(([insertId, insert]) => (
              <div key={insertId} className={`font-mono text-xs p-1 my-0.5 rounded ${keyMomentInfo.highlight?.uncommittedInserts?.includes(insertId) ? 'ring-1 ring-red-500 bg-red-100 dark:bg-red-800' : ''}`}>
                <span style={{ color: insert.color }}>{insert.transaction} ({insertId})</span>: INSERT into {insert.table}
                <pre className="text-xxs whitespace-pre-wrap dark:text-gray-300">{JSON.stringify(insert.data, null, 1)}</pre>
              </div>
            ))}
            {Object.keys(uncommittedInserts).length === 0 && <div className="text-gray-500 dark:text-gray-400 italic">None</div>}
          </div>

          {/* Scan Log */}
          <div className={`p-3 rounded ${keyMomentInfo.highlight?.scanLogEntries?.length > 0 ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/70' : 'bg-green-100 dark:bg-green-900/50'}`}>
            <h3 className="font-semibold mb-2 dark:text-gray-200">Scan Log</h3>
            {Object.entries(scanLog).map(([logKey, scan]) => (
              <div key={logKey} className={`text-xs p-1 my-0.5 rounded ${keyMomentInfo.highlight?.scanLogEntries?.includes(logKey) ? 'ring-1 ring-teal-500 bg-teal-100 dark:bg-teal-800' : ''}`}>
                <div className="font-mono"><span style={{ color: scan.color }}>{scan.transaction} ({scan.scanId}@{scan.time})</span> on {scan.table}</div>
                <div className="text-xxs dark:text-gray-300">Predicate: {scan.predicateString}</div>
                <div className="text-xxs dark:text-gray-300">Results: {scan.results.length} rows {keyMomentInfo.highlight?.scanLogEntries?.includes(logKey) && scan.results.length > 0 && ` = ${scan.results.map(r => r.name || r.id).join(', ')}`}</div>
              </div>
            ))}
            {Object.keys(scanLog).length === 0 && <div className="text-gray-500 dark:text-gray-400 italic">No scans yet</div>}
          </div>
          
          {/* Current Operation */}
          <div className={`p-3 rounded ${currentOpIsHighlighted ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/70' : 'bg-blue-100 dark:bg-gray-700'}`}>
            <h3 className="font-semibold mb-2 dark:text-gray-200">Current Operation</h3>
            {currentOp ? (
              <div className={`font-mono text-sm ${currentOpIsHighlighted ? 'font-bold text-purple-700 dark:text-purple-300' : 'dark:text-gray-100'}`}>
                <span style={{ color: currentOp.color }}>{currentOp.transaction}</span>: {currentOp.type.toUpperCase()}
                {currentOp.table && ` on ${currentOp.table}`}
                {currentOp.scanId && ` (ID: ${currentOp.scanId})`}
                {currentOp.insertId && ` (ID: ${currentOp.insertId})`}
                {currentOp.type === 'scan' && <div className="text-xs dark:text-gray-300">Predicate: {currentOp.predicate.toString()}</div>}
                {currentOp.type === 'insert' && <pre className="text-xs whitespace-pre-wrap dark:text-gray-300">{JSON.stringify(currentOp.data, null,1)}</pre>}
              </div>
            ) : <div className="text-gray-500 dark:text-gray-400 italic">None</div>}
          </div>
        </div>
      </div>

      {keyMomentInfo.text && (
        <div className={`my-6 p-4 rounded-lg border-2 transition-all duration-300 ease-in-out ${
            keyMomentInfo.isCritical ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg scale-105' : 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${keyMomentInfo.isCritical ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
            🔍 Insight at Step {keyMomentInfo.step} (Time: {allOperations[keyMomentInfo.step-1]?.time})
          </h3>
          <p className={`text-sm ${keyMomentInfo.isCritical ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{keyMomentInfo.text}</p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button onClick={resumeSimulation} className="mt-3 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">Continue</button>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6" ref={timelineRef}>
        <h2 className="text-xl font-semibold mb-4 dark:text-gray-100">Transaction Timelines</h2>
        <div className="relative mb-6 pt-3">
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-[2.5%] w-[95%]">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const timeVal = i * 10;
              if (timeVal > maxTime -5) return null;
              return (
                <div key={i} className="relative flex flex-col items-center">
                  <div className="absolute w-px h-2 bg-gray-300 dark:bg-gray-600 -top-2"></div><div>{timeVal}</div>
                </div>);
            })}
          </div>
          {(isRunning || currentStep > 0) && (
            <div className="absolute top-[6px] w-0.5 h-6 bg-red-500 transition-all duration-200 ease-linear z-20"
              style={{ left: `${getTimePosition(currentTime)}%` }}>
              <div className="absolute -top-2 -left-[7px] w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800 shadow-md"></div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: tx.color }}></div>
                <h3 className="text-lg font-semibold dark:text-gray-100">{txName}</h3>
              </div>
              <div className="relative h-8 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="absolute top-0 left-0 h-full rounded opacity-30"
                  style={{ backgroundColor: tx.color, width: `${getTimePosition(tx.operations[tx.operations.length - 1].time)}%`}}>
                </div>
                {tx.operations.map((op, idx) => {
                  const isActiveOp = isOperationActive(op, txName);
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(
                    hOp => hOp.transaction === txName && hOp.time === op.time) && keyMomentInfo.step !== null;
                  
                  let opChar = op.type.charAt(0).toUpperCase();
                  if (op.type === 'scan') opChar = 'S';
                  else if (op.type === 'insert') opChar = 'I';

                  let tooltipText = op.type.toUpperCase();
                  if (op.table) tooltipText += ` ${op.table}`;
                  if (op.scanId) tooltipText += ` (ID:${op.scanId})`;
                  if (op.insertId) tooltipText += ` (ID:${op.insertId})`;
                  if (op.type === 'scan' && isActiveOp) {
                     const logKey = `${txName}_${op.scanId}_${op.time}`;
                     const scanDetails = scanLog[logKey];
                     if(scanDetails) tooltipText += ` - Found ${scanDetails.results.length} rows`;
                  }
                  if (op.type === 'insert' && op.data) {
                    tooltipText += ` - Data: ${op.data.name || op.data.id}`;
                  }


                  return (
                    <div
                      key={`${txName}-${op.type}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group
                        ${isActiveOp ? 'bg-white dark:bg-gray-200 shadow-lg scale-105' : 'bg-gray-200 dark:bg-gray-600 opacity-70'}
                        ${isHighlightedOp ? 'ring-2 ring-offset-1 ring-red-500 scale-110 z-10' : ''}
                      `}
                      style={{ 
                        left: `calc(${getTimePosition(op.time)}% - 18px)`, // half of width
                        borderColor: tx.color,
                        color: isActiveOp ? tx.color : '#6b7280', // gray-500
                      }}
                      title={tooltipText}
                    >
                      {opChar}
                      {isActiveOp && (
                        <div className={`absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                                        bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-30
                                        transition-opacity duration-200 opacity-0 group-hover:opacity-100 pointer-events-none`}>
                          {tooltipText}
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
          <h4 className="font-semibold mb-2 dark:text-gray-100">Legend</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2 text-sm dark:text-gray-300">
            {[
              {char: 'B', desc: 'Begin'}, {char: 'S', desc: 'Scan (Range Query)'}, {char: 'I', desc: 'Insert'},
              {char: 'C', desc: 'Commit'}, {char: 'A', desc: 'Abort'}
            ].map(item => (
                 <div key={item.char} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-500 dark:border-gray-400 bg-white dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-700 dark:text-gray-200">{item.char}</div>
                    <span>{item.desc}</span>
                 </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Understanding Phantom Reads</h3>
        <p className="text-yellow-700 dark:text-yellow-300 text-sm mb-3">
          A <strong>Phantom Read</strong> occurs when a transaction executes a range query (e.g., "find all employees in Engineering") twice, and the set of rows returned by the second query is different from the first. This happens because another transaction has inserted or deleted rows that match the query's criteria and committed those changes in between the two queries of the first transaction. The newly appeared (or disappeared) rows are called "phantoms."
        </p>
        <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded text-sm mt-2">
          <h4 className="font-semibold mb-1 dark:text-yellow-100">Key Observation Points:</h4>
          <ul className="text-xs space-y-1 list-disc list-inside text-yellow-700 dark:text-yellow-300">
            <li><strong>Step 2:</strong> T1's first scan of 'Engineering' employees finds Alice and David.</li>
            <li><strong>Step 4 & 5:</strong> T2 inserts 'Charlie' into 'Engineering' and commits this change.</li>
            <li><strong>Step 6:</strong> T1's second scan of 'Engineering' employees now finds Alice, David, AND 'Charlie'. 'Charlie' is the phantom row.</li>
            <li>This anomaly can lead to inconsistencies if T1 was performing calculations or making decisions based on the assumption that the set of rows matching its criteria would not change during its execution.</li>
            <li>Phantom reads are typically prevented by higher isolation levels like Serializable, or by specific locking strategies (e.g., predicate locks, though not widely implemented, or careful range locking).</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PhantomReadVisualizer;