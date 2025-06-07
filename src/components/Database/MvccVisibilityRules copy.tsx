import React, { useState, useEffect, useRef } from 'react';

// --- MVCC Visibility Rules Scenario ---
let versionCounter = 0; // Global for unique version IDs like v0, v1, ...
const generateVersionId = (prefix) => `${prefix}${versionCounter++}`;

const mvccVisibilityScenario = {
  name: "MVCC Visibility Rules Demonstration",
  description: "Illustrates how transactions see data based on snapshot isolation. Focus on T3's reads and how its snapshot (taken at t=40) affects what it sees from T1 and T2, even after they commit.",
  initialDataItems: {
    DataA: [{ id: generateVersionId('vA'), value: 100, txMin: 0, txMax: null, txMinName: 'Initial', txMaxName: null }],
    DataB: [{ id: generateVersionId('vB'), value: 500, txMin: 0, txMax: null, txMinName: 'Initial', txMaxName: null }]
  },
  transactions: {
    T1: {
      color: '#3b82f6', // Blue
      operations: [
        { type: 'begin', time: 0 },
        { type: 'read', time: 5, target: 'DataA' },
        { type: 'write', time: 10, target: 'DataA', value: 110 },
        { type: 'read', time: 15, target: 'DataA', comment: "T1 reads its own write" },
        { type: 'commit', time: 45 }
      ]
    },
    T2: {
      color: '#10b981', // Emerald
      operations: [
        { type: 'begin', time: 20 },
        { type: 'read', time: 25, target: 'DataA', comment: "T1's write is uncommitted" },
        { type: 'write', time: 30, target: 'DataB', value: 520 },
        { type: 'read', time: 35, target: 'DataB', comment: "T2 reads its own write" },
        { type: 'commit', time: 50 }
      ]
    },
    T3: {
      color: '#f59e0b', // Orange
      operations: [
        { type: 'begin', time: 40, comment: "Snapshot taken before T1/T2 commit" },
        { type: 'read', time: 55, target: 'DataA', comment: "T1 committed (t=45), T2 committed (t=50)" },
        { type: 'read', time: 60, target: 'DataB', comment: "T1 committed (t=45), T2 committed (t=50)" },
        { type: 'commit', time: 70 }
      ]
    }
  },
  keyMoments: [
    { step: 3, text: "T1 writes DataA=110. This creates a new version (v1A) by T1 (uncommitted) and marks the initial version (v0A) as superseded by T1 (uncommitted).", autoPause: true, highlight: { currentOpPanel: true, dataItemVersions: { DataA: ['vA0', 'vA1'] } } },
    { step: 4, text: "T1 reads DataA. It sees its own uncommitted write (v1A, value 110).", autoPause: true, highlight: { currentOpPanel: true, transactionSpecificRead: { txName: 'T1', item: 'DataA', versionId: 'vA1' } } },
    { step: 6, text: "T2 (snapshot: {0}) reads DataA. T1's write (v1A) is uncommitted. T1's invalidation of v0A (txMax=1) is also uncommitted. So, T2 sees the initial version v0A (value 100).", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, transactionSpecificRead: { txName: 'T2', item: 'DataA', versionId: 'vA0' } } },
    { step: 9, text: "T1 commits. Its creation of v1A (DataA=110) and invalidation of v0A are now permanent. Global committed set now includes TxID 1.", autoPause: true, highlight: { currentOpPanel: true, dataItemVersions: { DataA: ['vA0', 'vA1'] }, committedTx: 1 } },
    { step: 10, text: "T2 commits. Its creation of v1B (DataB=520) and invalidation of v0B are now permanent. Global committed set now includes TxID 1, 2.", autoPause: true, highlight: { currentOpPanel: true, dataItemVersions: { DataB: ['vB0', 'vB1'] }, committedTx: 2 } },
    { step: 11, text: "T3 (snapshot: {0}, taken at t=40) begins. At this time, neither T1 nor T2 had committed.", autoPause: true, highlight: { currentOpPanel: true, transactionState: 'T3' } },
    { step: 12, text: "SNAPSHOT ISOLATION: T3 reads DataA. T1 *is now globally committed*. However, T3's snapshot only contains {0}. \n- v0A (txMin:0, txMax:1(T1)): txMin 0 is in T3's snapshot. txMax 1 (T1) is NOT in T3's snapshot. So, v0A is visible to T3 (value 100).\n- v1A (txMin:1(T1)): txMin 1 (T1) is NOT in T3's snapshot. So, v1A is NOT visible to T3.", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, transactionSpecificRead: { txName: 'T3', item: 'DataA', versionId: 'vA0' } } },
    { step: 13, text: "SNAPSHOT ISOLATION: T3 reads DataB. T2 *is now globally committed*. However, T3's snapshot only contains {0}.\n- v0B (txMin:0, txMax:2(T2)): txMin 0 is in T3's snapshot. txMax 2 (T2) is NOT in T3's snapshot. So, v0B is visible to T3 (value 500).\n- v1B (txMin:2(T2)): txMin 2 (T2) is NOT in T3's snapshot. So, v1B is NOT visible to T3.", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, transactionSpecificRead: { txName: 'T3', item: 'DataB', versionId: 'vB0' } } },
  ]
};


