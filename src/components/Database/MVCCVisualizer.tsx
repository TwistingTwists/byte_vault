import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Types ---
interface VersionData {
  id: string;
  value: number;
  txMin: number; // Transaction ID that created this version
  txMax: number | null; // Transaction ID that invalidated/superseded this version
}

interface DataItemHistory {
  [itemName: string]: VersionData[];
}

interface OperationBase {
  time: number;
  type: 'begin' | 'read' | 'write' | 'commit' | 'abort';
  comment?: string;
}

interface ReadOperation extends OperationBase {
  type: 'read';
  target: string;
}

interface WriteOperation extends OperationBase {
  type: 'write';
  target: string;
  value: number;
}

type TransactionOperation = OperationBase | ReadOperation | WriteOperation;

interface TransactionConfig {
  color: string;
  operations: TransactionOperation[];
}

interface ScenarioTransactions {
  [txName: string]: TransactionConfig;
}

interface ReadLogEntry {
  value?: number;
  versionId?: string;
  time: number;
}

interface TransactionRuntimeDetails {
  id: number;
  name: string;
  snapshotCommittedTxIds: Set<number>;
  status: 'active' | 'committed' | 'aborted';
  reads: { [itemTarget: string]: ReadLogEntry }; // Keyed by target for simplicity in this scenario
  writes: Array<{ item: string; newVersionId: string; oldVersionId?: string }>;
}

interface ScenarioKeyMomentHighlight {
  currentOpPanel?: boolean;
  timelineOps?: Array<{ transaction: string; time: number }>;
  dataItemVersions?: { [itemName: string]: string[] };
}

interface ScenarioKeyMoment {
  step: number;
  text: string;
  autoPause: boolean;
  isCritical?: boolean;
  highlight?: ScenarioKeyMomentHighlight;
}

interface MvccScenarioConfig {
  name: string;
  description: string;
  initialDataItems: DataItemHistory;
  transactions: ScenarioTransactions;
  keyMoments: ScenarioKeyMoment[];
}

interface CompletedTimelineOperation extends TransactionOperation {
  transaction: string;
  color: string;
  txId?: number;
}

// --- Configuration for MVCC Visualization (Non-Repeatable Read Scenario) ---
const mvccScenario: MvccScenarioConfig = {
  name: "Non-Repeatable Read Scenario with MVCC",
  description: "T1 reads an item. T2 updates and commits the item. T1 reads the item again. With MVCC, T1 should still see the original value due to its snapshot isolation.",
  initialDataItems: {
    balance: [{ id: 'v0', value: 100, txMin: 0, txMax: null }] // txMin: 0 represents initially committed data
  },
  transactions: {
    T1: {
      color: '#3b82f6', // Blue-500
      operations: [
        { type: 'begin', time: 0 },
        { type: 'read', time: 10, target: 'balance' },
        { type: 'read', time: 50, target: 'balance', comment: "Second read by T1" },
        { type: 'commit', time: 60 }
      ]
    },
    T2: {
      color: '#10b981', // Emerald-500
      operations: [
        { type: 'begin', time: 5 },
        { type: 'read', time: 20, target: 'balance' },
        { type: 'write', time: 30, target: 'balance', value: 150, comment: "T2 updates balance" },
        { type: 'commit', time: 40 }
      ]
    }
  },
  keyMoments: [
    {
      step: 2,
      text: "T1 begins and reads 'balance'. Its snapshot is based on the initial state (balance=100). T1 sees version v0.",
      autoPause: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T1', time: 10 }], dataItemVersions: { balance: ['v0'] } }
    },
    {
      step: 4,
      text: "T2 begins and reads 'balance'. Its snapshot is also based on the initial state (balance=100), as T1 hasn't committed anything. T2 sees version v0.",
      autoPause: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T2', time: 20 }], dataItemVersions: { balance: ['v0'] } }
    },
    {
      step: 5,
      text: "T2 writes 'balance = 150'. This creates a new uncommitted version (v1) and marks v0 as superseded by T2 (uncommitted).",
      autoPause: true, isCritical: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T2', time: 30 }], dataItemVersions: { balance: ['v0', 'v1'] } }
    },
    {
      step: 6,
      text: "T2 commits. Its write (balance=150, v1) becomes permanent. Version v0 is now permanently superseded by T2's transaction.",
      autoPause: true, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T2', time: 40 }], dataItemVersions: { balance: ['v0', 'v1'] } }
    },
    {
      step: 7,
      text: "✅ NON-REPEATABLE READ PREVENTED! T1 reads 'balance' again. Crucially, T1 uses its *original snapshot*. Even though T2 committed a change, T1 still sees balance=100 (version v0) because v1 was not committed when T1's snapshot was taken.",
      autoPause: true, isCritical: false, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T1', time: 50 }], dataItemVersions: { balance: ['v0', 'v1'] } }
    },
    {
      step: 8,
      text: "T1 commits. Its operations were based on a consistent view of the data.",
      autoPause: false, highlight: { currentOpPanel: true, timelineOps: [{ transaction: 'T1', time: 60 }] }
    }
  ]
};

