import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Types (Identical to the previous example) ---
interface Version {
  id: string;
  value: number;
  txMin: number; // Transaction ID that created this version
  txMinName: string; // For display
  txMax: number | null; // Transaction ID that invalidated/superseded this version
  txMaxName: string | null; // For display
}

interface DataItemHistory {
  [itemName: string]: Version[];
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
  item: string;
  value?: number;
  versionId?: string;
  versionTxMin?: number;
  time: number;
}

interface WriteLogEntry {
  item: string;
  newVersionId: string;
  oldVersionId?: string;
}

interface TransactionRuntimeDetails {
  id: number;
  name: string;
  startTime: number;
  snapshotCommittedTxIds: Set<number>;
  status: 'active' | 'committed' | 'aborted';
  reads: ReadLogEntry[];
  writesMade: WriteLogEntry[];
}

interface ScenarioKeyMomentHighlight {
  currentOpPanel?: boolean;
  dataItemVersions?: { [itemName: string]: string[] };
  transactionSpecificRead?: { txName: string; item: string; versionId: string; step: number };
  transactionState?: string;
  timelineOps?: Array<{ transaction: string; time: number }>;
  committedTx?: number;
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

type CompletedTimelineOperation = TransactionOperation & {
  transaction: string;
  color: string;
  txId?: number;
};

// --- Scenario Definition: Dirty Write / Lost Update ---

const mvccDirtyWriteScenario: MvccScenarioConfig = {
  name: "MVCC Lost Update Anomaly (Dirty Write variation)",
  description: "Demonstrates a Lost Update anomaly. T2 overwrites data that T1 has modified but not yet committed. When T1 aborts, its update is lost, but T2's update persists. Robust Snapshot Isolation implementations prevent this with 'first-updater-wins' write-write conflict detection. This simulation relaxes that rule to show the potential anomaly.",
  initialDataItems: {
    DataA: [{ id: 'vA0', value: 100, txMin: 0, txMax: null, txMinName: 'Initial', txMaxName: null }]
  },
  transactions: {
    T1: {
      color: '#3b82f6', // Blue-500
      operations: [
        { type: 'begin', time: 10 },
        { type: 'write', time: 30, target: 'DataA', value: 110 },
        { type: 'abort', time: 80, comment: "T1 aborts, its changes should be rolled back." }
      ]
    },
    T2: {
      color: '#10b981', // Emerald-500
      operations: [
        { type: 'begin', time: 20 },
        { type: 'write', time: 50, target: 'DataA', value: 120, comment: "Conflicts with T1's uncommitted write" },
        { type: 'commit', time: 70 }
      ]
    },
  },
  keyMoments: [
    { step: 2, text: "T1 writes DataA=110. It creates a new uncommitted version (vA1) and marks the initial version (vA0) as superseded by T1.", autoPause: true, highlight: { currentOpPanel: true, dataItemVersions: { DataA: ['vA0', 'vA1'] } } },
    { step: 4, text: "LOST UPDATE: T2 writes DataA=120. Based on its snapshot, it also updates vA0. It creates vA2 and *overwrites* T1's invalidation marker on vA0, setting txMax=2 (T2).\nThis is a write-write conflict. vA0 is now marked as invalidated by T2, not T1.", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, dataItemVersions: { DataA: ['vA0', 'vA1', 'vA2'] } } },
    { step: 5, text: "T2 commits. Its creation of vA2 (value 120) and its invalidation of vA0 are now permanent.", autoPause: true, highlight: { currentOpPanel: true, dataItemVersions: { DataA: ['vA0', 'vA2'] }, committedTx: 2 } },
    { step: 6, text: "ANOMALY: T1 aborts. The system rolls back T1's changes by removing the version it created (vA1). However, the invalidation T1 placed on vA0 was already overwritten by T2's committed write.\n\nT1's update is completely lost. The final value is 120, not the original 100, even though the transaction that intended to write 110 was aborted.", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, dataItemVersions: { DataA: ['vA0', 'vA2'] }, transactionState: 'T1' } },
  ]
};

