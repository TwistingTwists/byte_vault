import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Types ---
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
  status: 'active' | 'committed' | 'aborted';
  reads: ReadLogEntry[];
  writesMade: WriteLogEntry[];
}

interface ScenarioKeyMomentHighlight {
  currentOpPanel?: boolean;
  dataItemVersions?: { [itemName: string]: string[] }; // Highlight specific version IDs
  transactionSpecificRead?: { txName: string; item: string; versionId: string; step: number };
  transactionState?: string; // txName to highlight the whole transaction's state panel
  timelineOps?: Array<{ transaction: string; time: number }>;
  committedTx?: number; // Highlight when a specific TxID gets committed
  lostUpdate?: boolean; // Special highlight for lost update
}

interface ScenarioKeyMoment {
  step: number;
  text: string;
  autoPause: boolean;
  isCritical?: boolean;
  highlight?: ScenarioKeyMomentHighlight;
}

interface ReadCommittedScenarioConfig {
  name: string;
  description: string;
  initialDataItems: DataItemHistory;
  transactions: ScenarioTransactions;
  keyMoments: ScenarioKeyMoment[];
}

// For completed operations on the timeline
interface CompletedTimelineOperation extends TransactionOperation {
  transaction: string; // Name of the transaction (T1, T2, etc.)
  color: string; // For the dot on the timeline
  txId?: number; // Runtime ID of the transaction
}


const lostUpdateScenario: ReadCommittedScenarioConfig = {
  name: "Read Committed: Lost Update Anomaly",
  description: "Demonstrates how Read Committed isolation can lead to lost updates when two transactions read the same value and both update it. The second commit overwrites the first transaction's changes.",
  initialDataItems: {
    Balance: [{ id: 'vB0', value: 1000, txMin: 0, txMax: null, txMinName: 'Initial', txMaxName: null }]
  },
  transactions: {
    T1: {
      color: '#3b82f6', // Blue-500
      operations: [
        { type: 'begin', time: 0, comment: "Withdraw $100" },
        { type: 'read', time: 5, target: 'Balance', comment: "Read current balance" },
        { type: 'write', time: 15, target: 'Balance', value: 900, comment: "1000 - 100 = 900" },
        { type: 'commit', time: 25 }
      ]
    },
    T2: {
      color: '#ef4444', // Red-500
      operations: [
        { type: 'begin', time: 10, comment: "Withdraw $200" },
        { type: 'read', time: 12, target: 'Balance', comment: "Read current balance (T1 not committed)" },
        { type: 'write', time: 20, target: 'Balance', value: 800, comment: "1000 - 200 = 800" },
        { type: 'commit', time: 30 }
      ]
    }
  },
  keyMoments: [
    { step: 2, text: "T1 reads Balance = 1000. Plans to withdraw $100.", autoPause: true, highlight: { currentOpPanel: true, transactionSpecificRead: { txName: 'T1', item: 'Balance', versionId: 'vB0', step: 2 } } },
    { step: 4, text: "T2 reads Balance = 1000. T1 hasn't committed yet, so T2 sees the same initial value. Plans to withdraw $200.", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, transactionSpecificRead: { txName: 'T2', item: 'Balance', versionId: 'vB0', step: 4 } } },
    { step: 5, text: "T2 writes Balance = 800 (1000 - 200). This is based on the original balance, not considering T1's pending withdrawal.", autoPause: true, highlight: { currentOpPanel: true, dataItemVersions: { Balance: ['vB2'] } } },
    { step: 6, text: "T1 commits. Balance is now 900 in the database.", autoPause: true, highlight: { currentOpPanel: true, committedTx: 1, dataItemVersions: { Balance: ['vB1'] } } },
    { step: 7, text: "LOST UPDATE! T2 commits with Balance = 800, overwriting T1's update. The correct balance should be 700 (1000 - 100 - 200), but we lost T1's $100 withdrawal!", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, committedTx: 2, dataItemVersions: { Balance: ['vB2'] }, lostUpdate: true } }
  ]
};


// --- Read Committed Lost Update Scenario ---
let versionCounter = 0;
const generateVersionId = (prefix: string): string => `${prefix}${versionCounter++}`;


