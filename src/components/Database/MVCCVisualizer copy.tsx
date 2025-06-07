import React, { useState, useEffect, useRef } from 'react';

// --- Configuration for MVCC Visualization (Non-Repeatable Read Scenario) ---
const mvccScenario = {
  name: "Non-Repeatable Read Scenario with MVCC",
  description: "T1 reads an item. T2 updates and commits the item. T1 reads the item again. With MVCC, T1 should still see the original value due to its snapshot isolation.",
  initialDataItems: {
    balance: [{ id: 'v0', value: 100, txMin: 0, txMax: null }] // txMin: 0 represents initially committed data
  },
  transactions: {
    T1: {
      color: '#3b82f6', // Blue
      operations: [
        { type: 'begin', time: 0 },
        { type: 'read', time: 10, target: 'balance' },
        { type: 'read', time: 50, target: 'balance', comment: "Second read by T1" },
        { type: 'commit', time: 60 }
      ]
    },
    T2: {
      color: '#10b981', // Emerald
      operations: [
        { type: 'begin', time: 5 },
        { type: 'read', time: 20, target: 'balance' },
        { type: 'write', time: 30, target: 'balance', value: 150, comment: "T2 updates balance" }, // New value
        { type: 'commit', time: 40 }
      ]
    }
  },
  keyMoments: [
    {
      step: 2, // T1 reads balance
      text: "T1 begins and reads 'balance'. Its snapshot is based on the initial state (balance=100). T1 sees version v0.",
      autoPause: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T1', time: 10 }], dataItemVersions: { balance: ['v0'] } }
    },
    {
      step: 4, // T2 reads balance
      text: "T2 begins and reads 'balance'. Its snapshot is also based on the initial state (balance=100), as T1 hasn't committed anything. T2 sees version v0.",
      autoPause: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T2', time: 20 }], dataItemVersions: { balance: ['v0'] } }
    },
    {
      step: 5, // T2 writes balance
      text: "T2 writes 'balance = 150'. This creates a new uncommitted version (let's call it v1) and marks v0 as superseded by T2 (uncommitted).",
      autoPause: true, isCritical: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T2', time: 30 }], dataItemVersions: { balance: ['v0', 'v1'] } }
    },
    {
      step: 6, // T2 commits
      text: "T2 commits. Its write (balance=150, v1) becomes permanent. Version v0 is now permanently superseded by T2's transaction.",
      autoPause: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T2', time: 40 }], dataItemVersions: { balance: ['v0', 'v1'] } }
    },
    {
      step: 7, // T1 reads balance again
      text: "✅ NON-REPEATABLE READ PREVENTED! T1 reads 'balance' again. Crucially, T1 uses its *original snapshot* taken at Step 1. Even though T2 committed a change, T1 still sees balance=100 (version v0) because v1 (created by T2) was not committed when T1 started.",
      autoPause: true, isCritical: false, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T1', time: 50 }], dataItemVersions: { balance: ['v0', 'v1'] } }
    },
    {
      step: 8, // T1 commits
      text: "T1 commits. Its operations were based on a consistent view of the data.",
      autoPause: false, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T1', time: 60 }] }
    }
  ]
};

let versionCounter = 1; // For unique version IDs like v1, v2, ...