// --- Component Logic ---
let versionCounter = 0;
const generateVersionId = (prefix: string): string => `${prefix}${versionCounter++}`;

const MvccDirtyWriteVisualizer: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [dataItemVersions, setDataItemVersions] = useState<DataItemHistory>({});
  const [transactionDetails, setTransactionDetails] = useState<{ [txName: string]: TransactionRuntimeDetails }>({});
  const [committedTxIds, setCommittedTxIds] = useState<Set<number>>(new Set([0]));

  const [completedOperations, setCompletedOperations] = useState<CompletedTimelineOperation[]>([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState<Partial<ScenarioKeyMoment>>({});

  const nextTxIdRef = useRef<number>(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const transactionSectionRef = useRef<HTMLDivElement>(null);

  const { name, description, transactions, keyMoments, initialDataItems } = mvccDirtyWriteScenario;

  const getAllOperations = useCallback((): CompletedTimelineOperation[] => {
    return Object.entries(transactions).flatMap(([txName, tx]) => 
      tx.operations.map(op => ({ ...op, transaction: txName, color: tx.color }))
    ).sort((a, b) => a.time - b.time);
  }, [transactions]);

  const allOperations = useRef<CompletedTimelineOperation[]>(getAllOperations()).current;
  const maxTime = useMemo(() => Math.max(...allOperations.map(op => op.time)) + 10, [allOperations]);

  const initializeState = useCallback(() => {
    versionCounter = 0;
    const initialClonedData: DataItemHistory = JSON.parse(JSON.stringify(initialDataItems));
    Object.keys(initialClonedData).forEach(itemName => {
      initialClonedData[itemName].forEach(version => {
        version.id = generateVersionId('vA');
      });
    });
    setDataItemVersions(initialClonedData);
    setTransactionDetails({});
    setCommittedTxIds(new Set([0]));
    setCompletedOperations([]);
    setKeyMomentInfo({});
    nextTxIdRef.current = 1;
  }, [initialDataItems]);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  const findVisibleVersion = useCallback((
    itemHistory: Version[] | undefined,
    txLookingDetails: TransactionRuntimeDetails | undefined,
  ): Version | null => {
    if (!txLookingDetails || !itemHistory) return null;

    const visibleVersions = itemHistory.filter(v => {
      const creatorIsSelf = v.txMin === txLookingDetails.id;
      const creatorInSnapshot = txLookingDetails.snapshotCommittedTxIds.has(v.txMin);
      if (!creatorIsSelf && !creatorInSnapshot) return false;

      if (v.txMax === null) return true;

      const invalidatorInSnapshot = txLookingDetails.snapshotCommittedTxIds.has(v.txMax);
      return !invalidatorInSnapshot;
    });

    visibleVersions.sort((a, b) => b.txMin - a.txMin);
    return visibleVersions.length > 0 ? visibleVersions[0] : null;
  }, []);

  const calculateStateUpToStep = useCallback((step: number): {
    dbVersions: DataItemHistory;
    txDetails: { [txName: string]: TransactionRuntimeDetails };
    committedIds: Set<number>;
    completedOps: CompletedTimelineOperation[];
    nextTxId: number;
  } => {
    versionCounter = 0;
    let tempVersions: DataItemHistory = JSON.parse(JSON.stringify(initialDataItems));
    Object.keys(tempVersions).forEach(itemName => {
        tempVersions[itemName].forEach(version => {
            version.id = generateVersionId('vA');
        });
    });

    let tempTxDetails: { [txName: string]: TransactionRuntimeDetails } = {};
    let tempCommittedIds = new Set<number>([0]);
    let tempNextTxId = 1;
    let tempCompletedOps: CompletedTimelineOperation[] = [];

    const operationsToProcess = allOperations.slice(0, step);

    operationsToProcess.forEach(opDetails => {
      const op = opDetails as CompletedTimelineOperation;
      const txName = op.transaction;

      if (op.type === 'begin') {
        const newTxId = tempNextTxId++;
        tempTxDetails[txName] = {
          id: newTxId, name: txName, startTime: op.time,
          snapshotCommittedTxIds: new Set(tempCommittedIds),
          status: 'active', reads: [], writesMade: []
        };
      } else if (tempTxDetails[txName]?.status === 'active') {
        const tx = tempTxDetails[txName];
        const writeOp = op as WriteOperation;
        const readOp = op as ReadOperation;

        if (op.type === 'read') {
          const itemHistory = tempVersions[readOp.target];
          const visibleVersion = findVisibleVersion(itemHistory, tx);
          tx.reads.push({ item: readOp.target, value: visibleVersion?.value, versionId: visibleVersion?.id, time: op.time });
        } else if (op.type === 'write') {
          const itemHistory = tempVersions[writeOp.target];
          const baseVersion = findVisibleVersion(itemHistory, tx);

          const newVersion: Version = {
            id: generateVersionId('vA'), value: writeOp.value,
            txMin: tx.id, txMax: null,
            txMinName: tx.name, txMaxName: null
          };

          if (baseVersion) {
            const actualBaseInDb = itemHistory.find(v => v.id === baseVersion.id);
            // --- MODIFICATION FOR DIRTY WRITE DEMO ---
            // In a real system, if txMax is not null, it's a write-write conflict and
            // this transaction would likely be blocked or aborted.
            // Here, we ALLOW the overwrite to demonstrate the "Lost Update" anomaly.
            if (actualBaseInDb) {
                 actualBaseInDb.txMax = tx.id;
                 actualBaseInDb.txMaxName = tx.name;
            }
            // --- END MODIFICATION ---
          }
          itemHistory.push(newVersion);
          tx.writesMade.push({ item: writeOp.target, newVersionId: newVersion.id, oldVersionId: baseVersion?.id });
        } else if (op.type === 'commit') {
          tempCommittedIds.add(tx.id);
          tx.status = 'committed';
        } else if (op.type === 'abort') {
          tx.status = 'aborted';
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

    return { dbVersions: tempVersions, txDetails: tempTxDetails, committedIds: tempCommittedIds, completedOps: tempCompletedOps, nextTxId: tempNextTxId };
  }, [allOperations, findVisibleVersion, initialDataItems]);

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
          if (prev >= allOperations.length) { setIsRunning(false); setIsPaused(false); return prev; }
          const newStep = prev + 1;
          updateStateForStep(newStep);
          return newStep;
        });
      }, 1500); // Slightly slower for this scenario
      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, allOperations.length, updateStateForStep]);

  const startSimulation = () => { updateStateForStep(0); setIsRunning(true); setIsPaused(false); setCurrentStep(1); updateStateForStep(1); };
  const pauseSimulation = () => setIsPaused(true);
  const resumeSimulation = () => { setIsPaused(false); if (keyMomentInfo.autoPause && keyMomentInfo.step === currentStep) { setKeyMomentInfo(prev => ({ ...prev, autoPause: false })); } };
  const resetSimulation = () => { setIsRunning(false); setIsPaused(false); setCurrentStep(0); updateStateForStep(0); };
  const stepForward = () => { if (currentStep < allOperations.length) { const newStep = currentStep + 1; setCurrentStep(newStep); updateStateForStep(newStep); } };
  const stepBackward = () => { if (currentStep > 0) { const newStep = currentStep - 1; setCurrentStep(newStep); updateStateForStep(newStep); } };

  const getTimePosition = (time: number) => (time / maxTime) * 95;
  const currentOpDetails: CompletedTimelineOperation | null = currentStep > 0 ? allOperations[currentStep - 1] : null;
  const currentOpIsHighlighted = currentOpDetails && keyMomentInfo.highlight?.currentOpPanel && keyMomentInfo.step === currentStep;
  const getTxNameById = (txId: number): string => {
    if (txId === 0) return 'Initial';
    const entry = Object.entries(transactionDetails).find(([_name, details]) => details.id === txId);
    return entry ? entry[0] : `Tx${txId}`;
  };

  const [timelineMarkerHeight, setTimelineMarkerHeight] = useState('8rem');
  useEffect(() => {
    if (transactionSectionRef.current) {
      const numTransactions = Object.keys(transactions).length;
      setTimelineMarkerHeight(`${numTransactions * (1.5 + 0.75) + 1}rem`); // Approx: numTx * (h-6 + space-y-3) + padding
    }
  }, [transactions]);


  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
         {/* Controls are identical */}
         <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
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
              <div className="font-mono text-gray-700 dark:text-gray-300">Step: {currentStep}/{allOperations.length} | Time: {currentTime}</div>
              <div className="text-gray-500 dark:text-gray-400">Next TxID: {nextTxIdRef.current} | Committed: [{[...committedTxIds].sort((a,b)=>a-b).join(', ')}]</div>
            </div>
          </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 text-xs sm:text-sm">
        {/* Data Item display and Transaction State display are identical */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl">
          <h3 className="font-semibold mb-3 text-base sm:text-lg border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-gray-200">Data Item Versions (Global State)</h3>
          {Object.entries(dataItemVersions).map(([itemName, versions]) => (
            <div key={itemName} className="mb-4">
              <h4 className="font-medium text-fuchsia-500 dark:text-fuchsia-400 mb-1 text-sm sm:text-base">{itemName}:</h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
                {versions.map(v => {
                  const isHighlighted = keyMomentInfo.highlight?.dataItemVersions?.[itemName]?.includes(v.id);
                  const creatorTxDetails = Object.values(transactionDetails).find(td => td.id === v.txMin);
                  const invalidatorTxDetails = Object.values(transactionDetails).find(td => td.id === v.txMax);
                  let versionStatus = "";
                  if (v.txMin === 0) versionStatus = "Initial";
                  else versionStatus = committedTxIds.has(v.txMin) ? `Committed by ${getTxNameById(v.txMin)}` : `Uncommitted by ${getTxNameById(v.txMin)}`;
                  if (v.txMax !== null) { versionStatus += committedTxIds.has(v.txMax) ? ` / Superseded by committed ${getTxNameById(v.txMax)}` : ` / Marked by uncommitted ${getTxNameById(v.txMax)}`;}

                  return (
                    <div key={v.id} className={`p-1.5 rounded text-xs font-mono flex flex-col sm:flex-row sm:justify-between sm:items-center ${isHighlighted ? 'ring-2 ring-yellow-500 bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <div className="flex-grow text-gray-700 dark:text-gray-300">
                        ID: <span className="text-yellow-600 dark:text-yellow-400">{v.id}</span>,
                        Val: <span className="text-green-600 dark:text-green-400 font-semibold">{v.value}</span><br className="sm:hidden"/>
                        <span className="text-gray-500 dark:text-gray-400"> txMin:</span> <span style={{color: creatorTxDetails?.name ? transactions[creatorTxDetails.name]?.color : 'inherit'}}>{getTxNameById(v.txMin)}</span>,
                        <span className="text-gray-500 dark:text-gray-400"> txMax:</span> <span style={{color: invalidatorTxDetails?.name ? transactions[invalidatorTxDetails.name]?.color : 'inherit'}}>{v.txMax === null ? 'NULL' : getTxNameById(v.txMax)}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 sm:mt-0 sm:ml-2 self-start sm:self-center">({versionStatus})</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className={`bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl ${currentOpIsHighlighted ? 'ring-2 ring-purple-500' : ''}`}>
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
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            <h3 className="font-semibold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 text-sm sm:text-base text-gray-800 dark:text-gray-200">Transaction States & Snapshots</h3>
            {Object.values(transactionDetails).length > 0 ? Object.values(transactionDetails).map(tx => (
              <div key={tx.id} className={`mb-2 p-2 rounded text-[11px] sm:text-xs ${keyMomentInfo.highlight?.transactionState === tx.name ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-sky-500' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <p className="font-bold" style={{ color: transactions[tx.name]?.color }}> {tx.name} (ID: {tx.id}) St: <span className={tx.status === 'committed' ? 'text-green-500' : tx.status === 'aborted' ? 'text-red-500' : 'text-yellow-500'}>{tx.status}</span> (t={tx.startTime}) </p>
                <p className="font-mono text-gray-600 dark:text-gray-400">Snap TxIDs: <span className="text-fuchsia-600 dark:text-fuchsia-400">[{[...tx.snapshotCommittedTxIds].sort((a,b)=>a-b).join(', ')}]</span></p>
              </div>
            )) : <div className="text-gray-500 dark:text-gray-400 italic text-xs">No active transactions.</div>}
          </div>
        </div>
      </div>

      {keyMomentInfo.text && (
        <div className={`my-4 p-3 sm:p-4 rounded-lg border-2 transition-all duration-300 ease-in-out ${
            keyMomentInfo.isCritical ? 'border-red-400 bg-red-50 dark:bg-red-900/30 shadow-lg' : 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'}`}>
          <h3 className={`text-sm sm:text-base font-semibold mb-1 sm:mb-2 ${keyMomentInfo.isCritical ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
            🔍 Insight at Step {keyMomentInfo.step} (Time: {currentOpDetails?.time})
          </h3>
          <p className={`text-xs sm:text-sm whitespace-pre-line ${keyMomentInfo.isCritical ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{keyMomentInfo.text}</p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button onClick={resumeSimulation} className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs sm:text-sm">Continue</button>
          )}
        </div>
      )}

      {/* THINNER Timeline Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 sm:p-6" ref={timelineRef}>
        <h2 className="text-base sm:text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Transaction Timelines</h2>
        <div className="relative mb-4 pt-4">
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600"></div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-[2.5%] w-[95%]">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => i * 10 <= maxTime - 5 && <div key={i} className="relative flex flex-col items-center"><div className="absolute w-px h-2 bg-gray-300 dark:bg-gray-600 -top-2"></div><div>{i*10}</div></div>)}
          </div>
          {(isRunning || currentStep > 0) && (
            <div className="absolute top-4 w-0.5 bg-red-500 transition-all duration-200 ease-linear z-20" style={{ left: `${getTimePosition(currentTime)}%`, height: timelineMarkerHeight }}>
              <div className="absolute -top-3.5 -left-[7px] w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md"></div>
            </div>
          )}
        </div>

        <div className="space-y-3 relative" ref={transactionSectionRef}>
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full mr-1.5 shrink-0" style={{ backgroundColor: tx.color }}></div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">{txName}</h3>
              </div>
              <div className="relative h-6 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="absolute top-0 left-0 h-full rounded opacity-30" style={{ backgroundColor: tx.color, width: `${getTimePosition(tx.operations.at(-1)!.time)}%`}}></div>
                {tx.operations.map((op, idx) => {
                  const isActiveOp = completedOperations.some(co => co.transaction === txName && co.time === op.time && co.type === op.type);
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(hOp => hOp.transaction === txName && hOp.time === op.time) && keyMomentInfo.step === currentStep;
                  const title = `${op.type.toUpperCase()}${ (op as ReadOperation).target ? ` ${(op as ReadOperation).target}` : ''}${ (op as WriteOperation).value !== undefined ? ` = ${(op as WriteOperation).value}` : ''}`;
                  
                  return (
                    <div
                      key={`${txName}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all duration-300 group
                        ${isActiveOp ? 'bg-white dark:bg-gray-200 shadow-md scale-105 border-2' : 'bg-gray-200 dark:bg-gray-600 opacity-70 border-gray-400 dark:border-gray-500'}
                        ${isHighlightedOp ? 'ring-2 ring-red-500 dark:ring-red-400 scale-110 sm:scale-125 z-10' : 'border'}`}
                      style={{ left: `calc(${getTimePosition(op.time)}% - 10px)`, borderColor: isActiveOp || isHighlightedOp ? tx.color : undefined, color: isActiveOp ? tx.color : 'text-gray-500 dark:text-gray-400' }}
                      title={title}
                    > {op.type.charAt(0).toUpperCase()} </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MvccDirtyWriteVisualizer;