const ReadCommittedLostUpdateVisualizer: React.FC = () => {
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

  const { transactions, keyMoments, initialDataItems: scenarioInitialDataItems } = lostUpdateScenario;

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
    versionCounter = 0;
    const initialClonedData: DataItemHistory = JSON.parse(JSON.stringify(scenarioInitialDataItems));
    Object.keys(initialClonedData).forEach(itemName => {
        initialClonedData[itemName].forEach(version => {
            const prefix = 'vB';
            version.id = generateVersionId(prefix);
        });
    });
    setDataItemVersions(initialClonedData);
    setTransactionDetails({});
    setCommittedTxIds(new Set([0]));
    setCompletedOperations([]);
    setKeyMomentInfo({});
    nextTxIdRef.current = 1;
  }, [scenarioInitialDataItems]);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  // Read Committed visibility: only see committed versions
  const findVisibleVersion = useCallback((
    itemHistory: Version[] | undefined,
    globalCommittedSet: Set<number>
  ): Version | null => {
    if (!itemHistory) return null;

    // Filter to only committed versions
    const visibleVersions = itemHistory.filter(v => {
      // Version must be committed
      if (!globalCommittedSet.has(v.txMin)) return false;
      
      // If version has been superseded, the superseding transaction must also be committed
      if (v.txMax !== null && !globalCommittedSet.has(v.txMax)) {
        // The invalidation is not committed, so this version is still visible
        return true;
      }
      
      // Version is not superseded or superseded by a committed transaction
      return v.txMax === null;
    });

    // Return the most recent committed version
    visibleVersions.sort((a, b) => {
        if (b.txMin !== a.txMin) return b.txMin - a.txMin;
        const idA = parseInt(a.id.substring(2) || "0");
        const idB = parseInt(b.id.substring(2) || "0");
        return idB - idA;
    });
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
    let tempVersions: DataItemHistory = JSON.parse(JSON.stringify(scenarioInitialDataItems));
    Object.keys(tempVersions).forEach(itemName => {
        tempVersions[itemName].forEach(version => {
            const prefix = 'vB';
            version.id = generateVersionId(prefix);
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
          id: newTxId,
          name: txName,
          startTime: op.time,
          status: 'active',
          reads: [],
          writesMade: []
        };
      } else if (tempTxDetails[txName]?.status === 'active') {
        const tx = tempTxDetails[txName];
        const writeOp = op as WriteOperation;
        const readOp = op as ReadOperation;

        if (op.type === 'read') {
          const itemHistory = tempVersions[readOp.target];
          const visibleVersion = findVisibleVersion(itemHistory, tempCommittedIds);
          tx.reads.push({
            item: readOp.target,
            value: visibleVersion?.value,
            versionId: visibleVersion?.id,
            versionTxMin: visibleVersion?.txMin,
            time: op.time
          });
        } else if (op.type === 'write') {
          const itemHistory = tempVersions[writeOp.target];
          const baseVersion = findVisibleVersion(itemHistory, tempCommittedIds);

          const newVersionId = generateVersionId('vB');
          const newVersion: Version = {
            id: newVersionId,
            value: writeOp.value,
            txMin: tx.id,
            txMax: null,
            txMinName: tx.name,
            txMaxName: null
          };

          if (baseVersion) {
            const actualBaseInDb = itemHistory.find(v => v.id === baseVersion.id);
            if (actualBaseInDb && actualBaseInDb.txMax === null) {
                 actualBaseInDb.txMax = tx.id;
                 actualBaseInDb.txMaxName = tx.name;
            }
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
      }, 1300);
      return () => clearInterval(interval);
    }
  }, [isRunning, isPaused, allOperations.length, updateStateForStep]);

  const startSimulation = () => {
    updateStateForStep(0);
    setIsRunning(true); setIsPaused(false);
    setCurrentStep(1);
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

  const getTxNameById = (txId: number): string => {
    if (txId === 0) return 'Initial';
    const entry = Object.entries(transactionDetails).find(([_name, details]) => details.id === txId);
    return entry ? entry[0] : `Tx${txId}`;
  };

  const [timelineMarkerHeight, setTimelineMarkerHeight] = useState('10rem');

  useEffect(() => {
    if (transactionSectionRef.current) {
      const numTransactions = Object.keys(transactions).length;
      setTimelineMarkerHeight(`${numTransactions * (1.5 + 1) - 1 + 1}rem`);
    }
  }, [transactions]);


  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{lostUpdateScenario.name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{lostUpdateScenario.description}</p>
      </header>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
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
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl">
          <h3 className="font-semibold mb-3 text-base sm:text-lg border-b border-gray-200 dark:border-gray-700 pb-2 text-gray-800 dark:text-gray-200">Data Item Versions (Global State)</h3>
          {Object.entries(dataItemVersions).map(([itemName, versions]) => (
            <div key={itemName} className="mb-4">
              <h4 className="font-medium text-fuchsia-500 dark:text-fuchsia-400 mb-1 text-sm sm:text-base">{itemName}:</h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-2">
                {versions.map(v => {
                  const isHighlighted = keyMomentInfo.highlight?.dataItemVersions?.[itemName]?.includes(v.id);
                  const isLostUpdate = keyMomentInfo.highlight?.lostUpdate && v.id === 'vB1';
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
                      ${isHighlighted ? 'ring-2 ring-yellow-500 dark:ring-yellow-400 bg-gray-100 dark:bg-gray-700' : 
                        isLostUpdate ? 'ring-2 ring-red-500 dark:ring-red-400 bg-red-50 dark:bg-red-900/30 line-through opacity-60' : 
                        'bg-gray-50 dark:bg-gray-850'}`}>
                      <div className="flex-grow text-gray-700 dark:text-gray-300">
                        ID: <span className="text-yellow-600 dark:text-yellow-400">{v.id}</span>,
                        Val: <span className="text-green-600 dark:text-green-400 font-semibold">{v.value}</span><br className="sm:hidden"/>
                        <span className="text-gray-500 dark:text-gray-400"> txMin:</span> <span style={{color: creatorTxDetails?.name ? transactions[creatorTxDetails.name]?.color : 'inherit'}}>{getTxNameById(v.txMin)}</span>,
                        <span className="text-gray-500 dark:text-gray-400"> txMax:</span> <span style={{color: invalidatorTxDetails?.name ? transactions[invalidatorTxDetails.name]?.color : 'inherit'}}>{v.txMax === null ? 'NULL' : getTxNameById(v.txMax)}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 sm:mt-0 sm:ml-2 self-start sm:self-center">
                        ({versionStatus})
                        {isLostUpdate && <span className="text-red-600 dark:text-red-400 font-bold"> - LOST UPDATE!</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
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

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            <h3 className="font-semibold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 text-sm sm:text-base text-gray-800 dark:text-gray-200">Transaction States (Read Committed)</h3>
            {Object.values(transactionDetails).length > 0 ? Object.values(transactionDetails).map(tx => (
              <div key={tx.id} className={`mb-2 p-2 rounded text-[11px] sm:text-xs
                ${keyMomentInfo.highlight?.transactionState === tx.name ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-sky-500 dark:ring-sky-400' : 'bg-gray-50 dark:bg-gray-850'}`}>
                <p className="font-bold" style={{ color: transactions[tx.name]?.color }}>
                  {tx.name} (ID: {tx.id}) St: <span className={tx.status === 'committed' ? 'text-green-500 dark:text-green-400' : tx.status === 'aborted' ? 'text-red-500 dark:text-red-400' : 'text-yellow-500 dark:text-yellow-400'}>{tx.status}</span> (t={tx.startTime})
                </p>
                <p className="font-mono text-gray-600 dark:text-gray-400">Isolation: <span className="text-purple-600 dark:text-purple-400">READ COMMITTED</span></p>
                {tx.reads.map((read, idx) => (
                  <p key={idx} className={`pl-1
                    ${keyMomentInfo.highlight?.transactionSpecificRead?.txName === tx.name &&
                      keyMomentInfo.highlight?.transactionSpecificRead?.item === read.item &&
                      keyMomentInfo.highlight?.transactionSpecificRead?.versionId === read.versionId &&
                      keyMomentInfo.highlight?.transactionSpecificRead?.step === currentStep
                      ? 'text-yellow-600 dark:text-yellow-300 font-semibold'
                      : 'text-gray-700 dark:text-gray-300'}`}>
                    ↳ Read <span className="">{read.item}</span> (t={read.time}): Val <span className="">{read.value === undefined ? 'N/A' : read.value}</span> (from {read.versionId || 'N/A'})
                  </p>
                ))}
              </div>
            )) : <div className="text-gray-500 dark:text-gray-400 italic text-xs">No active transactions.</div>}
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
        <h2 className="text-base sm:text-xl font-semibold mb-2 text-gray-800 dark:text-gray-200">Transaction Timelines</h2>
        
        <div className="relative mb-4 pt-4">
          <div className="absolute top-4 left-0 right-0 h-px bg-gray-300 dark:bg-gray-600 z-0"></div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2 px-[2.5%] w-[95%] relative z-10">
            {Array.from({ length: Math.floor(maxTime / 10) + 1 }, (_, i) => {
              const timeVal = i * 10; if (timeVal > maxTime -5) return null;
              return (<div key={i} className="relative flex flex-col items-center"><div className="absolute w-px h-2 bg-gray-300 dark:bg-gray-600 -top-2"></div><div>{timeVal}</div></div>);
            })}
          </div>
          
          {(isRunning || currentStep > 0) && (
            <div 
              className="absolute top-4 w-0.5 bg-red-500 transition-all duration-200 ease-linear z-20"
              style={{ 
                left: `${getTimePosition(currentTime)}%`,
                height: timelineMarkerHeight
              }}
            >
              <div className="absolute -top-3.5 -left-[7px] w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 shadow-md"></div>
            </div>
          )}
        </div>

        <div className="space-y-3 relative" ref={transactionSectionRef}>
          {Object.entries(transactions).map(([txName, tx]) => (
            <div key={txName} className="relative">
              <div className="flex items-center mb-0.5">
                <div className="w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: tx.color }}></div>
                <h3 className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">{txName}</h3>
              </div>
              <div className="relative h-6 bg-gray-100 dark:bg-gray-700 rounded">
                <div className="absolute top-0 left-0 h-full rounded opacity-30" style={{ backgroundColor: tx.color, width: `${getTimePosition(tx.operations[tx.operations.length - 1].time)}%`}}></div>
                {tx.operations.map((op, idx) => {
                  const opGlobalInfo = completedOperations.find(co => co.transaction === txName && co.time === op.time && co.type === op.type);
                  const isActiveOp = opGlobalInfo !== undefined;
                  const isHighlightedOp = keyMomentInfo.highlight?.timelineOps?.some(hOp => hOp.transaction === txName && hOp.time === op.time) && keyMomentInfo.step === currentStep;
                  
                  let title = `${op.type.toUpperCase()}`;
                  if ((op as ReadOperation).target) title += ` ${(op as ReadOperation).target}`;
                  if ((op as WriteOperation).value !== undefined) title += ` = ${(op as WriteOperation).value}`;

                  if (opGlobalInfo && op.type === 'read') {
                    const txDetail = transactionDetails[txName];
                    const readLogEntry = txDetail?.reads.find(r => r.item === (op as ReadOperation).target && r.time === op.time);
                    if (readLogEntry) title += ` -> ${readLogEntry.value} (v: ${readLogEntry.versionId})`;
                  }
                  
                  return (
                    <div
                      key={`${txName}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all duration-300 group
                        ${isActiveOp ? 'bg-white dark:bg-gray-200 shadow-md scale-105 border-2' : 'bg-gray-200 dark:bg-gray-600 opacity-70 border-gray-400 dark:border-gray-500'}
                        ${isHighlightedOp ? 'ring-2 sm:ring-offset-1 ring-red-500 dark:ring-red-400 scale-110 sm:scale-125 z-10 border-2' : 'border'}`}
                      style={{ 
                        left: `calc(${getTimePosition(op.time)}% - 10px)`,
                        borderColor: isActiveOp || isHighlightedOp ? tx.color : undefined,
                        color: isActiveOp ? tx.color : (isHighlightedOp ? tx.color : 'text-gray-500 dark:text-gray-400')
                      }}
                      title={title}
                    >
                      {op.type.charAt(0).toUpperCase()}
                       {isActiveOp && (
                        <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-black text-white px-1.5 py-0.5 rounded text-[9px] whitespace-nowrap z-30 opacity-0 group-hover:opacity-100 pointer-events-none">
                          {title}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-[3px] border-transparent border-t-black"></div>
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

export default ReadCommittedLostUpdateVisualizer;