const MvccVisualizer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  // MVCC specific state
  const [dataItemVersions, setDataItemVersions] = useState(JSON.parse(JSON.stringify(mvccScenario.initialDataItems)));
  const [transactionDetails, setTransactionDetails] = useState({}); // { T1: {id, snapshotCommittedIds, status, reads, writes} }
  const [committedTxIds, setCommittedTxIds] = useState(new Set([0])); // 0 for initial data

  const [completedOperations, setCompletedOperations] = useState([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });

  const timelineRef = useRef(null);
  const nextTxIdRef = useRef(1); // Keep track of the next available transaction ID

  const { transactions, keyMoments } = mvccScenario;

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

  const maxTime = Math.max(...allOperations.map(op => op.time)) + 10;

  // --- MVCC Core Logic ---
  const findVisibleVersion = (itemHistory, currentTxId, txSnapshotCommittedIds, currentStepCommittedTxIds) => {
    const visibleVersions = itemHistory.filter(v => {
      const createdBySelf = v.txMin === currentTxId;
      const createdByCommittedPrior = txSnapshotCommittedIds.has(v.txMin);

      const validCreator = createdBySelf || createdByCommittedPrior;
      if (!validCreator) return false;

      const notDeleted = v.txMax === null;
      const deletedBySelf = v.txMax === currentTxId;
      const deletedByUncommittedOrFuture = v.txMax !== null && !txSnapshotCommittedIds.has(v.txMax);
      
      const validDeletionState = notDeleted || deletedBySelf || deletedByUncommittedOrFuture;
      return validDeletionState;
    });

    // Sort by version ID (descending to get latest) or txMin (descending)
    // Assuming version IDs like 'v0', 'v1' can be sorted lexicographically after removing 'v'
    visibleVersions.sort((a, b) => parseInt(b.id.substring(1)) - parseInt(a.id.substring(1)));
    return visibleVersions.length > 0 ? visibleVersions[0] : null;
  };

  const calculateStateUpToStep = (step) => {
    let tempVersions = JSON.parse(JSON.stringify(mvccScenario.initialDataItems));
    let tempTxDetails = {};
    let tempCommittedTxIds = new Set([0]);
    let tempNextTxId = 1;
    let tempCompletedOps = [];
    versionCounter = 1; // Reset for fresh calculation

    const operationsToProcess = allOperations.slice(0, step);

    operationsToProcess.forEach(op => {
      const txName = op.transaction;

      if (op.type === 'begin') {
        const newTxId = tempNextTxId++;
        tempTxDetails[txName] = {
          id: newTxId,
          name: txName,
          snapshotCommittedIds: new Set(tempCommittedTxIds),
          status: 'active',
          reads: {},
          writes: [] // Store {item, newVersionId, oldVersionId}
        };
      } else if (tempTxDetails[txName]?.status === 'active') {
        const tx = tempTxDetails[txName];
        if (op.type === 'read') {
          const itemHistory = tempVersions[op.target];
          const visibleVersion = findVisibleVersion(itemHistory, tx.id, tx.snapshotCommittedIds, tempCommittedTxIds);
          tx.reads[op.target] = visibleVersion 
            ? { value: visibleVersion.value, versionId: visibleVersion.id, time: op.time } 
            : { value: 'N/A', versionId: 'N/A', time: op.time };
        } else if (op.type === 'write') {
          const itemHistory = tempVersions[op.target];
          // A write is based on the version the transaction *would* see if it read now
          const baseVersion = findVisibleVersion(itemHistory, tx.id, tx.snapshotCommittedIds, tempCommittedTxIds);
          
          const newVersionId = `v${versionCounter++}`;
          const newVersion = { id: newVersionId, value: op.value, txMin: tx.id, txMax: null };
          
          if (baseVersion) {
            // Find the actual object in itemHistory to modify its txMax
            const actualBaseVersionInDb = itemHistory.find(v => v.id === baseVersion.id);
            if (actualBaseVersionInDb) {
                 actualBaseVersionInDb.txMax = tx.id; // Mark as superseded by this tx
            }
          }
          itemHistory.push(newVersion);
          tx.writes.push({ item: op.target, newVersionId: newVersion.id, oldVersionId: baseVersion?.id });
        } else if (op.type === 'commit') {
          tempCommittedTxIds.add(tx.id);
          tx.status = 'committed';
        } else if (op.type === 'abort') { // Not in this scenario, but for completeness
          tx.status = 'aborted';
          // Rollback: remove versions created by this tx, undo invalidations
          Object.values(tempVersions).forEach(itemHistory => {
            // Remove versions created by this tx
            tempVersions[op.target] = itemHistory.filter(v => v.txMin !== tx.id);
            // Undo invalidations made by this tx
            itemHistory.forEach(v => {
              if (v.txMax === tx.id) v.txMax = null;
            });
          });
        }
      }
      tempCompletedOps.push({...op, transactionColor: transactions[op.transaction].color, txId: tempTxDetails[txName]?.id });
    });

    return {
      dbVersions: tempVersions,
      txDetails: tempTxDetails,
      committedIds: tempCommittedTxIds,
      completedOps: tempCompletedOps,
      nextTxId: tempNextTxId
    };
  };

  const updateStateForStep = (newStep) => {
    if (newStep === 0) {
      setCurrentTime(0);
      setDataItemVersions(JSON.parse(JSON.stringify(mvccScenario.initialDataItems)));
      setTransactionDetails({});
      setCommittedTxIds(new Set([0]));
      setCompletedOperations([]);
      setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
      nextTxIdRef.current = 1;
      versionCounter = 1;
    } else {
      const operation = allOperations[newStep - 1];
      setCurrentTime(operation.time);
      
      const state = calculateStateUpToStep(newStep);
      setDataItemVersions(state.dbVersions);
      setTransactionDetails(state.txDetails);
      setCommittedTxIds(state.committedIds);
      setCompletedOperations(state.completedOps);
      nextTxIdRef.current = state.nextTxId;


      const moment = keyMoments.find(km => km.step === newStep);
      if (moment) {
        setKeyMomentInfo({ ...moment, step: newStep });
        if (moment.autoPause && isRunning && !isPaused) setIsPaused(true);
      } else if (keyMomentInfo.step !== null && keyMomentInfo.step !== newStep) {
        setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
      }
    }
  };

  useEffect(() => {
    if (isRunning && !isPaused) {
      const interval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= allOperations.length) {
            setIsRunning(false); setIsPaused(false); return prev;
          }
          const newStep = prev + 1;
          updateStateForStep(newStep);
          return newStep;
        });
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, allOperations]);

  const startSimulation = () => {
    setCurrentStep(0); 
    setIsRunning(true); setIsPaused(false);
    setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
    setCurrentStep(prev => { const newStep = 1; if (newStep <= allOperations.length) updateStateForStep(newStep); return newStep; });
  };
  const pauseSimulation = () => setIsPaused(true);
  const resumeSimulation = () => {
    setIsPaused(false);
    if (keyMomentInfo.autoPause && keyMomentInfo.step === currentStep) {
      setKeyMomentInfo(prev => ({ ...prev, autoPause: false })); 
    }
  };
  const resetSimulation = () => {
    setIsRunning(false); setIsPaused(false); setCurrentStep(0); updateStateForStep(0);
  };
  const stepForward = () => {
    if (currentStep < allOperations.length) { const newStep = currentStep + 1; setCurrentStep(newStep); updateStateForStep(newStep); }
  };
  const stepBackward = () => {
    if (currentStep > 0) { const newStep = currentStep - 1; setCurrentStep(newStep); updateStateForStep(newStep); }
  };

  const getTimePosition = (time) => (time / maxTime) * 95;
  const currentOp = currentStep > 0 ? allOperations[currentStep - 1] : null;
  const currentOpIsHighlighted = currentOp && keyMomentInfo.highlight?.currentOpPanel && keyMomentInfo.step === currentStep;

  const getVersionStatus = (version, txIdForSnapshotView = null, snapshotCommittedIds = null) => {
    let status = "";
    const isCreatorCommitted = committedTxIds.has(version.txMin);
    const isInvalidatorCommitted = version.txMax !== null && committedTxIds.has(version.txMax);

    if (version.txMin === 0) status = "Initial";
    else status = isCreatorCommitted ? `Committed (by T${version.txMin})` : `Uncommitted (by T${version.txMin})`;

    if (version.txMax !== null) {
      status += isInvalidatorCommitted ? ` | Superseded (by T${version.txMax})` : ` | Uncommitted Invalidation (by T${version.txMax})`;
    } else {
      status += " | Current";
    }
    
    if (txIdForSnapshotView && snapshotCommittedIds) {
        const visibleVersion = findVisibleVersion([version], txIdForSnapshotView, snapshotCommittedIds, committedTxIds);
        status += visibleVersion && visibleVersion.id === version.id ? " (Visible in Snapshot)" : " (Not Visible in Snapshot)";
    }
    return status;
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{mvccScenario.name}</h1>
        <p className="text-gray-600 dark:text-gray-400">{mvccScenario.description}</p>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-3">
            <button onClick={startSimulation} disabled={isRunning && !isPaused} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-500">Auto Run</button>
            {isRunning && (isPaused ? 
                <button onClick={resumeSimulation} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Resume</button> :
                <button onClick={pauseSimulation} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">Pause</button>
            )}
            <button onClick={resetSimulation} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Reset</button>
            <div className="border-l border-gray-600 pl-3 flex gap-2">
                <button onClick={stepBackward} disabled={currentStep === 0 || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-500">← Step</button>
                <button onClick={stepForward} disabled={currentStep >= allOperations.length || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-500">Step →</button>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-mono">Step: {currentStep} / {allOperations.length}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Time: {currentTime} | Next TxID: {nextTxIdRef.current}</div>
          </div>
        </div>
      </div>
      
      {/* State Displays Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 text-sm">
        {/* Data Item Versions */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-lg border-b border-gray-300 dark:border-gray-600 pb-2">Data Item Versions (Global View)</h3>
          {Object.entries(dataItemVersions).map(([itemName, versions]) => (
            <div key={itemName} className="mb-4">
              <h4 className="font-semibold text-fuchsia-400 mb-1">{itemName}:</h4>
              <ul className="space-y-1">
                {versions.map(v => {
                  const isHighlighted = keyMomentInfo.highlight?.dataItemVersions?.[itemName]?.includes(v.id);
                  const creatorTx = transactionDetails[Object.keys(transactionDetails).find(key => transactionDetails[key].id === v.txMin)];
                  const invalidatorTx = transactionDetails[Object.keys(transactionDetails).find(key => transactionDetails[key].id === v.txMax)];
                  
                  return (
                    <li key={v.id} className={`p-1.5 rounded text-xs font-mono flex justify-between items-center
                      ${isHighlighted ? 'ring-2 ring-yellow-400 bg-gray-100 dark:bg-gray-600' : 'bg-gray-200 dark:bg-gray-800'}`}>
                      <span>
                        ID: <span className="text-yellow-300">{v.id}</span>,
                        Value: <span className="text-green-300">{v.value}</span>,
                        txMin: <span style={{color: creatorTx?.name ? transactions[creatorTx.name]?.color : '#ccc'}}>{v.txMin === 0 ? 'Initial' : `T${v.txMin}`}</span>,
                        txMax: <span style={{color: invalidatorTx?.name ? transactions[invalidatorTx.name]?.color : '#ccc'}}>{v.txMax === null ? 'NULL' : `T${v.txMax}`}</span>
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                          committedTxIds.has(v.txMin) && (v.txMax === null || !committedTxIds.has(v.txMax)) ? 'bg-green-500 text-white' : 
                          committedTxIds.has(v.txMin) && v.txMax !== null && committedTxIds.has(v.txMax) ? 'bg-red-500 text-white' : 'bg-gray-500 text-gray-200'
                        }`}>
                        {committedTxIds.has(v.txMin) && (v.txMax === null || !committedTxIds.has(v.txMax)) ? 'Visible (Latest Committed)' : 
                         committedTxIds.has(v.txMin) && v.txMax !== null && committedTxIds.has(v.txMax) ? 'Superseded (Committed)' : 
                         !committedTxIds.has(v.txMin) ? `Uncommitted (by T${v.txMin})` : 'Partially Committed State'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Transaction Details & Current Op */}
        <div className="space-y-4">
          <div className={`bg-gray-700 p-3 rounded-lg shadow ${currentOpIsHighlighted ? 'ring-2 ring-purple-400' : ''}`}>
            <h3 className="font-semibold mb-2 border-b border-gray-600 pb-1">Current Operation</h3>
            {currentOp ? (
              <div className={`font-mono text-sm ${currentOpIsHighlighted ? 'text-purple-300 font-bold' : ''}`}>
                <span style={{ color: currentOp.color }}>{currentOp.transaction} (TxID: {transactionDetails[currentOp.transaction]?.id})</span>: {currentOp.type.toUpperCase()}
                {currentOp.target && ` ${currentOp.target}`}
                {currentOp.value !== undefined && ` = ${currentOp.value}`}
                {currentOp.comment && <span className="text-xs text-gray-400 block italic">({currentOp.comment})</span>}
              </div>
            ) : <div className="text-gray-500 dark:text-gray-400 italic">None</div>}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg shadow">
            <h3 className="font-semibold mb-2 border-b border-gray-300 dark:border-gray-600 pb-1">Transaction States & Snapshots</h3>
            {Object.values(transactionDetails).map(tx => (
              <div key={tx.id} className="mb-2 p-2 bg-gray-200 dark:bg-gray-800 rounded text-xs">
                <p className="font-bold" style={{ color: transactions[tx.name]?.color }}>
                  {tx.name} (ID: {tx.id}) - Status: <span className={tx.status === 'committed' ? 'text-green-400' : tx.status === 'aborted' ? 'text-red-400' : 'text-yellow-400'}>{tx.status}</span>
                </p>
                <p>Snapshot TxIDs: <span className="font-mono text-fuchsia-300">[{[...tx.snapshotCommittedIds].join(', ')}]</span></p>
                {Object.entries(tx.reads).map(([item, readInfo]) => (
                  <p key={`${item}-${readInfo.time}`}>
                    Read <span className="text-yellow-300">{item}</span> at t={readInfo.time}: Value <span className="text-green-300">{readInfo.value}</span> (from <span className="text-yellow-300">{readInfo.versionId}</span>)
                  </p>
                ))}
              </div>
            ))}
             {Object.keys(transactionDetails).length === 0 && <div className="text-gray-500 dark:text-gray-400 italic">No active transactions.</div>}
          </div>
        </div>
      </div>

      {/* Key Moment Panel */}
      {keyMomentInfo.text && (
        <div className={`my-6 p-4 rounded-lg border-2 transition-all duration-300 ease-in-out ${
            keyMomentInfo.isCritical ? 'border-red-500 bg-red-900/30 shadow-lg scale-105' : 'border-blue-500 bg-blue-900/30'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${keyMomentInfo.isCritical ? 'text-red-300' : 'text-blue-300'}`}>
            🔍 Insight at Step {keyMomentInfo.step} (Time: {allOperations[keyMomentInfo.step-1]?.time})
          </h3>
          <p className={`text-sm ${keyMomentInfo.isCritical ? 'text-red-400' : 'text-blue-400'}`}>{keyMomentInfo.text}</p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button onClick={resumeSimulation} className="mt-3 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">Continue</button>
          )}
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="bg-white dark:bg-gray-700 rounded-lg shadow-md p-6" ref={timelineRef}>
        <h2 className="text-xl font-semibold mb-4">Transaction Timelines</h2>
        <div className="relative mb-8 pt-4"> {/* Time axis */}
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-400 dark:bg-gray-500"></div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-[2.5%] w-[95%]">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const timeVal = i * 10; if (timeVal > maxTime -5) return null;
              return (<div key={i} className="relative flex flex-col items-center"><div className="absolute w-px h-2 bg-gray-500 -top-2"></div><div>{timeVal}</div></div>);
            })}
          </div>
          {(isRunning || currentStep > 0) && (
            <div className="absolute top-[6px] w-0.5 h-6 bg-red-500 transition-all duration-200 ease-linear z-20" style={{ left: `${getTimePosition(currentTime)}%` }}>
              <div className="absolute -top-2 -left-[7px] w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
            </div>
          )}
        </div>
        <div className="space-y-8">
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-2"><div className="w-4 h-4 rounded-full mr-3 flex-shrink-0" style={{ backgroundColor: tx.color }}></div><h3 className="text-lg font-semibold">{txName}</h3></div>
              <div className="relative h-10 bg-gray-200 dark:bg-gray-800 rounded">
                <div className="absolute top-0 left-0 h-full rounded opacity-30" style={{ backgroundColor: tx.color, width: `${getTimePosition(tx.operations[tx.operations.length - 1].time)}%`}}></div>
                {tx.operations.map((op, idx) => {
                  const opGlobalInfo = completedOperations.find(co => co.transaction === txName && co.time === op.time && co.type === op.type);
                  const isActiveOp = opGlobalInfo !== undefined;
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(hOp => hOp.transaction === txName && hOp.time === op.time) && keyMomentInfo.step !== null;
                  
                  let title = `${op.type.toUpperCase()}${op.target ? ` ${op.target}` : ''}${op.value !== undefined ? ` = ${op.value}` : ''}`;
                  if (opGlobalInfo && op.type === 'read') {
                    const readDetails = transactionDetails[txName]?.reads[op.target];
                    if (readDetails && readDetails.time === op.time) title += ` -> ${readDetails.value} (v: ${readDetails.versionId})`;
                  }
                  
                  return (
                    <div
                      key={`${txName}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group
                        ${isActiveOp ? 'bg-white shadow-lg scale-105' : 'bg-gray-400 dark:bg-gray-600 opacity-70'}
                        ${isHighlightedOp ? 'ring-4 ring-offset-1 ring-red-400 scale-125 z-10' : ''}`}
                      style={{ left: `calc(${getTimePosition(op.time)}% - 16px)`, borderColor: tx.color, color: isActiveOp ? tx.color : '#a0aec0' }}
                      title={title}
                    >
                      {op.type.charAt(0).toUpperCase()}
                       {isActiveOp && (
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs whitespace-nowrap z-30 opacity-0 group-hover:opacity-100 pointer-events-none">
                          {title}
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
        <div className="mt-8 pt-4 border-t border-gray-600">
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2 text-sm">
            {['Begin', 'Read', 'Write', 'Commit', 'Abort'].map(item => (
                 <div key={item} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border-2 border-gray-400 bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-200">{item.charAt(0)}</div>
                    <span>{item}</span>
                 </div> ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MvccVisualizer;