let versionCounter = 1; // For unique version IDs like v1, v2, ...

const MvccVisualizer: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [dataItemVersions, setDataItemVersions] = useState<DataItemHistory>(
    JSON.parse(JSON.stringify(mvccScenario.initialDataItems))
  );
  const [transactionDetails, setTransactionDetails] = useState<{ [txName: string]: TransactionRuntimeDetails }>({});
  const [committedTxIds, setCommittedTxIds] = useState<Set<number>>(new Set([0]));

  const [completedOperations, setCompletedOperations] = useState<CompletedTimelineOperation[]>([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState<Partial<ScenarioKeyMoment>>({});

  const timelineRef = useRef<HTMLDivElement>(null);
  const nextTxIdRef = useRef<number>(1);

  const { transactions, keyMoments, initialDataItems: scenarioInitialDataItems } = mvccScenario;

  const getAllOperations = useCallback((): CompletedTimelineOperation[] => {
    const allOps: CompletedTimelineOperation[] = [];
    Object.entries(transactions).forEach(([txName, tx]) => {
      tx.operations.forEach(op => {
        allOps.push({ ...(op as TransactionOperation), transaction: txName, color: tx.color });
      });
    });
    return allOps.sort((a, b) => a.time - b.time);
  }, [transactions]);

  const allOperations = useRef<CompletedTimelineOperation[]>(getAllOperations()).current;
  const maxTime = useMemo(() => Math.max(...allOperations.map(op => op.time)) + 10, [allOperations]);

  const initializeState = useCallback(() => {
    setDataItemVersions(JSON.parse(JSON.stringify(scenarioInitialDataItems)));
    setTransactionDetails({});
    setCommittedTxIds(new Set([0]));
    setCompletedOperations([]);
    setKeyMomentInfo({});
    nextTxIdRef.current = 1;
    versionCounter = 1; // Reset for this scenario
  }, [scenarioInitialDataItems]);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  const findVisibleVersion = useCallback((
    itemHistory: VersionData[] | undefined,
    currentTxId: number,
    txSnapshotCommittedIds: Set<number>,
    _currentGlobalCommittedTxIds: Set<number> // Renamed as it's not strictly needed by this simplified visibility rule for NRR
  ): VersionData | null => {
    if (!itemHistory) return null;

    const visibleVersions = itemHistory.filter(v => {
      const createdBySelf = v.txMin === currentTxId;
      // Version is visible if created by self OR created by a tx in our snapshot.
      const creatorInSnapshot = txSnapshotCommittedIds.has(v.txMin);
      if (!createdBySelf && !creatorInSnapshot) return false;

      // If version was invalidated (txMax is set), it's only invisible if the invalidator was *already committed* at snapshot time.
      if (v.txMax !== null) {
        const invalidatorInSnapshot = txSnapshotCommittedIds.has(v.txMax);
        if (invalidatorInSnapshot) return false;
      }
      return true;
    });
    
    // Sort by version ID (descending string sort for 'v1', 'v0') or txMin if IDs are numeric
    visibleVersions.sort((a, b) => b.id.localeCompare(a.id)); // v1 before v0
    return visibleVersions.length > 0 ? visibleVersions[0] : null;
  }, []);


  const calculateStateUpToStep = useCallback((step: number): {
    dbVersions: DataItemHistory;
    txDetails: { [txName: string]: TransactionRuntimeDetails };
    committedIds: Set<number>;
    completedOps: CompletedTimelineOperation[];
    nextTxId: number;
  } => {
    let tempVersions: DataItemHistory = JSON.parse(JSON.stringify(scenarioInitialDataItems));
    let tempTxDetails: { [txName: string]: TransactionRuntimeDetails } = {};
    let tempCommittedIds = new Set<number>([0]);
    let tempNextTxId = 1;
    let tempCompletedOps: CompletedTimelineOperation[] = [];
    versionCounter = 1; // Reset for fresh calculation to ensure v1, v2, etc. are consistent

    const operationsToProcess = allOperations.slice(0, step);

    operationsToProcess.forEach(opDetails => {
      const op = opDetails as CompletedTimelineOperation;
      const txName = op.transaction;

      if (op.type === 'begin') {
        const newTxId = tempNextTxId++;
        tempTxDetails[txName] = {
          id: newTxId,
          name: txName,
          snapshotCommittedTxIds: new Set(tempCommittedIds),
          status: 'active',
          reads: {},
          writes: []
        };
      } else if (tempTxDetails[txName]?.status === 'active') {
        const tx = tempTxDetails[txName];
        const writeOp = op as WriteOperation;
        const readOp = op as ReadOperation;

        if (op.type === 'read') {
          const itemHistory = tempVersions[readOp.target];
          const visibleVersion = findVisibleVersion(itemHistory, tx.id, tx.snapshotCommittedTxIds, tempCommittedIds);
          tx.reads[readOp.target] = { 
            value: visibleVersion?.value, 
            versionId: visibleVersion?.id, 
            time: op.time 
          };
        } else if (op.type === 'write') {
          const itemHistory = tempVersions[writeOp.target];
          const baseVersion = findVisibleVersion(itemHistory, tx.id, tx.snapshotCommittedTxIds, tempCommittedIds);
          
          const newVersionId = `v${versionCounter++}`;
          const newVersion: VersionData = { id: newVersionId, value: writeOp.value, txMin: tx.id, txMax: null };
          
          if (baseVersion) {
            const actualBaseVersionInDb = itemHistory.find(v => v.id === baseVersion.id);
            if (actualBaseVersionInDb) {
                 actualBaseVersionInDb.txMax = tx.id;
            }
          }
          itemHistory.push(newVersion);
          tx.writes.push({ item: writeOp.target, newVersionId: newVersion.id, oldVersionId: baseVersion?.id });
        } else if (op.type === 'commit') {
          tempCommittedIds.add(tx.id);
          tx.status = 'committed';
        } else if (op.type === 'abort') {
          tx.status = 'aborted';
          Object.values(tempVersions).forEach(itemHist => { // Iterate over DataItemHistory values
            const target = Object.keys(tempVersions).find(key => tempVersions[key] === itemHist); // Find key for itemHist
            if(target){ // ensure target is found
                tempVersions[target] = itemHist.filter(v => v.txMin !== tx.id);
                itemHist.forEach(v => {
                if (v.txMax === tx.id) v.txMax = null;
                });
            }
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
  }, [allOperations, findVisibleVersion, scenarioInitialDataItems]);

  const updateStateForStep = useCallback((newStep: number) => {
    if (newStep === 0) {
      initializeState();
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
      } else if (keyMomentInfo.step && keyMomentInfo.step !== newStep) {
        setKeyMomentInfo({});
      }
    }
  }, [allOperations, calculateStateUpToStep, initializeState, isRunning, isPaused, keyMomentInfo.step, keyMoments]);


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
  }, [isRunning, isPaused, allOperations.length, updateStateForStep]);

  const startSimulation = () => {
    updateStateForStep(0);
    setIsRunning(true); setIsPaused(false);
    setKeyMomentInfo({});
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

  const getTimePosition = (time: number) => (time / maxTime) * 95;
  const currentOpDetails: CompletedTimelineOperation | null = currentStep > 0 ? allOperations[currentStep - 1] : null;
  const currentOpIsHighlighted = currentOpDetails && keyMomentInfo.highlight?.currentOpPanel && keyMomentInfo.step === currentStep;

  const getTxNameFromId = (txId: number): string => {
    const entry = Object.entries(transactionDetails).find(([, details]) => details.id === txId);
    return entry ? entry[0] : `Tx${txId}`; // Return T1, T2, etc. or TxID if not found
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">{mvccScenario.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{mvccScenario.description}</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-4">
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={startSimulation} disabled={isRunning && !isPaused} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-sm">Auto Run</button>
            {isRunning && (isPaused ? 
                <button onClick={resumeSimulation} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Resume</button> :
                <button onClick={pauseSimulation} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">Pause</button>
            )}
            <button onClick={resetSimulation} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-sm">Reset</button>
            <div className="sm:border-l border-gray-300 dark:border-gray-700 sm:pl-2 flex gap-2">
                <button onClick={stepBackward} disabled={currentStep === 0 || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-sm">← Step</button>
                <button onClick={stepForward} disabled={currentStep >= allOperations.length || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-sm">Step →</button>
            </div>
          </div>
          <div className="text-right text-xs sm:text-sm">
            <div className="font-mono text-gray-700 dark:text-gray-300">Step: {currentStep} / {allOperations.length}</div>
            <div className="text-gray-500 dark:text-gray-400">Time: {currentTime} | Next TxID: {nextTxIdRef.current}</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 text-sm">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl">
          <h3 className="font-semibold mb-3 text-base sm:text-lg border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-gray-200">Data Item Versions (Global View)</h3>
          {Object.entries(dataItemVersions).map(([itemName, versions]) => (
            <div key={itemName} className="mb-4">
              <h4 className="font-medium text-fuchsia-600 dark:text-fuchsia-400 mb-1 text-sm sm:text-base">{itemName}:</h4>
              <ul className="space-y-1.5">
                {versions.map(v => {
                  const isHighlighted = keyMomentInfo.highlight?.dataItemVersions?.[itemName]?.includes(v.id);
                  const creatorTxName = getTxNameFromId(v.txMin);
                  const invalidatorTxName = v.txMax !== null ? getTxNameFromId(v.txMax) : null;
                  
                  return (
                    <li key={v.id} className={`p-1.5 rounded text-xs font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center
                      ${isHighlighted ? 'ring-2 ring-yellow-500 dark:ring-yellow-400 bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-850_custom'}`}>
                      <span className="text-gray-700 dark:text-gray-300">
                        ID: <span className="text-yellow-600 dark:text-yellow-400">{v.id}</span>,
                        Value: <span className="text-green-600 dark:text-green-400 font-semibold">{v.value}</span>,
                        txMin: <span style={{color: transactions[creatorTxName]?.color || 'inherit'}}>{v.txMin === 0 ? 'Initial' : creatorTxName}</span>,
                        txMax: <span style={{color: invalidatorTxName ? transactions[invalidatorTxName]?.color : 'inherit'}}>{v.txMax === null ? 'NULL' : invalidatorTxName}</span>
                      </span>
                      <span className={`text-[10px] mt-1 sm:mt-0 px-1.5 py-0.5 rounded ${
                          committedTxIds.has(v.txMin) && (v.txMax === null || !committedTxIds.has(v.txMax)) ? 'bg-green-500 text-white' : 
                          committedTxIds.has(v.txMin) && v.txMax !== null && committedTxIds.has(v.txMax) ? 'bg-red-500 text-white' : 
                          !committedTxIds.has(v.txMin) ? 'bg-gray-400 dark:bg-gray-500 text-gray-100 dark:text-gray-200' : 'bg-yellow-400 text-black' // Partially committed state
                        }`}>
                        {committedTxIds.has(v.txMin) && (v.txMax === null || !committedTxIds.has(v.txMax)) ? 'Visible (Latest Committed)' : 
                         committedTxIds.has(v.txMin) && v.txMax !== null && committedTxIds.has(v.txMax) ? 'Superseded (Committed)' : 
                         !committedTxIds.has(v.txMin) ? `Uncommitted (by ${creatorTxName})` : 'State Anomaly'} 
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className={`bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl ${currentOpIsHighlighted ? 'ring-2 ring-purple-500 dark:ring-purple-400' : ''}`}>
            <h3 className="font-semibold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 text-sm sm:text-base text-gray-800 dark:text-gray-200">Current Operation</h3>
            {currentOpDetails ? (
              <div className={`font-mono text-xs ${currentOpIsHighlighted ? 'text-purple-600 dark:text-purple-300 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                <span style={{ color: currentOpDetails.color }}>{currentOpDetails.transaction} (TxID: {transactionDetails[currentOpDetails.transaction]?.id})</span>: {currentOpDetails.type.toUpperCase()}
                {(currentOpDetails as ReadOperation).target && ` ${(currentOpDetails as ReadOperation).target}`}
                {(currentOpDetails as WriteOperation).value !== undefined && ` = ${(currentOpDetails as WriteOperation).value}`}
                {currentOpDetails.comment && <span className="text-[10px] text-gray-500 dark:text-gray-400 block italic">({currentOpDetails.comment})</span>}
              </div>
            ) : <div className="text-gray-500 dark:text-gray-400 italic">None</div>}
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl">
            <h3 className="font-semibold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 text-sm sm:text-base text-gray-800 dark:text-gray-200">Transaction States & Snapshots</h3>
            {Object.values(transactionDetails).length > 0 ? Object.values(transactionDetails).map(tx => (
              <div key={tx.id} className="mb-2 p-2 bg-gray-50 dark:bg-gray-850_custom rounded text-xs">
                <p className="font-bold" style={{ color: transactions[tx.name]?.color }}>
                  {tx.name} (ID: {tx.id}) - Status: <span className={tx.status === 'committed' ? 'text-green-500 dark:text-green-400' : tx.status === 'aborted' ? 'text-red-500 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400'}>{tx.status}</span>
                </p>
                <p className="text-gray-600 dark:text-gray-400">Snapshot TxIDs: <span className="font-mono text-fuchsia-600 dark:text-fuchsia-400">[{[...tx.snapshotCommittedTxIds].join(', ')}]</span></p>
                {Object.entries(tx.reads).map(([item, readInfo]) => (
                  <p key={`${item}-${readInfo.time}`} className="text-gray-700 dark:text-gray-300">
                    Read <span className="text-yellow-600 dark:text-yellow-400">{item}</span> at t={readInfo.time}: Value <span className="text-green-600 dark:text-green-400">{readInfo.value}</span> (from <span className="text-yellow-600 dark:text-yellow-400">{readInfo.versionId}</span>)
                  </p>
                ))}
              </div>
            )) : <div className="text-gray-500 dark:text-gray-400 italic">No active transactions.</div>}
          </div>
        </div>
      </div>

      {keyMomentInfo.text && (
        <div className={`my-4 p-3 sm:p-4 rounded-lg border-2 transition-all duration-300 ease-in-out ${
            keyMomentInfo.isCritical ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/30 shadow-lg' : 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/30'}`}>
          <h3 className={`text-sm sm:text-base font-semibold mb-1 sm:mb-2 ${keyMomentInfo.isCritical ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
            🔍 Insight at Step {keyMomentInfo.step} (Time: {currentOpDetails?.time})
          </h3>
          <p className={`text-xs sm:text-sm whitespace-pre-line ${keyMomentInfo.isCritical ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{keyMomentInfo.text}</p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button onClick={resumeSimulation} className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs sm:text-sm">Continue</button>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6" ref={timelineRef}>
        <h2 className="text-base sm:text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Transaction Timelines</h2>
        <div className="relative mb-8 pt-4">
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-[2.5%] w-[95%]">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const timeVal = i * 10; if (timeVal > maxTime -5) return null;
              return (<div key={i} className="relative flex flex-col items-center"><div className="absolute w-px h-2 bg-gray-300 dark:bg-gray-600 -top-2"></div><div>{timeVal}</div></div>);
            })}
          </div>
          {(isRunning || currentStep > 0) && (
            <div className="absolute top-[6px] w-0.5 h-5 bg-red-500 transition-all duration-200 ease-linear z-20" style={{ left: `${getTimePosition(currentTime)}%` }}>
              <div className="absolute -top-1.5 -left-[7px] w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md"></div>
            </div>
          )}
        </div>
        <div className="space-y-6">
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-1">
                <div className="w-3 h-3 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: tx.color }}></div>
                <h3 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-200">{txName}</h3>
              </div>
              <div className="relative h-10 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="absolute top-0 left-0 h-full rounded opacity-30" style={{ backgroundColor: tx.color, width: `${getTimePosition(tx.operations[tx.operations.length - 1].time)}%`}}></div>
                {tx.operations.map((op, idx) => {
                  const opGlobalInfo = completedOperations.find(co => co.transaction === txName && co.time === op.time && co.type === op.type);
                  const isActiveOp = opGlobalInfo !== undefined;
                  
                  let title = `${op.type.toUpperCase()}`;
                  if ((op as ReadOperation).target) title += ` ${(op as ReadOperation).target}`;
                  if ((op as WriteOperation).value !== undefined) title += ` = ${(op as WriteOperation).value}`;

                  if (opGlobalInfo && op.type === 'read') {
                    const readDetails = transactionDetails[txName]?.reads[(op as ReadOperation).target];
                    if (readDetails && readDetails.time === op.time) title += ` -> ${readDetails.value} (v: ${readDetails.versionId})`;
                  }
                  
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(hOp => hOp.transaction === txName && hOp.time === op.time) && keyMomentInfo.step === currentStep;

                  return (
                    <div
                      key={`${txName}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 group
                        ${isActiveOp ? 'bg-white dark:bg-gray-200 shadow-lg scale-105' : 'bg-gray-200 dark:bg-gray-600 opacity-70'}
                        ${isHighlightedOp ? 'ring-2 sm:ring-4 ring-offset-0 sm:ring-offset-1 ring-red-500 dark:ring-red-400 scale-110 sm:scale-125 z-10' : ''}`}
                      style={{ left: `calc(${getTimePosition(op.time)}% - 16px)`, borderColor: tx.color, color: isActiveOp ? tx.color : 'text-gray-600 dark:text-gray-400' }}
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
        <div className="mt-6 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs">
          <h4 className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Legend</h4>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-gray-600 dark:text-gray-400">
            {['Begin', 'Read', 'Write', 'Commit', 'Abort'].map(item => (
                 <div key={item} className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-700 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200">{item.charAt(0)}</div>
                    <span>{item}</span>
                 </div> ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MvccVisualizer;