const MvccVisibilityVisualizer = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const [dataItemVersions, setDataItemVersions] = useState({});
  const [transactionDetails, setTransactionDetails] = useState({});
  const [committedTxIds, setCommittedTxIds] = useState(new Set([0])); // 0 for initial data

  const [completedOperations, setCompletedOperations] = useState([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
  
  const nextTxIdRef = useRef(1);
  const timelineRef = useRef(null);

  const { transactions, keyMoments, initialDataItems } = mvccVisibilityScenario;

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

  const initializeState = () => {
    versionCounter = 0; // Reset global version counter
    const initialClonedData = JSON.parse(JSON.stringify(initialDataItems));
     // Regenerate IDs for initial items to ensure they are fresh if reset is called multiple times
    Object.keys(initialClonedData).forEach(itemName => {
        initialClonedData[itemName].forEach(version => {
            const prefix = itemName === 'DataA' ? 'vA' : 'vB'; // Example prefix logic
            version.id = generateVersionId(prefix);
        });
    });
    setDataItemVersions(initialClonedData);

    setTransactionDetails({});
    setCommittedTxIds(new Set([0]));
    setCompletedOperations([]);
    setKeyMomentInfo({ text: '', autoPause: false, isCritical: false, highlight: {}, step: null });
    nextTxIdRef.current = 1;
  };
  
  useEffect(() => {
    initializeState();
  }, []);


  // MVCC Visibility Logic
  const findVisibleVersion = (itemHistory, txLookingDetails, globalCommittedSet) => {
    if (!txLookingDetails || !itemHistory) return null;

    const visibleVersions = itemHistory.filter(v => {
      // Rule 1: Creator visibility
      // Version is visible if created by self (uncommitted is fine) OR created by a tx in our snapshot.
      const creatorIsSelf = v.txMin === txLookingDetails.id;
      const creatorInSnapshot = txLookingDetails.snapshotCommittedTxIds.has(v.txMin);
      if (!creatorIsSelf && !creatorInSnapshot) {
        return false;
      }

      // Rule 2: Invalidator visibility (if version was invalidated/superseded)
      if (v.txMax === null) return true; // Not invalidated, so visible by this rule.

      // If invalidated by self (and self is not yet committed), it's NOT visible for future reads by self.
      if (v.txMax === txLookingDetails.id && !globalCommittedSet.has(txLookingDetails.id)) {
        return false;
      }
      
      // If invalidator was committed *at the time of our snapshot*, the version is NOT visible.
      // This means the "deletion" was already effective for our view of the world.
      const invalidatorInSnapshot = txLookingDetails.snapshotCommittedTxIds.has(v.txMax);
      if (invalidatorInSnapshot) {
        return false;
      }
      
      // Otherwise (invalidator not in snapshot, or invalidator is self but committed), version is visible.
      // This covers cases where the invalidation happened "after" our snapshot, or by an uncommitted transaction.
      return true;
    });

    // Sort by txMin descending (preferring higher txMin for "latest" among visible)
    // or by version ID if txMin is the same (e.g. multiple versions by same initial tx, though not in this scenario)
    visibleVersions.sort((a, b) => {
        if (b.txMin !== a.txMin) return b.txMin - a.txMin;
        return parseInt(b.id.substring(2)) - parseInt(a.id.substring(2)); // Sort vA1 before vA0
    });
    return visibleVersions.length > 0 ? visibleVersions[0] : null;
  };


  const calculateStateUpToStep = (step) => {
    versionCounter = 0; // Reset for deterministic ID generation during calculation
    let tempVersions = JSON.parse(JSON.stringify(initialDataItems));
    // Re-generate initial IDs to match what initializeState does
    Object.keys(tempVersions).forEach(itemName => {
        tempVersions[itemName].forEach(version => {
            const prefix = itemName === 'DataA' ? 'vA' : 'vB';
            version.id = generateVersionId(prefix);
        });
    });

    let tempTxDetails = {};
    let tempCommittedIds = new Set([0]);
    let tempNextTxId = 1;
    let tempCompletedOps = [];

    const operationsToProcess = allOperations.slice(0, step);

    operationsToProcess.forEach(op => {
      const txName = op.transaction;

      if (op.type === 'begin') {
        const newTxId = tempNextTxId++;
        tempTxDetails[txName] = {
          id: newTxId,
          name: txName,
          startTime: op.time,
          snapshotCommittedTxIds: new Set(tempCommittedIds), // CRITICAL: Snapshot taken here
          status: 'active',
          reads: [],
          writesMade: [] // To track versions created/invalidated by this tx
        };
      } else if (tempTxDetails[txName]?.status === 'active') {
        const tx = tempTxDetails[txName];
        if (op.type === 'read') {
          const itemHistory = tempVersions[op.target];
          const visibleVersion = findVisibleVersion(itemHistory, tx, tempCommittedIds);
          tx.reads.push({ 
            item: op.target, 
            value: visibleVersion?.value, 
            versionId: visibleVersion?.id,
            versionTxMin: visibleVersion?.txMin,
            time: op.time 
          });
        } else if (op.type === 'write') {
          const itemHistory = tempVersions[op.target];
          const baseVersion = findVisibleVersion(itemHistory, tx, tempCommittedIds); // Version this write is based on
          
          const newVersionId = generateVersionId(op.target === 'DataA' ? 'vA' : 'vB');
          const newVersion = { 
            id: newVersionId, 
            value: op.value, 
            txMin: tx.id, 
            txMax: null,
            txMinName: tx.name,
            txMaxName: null
          };
          
          if (baseVersion) {
            // Find the actual object in itemHistory to modify its txMax
            const actualBaseInDb = itemHistory.find(v => v.id === baseVersion.id);
            if (actualBaseInDb && actualBaseInDb.txMax === null) { // Only mark if not already marked by another committed tx
                 actualBaseInDb.txMax = tx.id;
                 actualBaseInDb.txMaxName = tx.name;
            }
          }
          itemHistory.push(newVersion);
          tx.writesMade.push({ item: op.target, newVersionId: newVersion.id, oldVersionId: baseVersion?.id });
        } else if (op.type === 'commit') {
          tempCommittedIds.add(tx.id);
          tx.status = 'committed';
        } else if (op.type === 'abort') {
          tx.status = 'aborted';
          // Rollback logic:
          // Remove versions created by this tx.
          // Reset txMax on versions this tx tried to invalidate.
          Object.keys(tempVersions).forEach(itemName => {
            tempVersions[itemName] = tempVersions[itemName].filter(v => v.txMin !== tx.id);
            tempVersions[itemName].forEach(v => {
              if (v.txMax === tx.id) {
                v.txMax = null;
                v.txMaxName = null;
              }
            });
          });
        }
      }
      tempCompletedOps.push({...op, txId: tempTxDetails[txName]?.id });
    });
    
    return {
      dbVersions: tempVersions,
      txDetails: tempTxDetails,
      committedIds: tempCommittedIds,
      completedOps: tempCompletedOps,
      nextTxId: tempNextTxId
    };
  };

  const updateStateForStep = (newStep) => {
    if (newStep === 0) {
      initializeState(); // Resets everything including versionCounter via initializeState
      setCurrentTime(0);
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
      }, 1300); // Slightly slower for more complex scenario
      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused]);

  const startSimulation = () => {
    updateStateForStep(0); // Full reset before starting
    setIsRunning(true); setIsPaused(false);
    setCurrentStep(1); // Start from step 1
    updateStateForStep(1);
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
  const stepForward = () => { if (currentStep < allOperations.length) { const newStep = currentStep + 1; setCurrentStep(newStep); updateStateForStep(newStep); } };
  const stepBackward = () => { if (currentStep > 0) { const newStep = currentStep - 1; setCurrentStep(newStep); updateStateForStep(newStep); } };

  const getTimePosition = (time) => (time / maxTime) * 95;
  const currentOp = currentStep > 0 ? allOperations[currentStep - 1] : null;
  const currentOpIsHighlighted = currentOp && keyMomentInfo.highlight?.currentOpPanel && keyMomentInfo.step === currentStep;


  const getTxNameById = (txId) => {
    if (txId === 0) return 'Initial';
    const entry = Object.entries(transactionDetails).find(([name, details]) => details.id === txId);
    return entry ? entry[0] : `Tx${txId}`;
  };


  return (
    <div className="w-full min-h-screen bg-slate-800 text-slate-100 p-4 sm:p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{mvccVisibilityScenario.name}</h1>
        <p className="text-sm text-slate-400">{mvccVisibilityScenario.description}</p>
      </header>

      {/* Controls */}
      <div className="bg-slate-700 rounded-lg shadow-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={startSimulation} disabled={isRunning && !isPaused} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-slate-500 text-sm">Auto Run</button>
            {isRunning && (isPaused ? 
                <button onClick={resumeSimulation} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Resume</button> :
                <button onClick={pauseSimulation} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">Pause</button>
            )}
            <button onClick={resetSimulation} className="px-4 py-2 bg-slate-500 text-white rounded hover:bg-slate-600 text-sm">Reset</button>
            <div className="sm:border-l border-slate-600 sm:pl-2 flex gap-2">
                <button onClick={stepBackward} disabled={currentStep === 0 || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-slate-500 text-sm">← Step</button>
                <button onClick={stepForward} disabled={currentStep >= allOperations.length || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-slate-500 text-sm">Step →</button>
            </div>
          </div>
          <div className="text-right text-xs sm:text-sm">
            <div className="font-mono">Step: {currentStep}/{allOperations.length} | Time: {currentTime}</div>
            <div className="text-slate-400">Next TxID: {nextTxIdRef.current} | Committed: [{[...committedTxIds].sort((a,b)=>a-b).join(', ')}]</div>
          </div>
        </div>
      </div>
      
      {/* State Displays Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 text-xs sm:text-sm">
        {/* Data Item Versions (Global View) */}
        <div className="lg:col-span-3 bg-slate-700 p-4 rounded-lg shadow-xl">
          <h3 className="font-semibold mb-3 text-base sm:text-lg border-b border-slate-600 pb-2">Data Item Versions (Global State)</h3>
          {Object.entries(dataItemVersions).map(([itemName, versions]) => (
            <div key={itemName} className="mb-4">
              <h4 className="font-medium text-fuchsia-400 mb-1 text-sm sm:text-base">{itemName}:</h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
                {versions.map(v => {
                  const isHighlighted = keyMomentInfo.highlight?.dataItemVersions?.[itemName]?.includes(v.id);
                  const creatorTxDetails = Object.values(transactionDetails).find(td => td.id === v.txMin);
                  const invalidatorTxDetails = Object.values(transactionDetails).find(td => td.id === v.txMax);

                  let versionStatus = "";
                  if (v.txMin === 0) versionStatus = "Initial";
                  else versionStatus = committedTxIds.has(v.txMin) ? `Committed by ${getTxNameById(v.txMin)}` : `Uncommitted by ${getTxNameById(v.txMin)}`;
                  
                  if (v.txMax !== null) {
                    versionStatus += committedTxIds.has(v.txMax) ? ` / Superseded by committed ${getTxNameById(v.txMax)}` : ` / Marked by uncommitted ${getTxNameById(v.txMax)}`;
                  }

                  return (
                    <div key={v.id} className={`p-1.5 rounded text-xs font-mono flex flex-col sm:flex-row sm:justify-between sm:items-center
                      ${isHighlighted ? 'ring-2 ring-yellow-400 bg-slate-600' : 'bg-slate-800'}`}>
                      <div className="flex-grow">
                        ID: <span className="text-yellow-300">{v.id}</span>,
                        Val: <span className="text-green-300 font-semibold">{v.value}</span><br className="sm:hidden"/>
                        <span className="text-slate-400"> txMin:</span> <span style={{color: creatorTxDetails?.name ? transactions[creatorTxDetails.name]?.color : '#ccc'}}>{getTxNameById(v.txMin)}</span>,
                        <span className="text-slate-400"> txMax:</span> <span style={{color: invalidatorTxDetails?.name ? transactions[invalidatorTxDetails.name]?.color : '#ccc'}}>{v.txMax === null ? 'NULL' : getTxNameById(v.txMax)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 sm:mt-0 sm:ml-2 self-start sm:self-center">({versionStatus})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Transaction Details & Current Op */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`bg-slate-700 p-3 rounded-lg shadow-xl ${currentOpIsHighlighted ? 'ring-2 ring-purple-400' : ''}`}>
            <h3 className="font-semibold mb-2 border-b border-slate-600 pb-1 text-sm sm:text-base">Current Operation</h3>
            {currentOp ? (
              <div className={`font-mono text-xs ${currentOpIsHighlighted ? 'text-purple-300 font-bold' : ''}`}>
                <span style={{ color: currentOp.color }}>{currentOp.transaction} (TxID: {transactionDetails[currentOp.transaction]?.id})</span>: {currentOp.type.toUpperCase()}
                {currentOp.target && ` ${currentOp.target}`}
                {currentOp.value !== undefined && ` = ${currentOp.value}`}
                {currentOp.comment && <span className="text-[10px] text-slate-400 block italic">({currentOp.comment})</span>}
              </div>
            ) : <div className="text-slate-400 italic">None</div>}
          </div>

          <div className="bg-slate-700 p-3 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            <h3 className="font-semibold mb-2 border-b border-slate-600 pb-1 text-sm sm:text-base">Transaction States & Snapshots</h3>
            {Object.values(transactionDetails).length > 0 ? Object.values(transactionDetails).map(tx => (
              <div key={tx.id} className={`mb-2 p-2 rounded text-[11px] sm:text-xs
                ${keyMomentInfo.highlight?.transactionState === tx.name ? 'bg-slate-600 ring-1 ring-sky-400' : 'bg-slate-800'}`}>
                <p className="font-bold" style={{ color: transactions[tx.name]?.color }}>
                  {tx.name} (ID: {tx.id}) St: <span className={tx.status === 'committed' ? 'text-green-400' : tx.status === 'aborted' ? 'text-red-400' : 'text-yellow-400'}>{tx.status}</span> (t={tx.startTime})
                </p>
                <p className="font-mono">Snap TxIDs: <span className="text-fuchsia-300">[{[...tx.snapshotCommittedTxIds].sort((a,b)=>a-b).join(', ')}]</span></p>
                {tx.reads.map((read, idx) => (
                  <p key={idx} className={`pl-1 ${keyMomentInfo.highlight?.transactionSpecificRead?.txName === tx.name && keyMomentInfo.highlight?.transactionSpecificRead?.item === read.item && keyMomentInfo.highlight?.transactionSpecificRead?.versionId === read.versionId && currentStep === keyMomentInfo.step ? 'text-yellow-300 font-semibold' : ''}`}>
                    ↳ Read <span className="">{read.item}</span> (t={read.time}): Val <span className="">{read.value === undefined ? 'N/A' : read.value}</span> (from {read.versionId || 'N/A'})
                  </p>
                ))}
              </div>
            )) : <div className="text-slate-400 italic text-xs">No active transactions.</div>}
          </div>
        </div>
      </div>

      {/* Key Moment Panel */}
      {keyMomentInfo.text && (
        <div className={`my-4 p-3 sm:p-4 rounded-lg border-2 transition-all duration-300 ease-in-out ${
            keyMomentInfo.isCritical ? 'border-red-500 bg-red-900/30 shadow-lg' : 'border-blue-500 bg-blue-900/30'}`}>
          <h3 className={`text-sm sm:text-base font-semibold mb-1 sm:mb-2 ${keyMomentInfo.isCritical ? 'text-red-300' : 'text-blue-300'}`}>
            🔍 Insight at Step {keyMomentInfo.step} (Time: {allOperations[keyMomentInfo.step-1]?.time})
          </h3>
          <p className={`text-xs sm:text-sm whitespace-pre-line ${keyMomentInfo.isCritical ? 'text-red-400' : 'text-blue-400'}`}>{keyMomentInfo.text}</p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button onClick={resumeSimulation} className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs sm:text-sm">Continue</button>
          )}
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="bg-slate-700 rounded-lg shadow-xl p-4 sm:p-6" ref={timelineRef}>
        <h2 className="text-base sm:text-xl font-semibold mb-4">Transaction Timelines</h2>
        <div className="relative mb-8 pt-4"> {/* Time axis */}
          <div className="absolute top-4 left-0 right-0 h-px bg-slate-500"></div>
          <div className="flex justify-between text-xs text-slate-400 mt-2 px-[2.5%] w-[95%]">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const timeVal = i * 10; if (timeVal > maxTime -5) return null;
              return (<div key={i} className="relative flex flex-col items-center"><div className="absolute w-px h-2 bg-slate-500 -top-2"></div><div>{timeVal}</div></div>);
            })}
          </div>
          {(isRunning || currentStep > 0) && (
            <div className="absolute top-[6px] w-0.5 h-5 bg-red-500 transition-all duration-200 ease-linear z-20" style={{ left: `${getTimePosition(currentTime)}%` }}>
              <div className="absolute -top-1.5 -left-[7px] w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-md"></div>
            </div>
          )}
        </div>
        <div className="space-y-6"> {/* Thinner bars implied by h-8 on ops */}
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-1"><div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: tx.color }}></div><h3 className="text-sm sm:text-base font-semibold">{txName}</h3></div>
              <div className="relative h-8 bg-slate-800 rounded"> {/* Timeline bar height */}
                <div className="absolute top-0 left-0 h-full rounded opacity-30" style={{ backgroundColor: tx.color, width: `${getTimePosition(tx.operations[tx.operations.length - 1].time)}%`}}></div>
                {tx.operations.map((op, idx) => {
                  const opGlobalInfo = completedOperations.find(co => co.transaction === txName && co.time === op.time && co.type === op.type);
                  const isActiveOp = opGlobalInfo !== undefined;
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(hOp => hOp.transaction === txName && hOp.time === op.time) && keyMomentInfo.step !== null;
                  
                  let title = `${op.type.toUpperCase()}${op.target ? ` ${op.target}` : ''}${op.value !== undefined ? ` = ${op.value}` : ''}`;
                  if (opGlobalInfo && op.type === 'read') {
                    const txDetail = transactionDetails[txName];
                    const readLogEntry = txDetail?.reads.find(r => r.item === op.target && r.time === op.time);
                    if (readLogEntry) title += ` -> ${readLogEntry.value} (v: ${readLogEntry.versionId})`;
                  }
                  
                  return (
                    <div
                      key={`${txName}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-300 group
                        ${isActiveOp ? 'bg-white shadow-lg scale-105' : 'bg-slate-600 opacity-70'}
                        ${isHighlightedOp ? 'ring-2 sm:ring-4 ring-offset-0 sm:ring-offset-1 ring-red-400 scale-110 sm:scale-125 z-10' : ''}`}
                      style={{ left: `calc(${getTimePosition(op.time)}% - 12px)`, borderColor: tx.color, color: isActiveOp ? tx.color : '#cbd5e1' }} // 12px = half of w-6
                      title={title}
                    >
                      {op.type.charAt(0).toUpperCase()}
                       {isActiveOp && (
                        <div className="absolute bottom-full mb-1.5 left-1/2 transform -translate-x-1/2 bg-black text-white px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap z-30 opacity-0 group-hover:opacity-100 pointer-events-none">
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
        <div className="mt-6 pt-3 border-t border-slate-600 text-xs">
          <h4 className="font-semibold mb-1">Legend</h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {['Begin', 'Read', 'Write', 'Commit', 'Abort'].map(item => (
                 <div key={item} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border-2 border-slate-400 bg-slate-800 flex items-center justify-center font-bold text-slate-200">{item.charAt(0)}</div>
                    <span>{item}</span>
                 </div> ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MvccVisibilityVisualizer;