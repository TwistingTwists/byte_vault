import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// --- Types for a NON-MVCC System (Identical to previous non-MVCC example) ---
interface DataItem {
  value: number;
  lastWriterTxId: number | null;
  lastWriterTxName: string | null;
  isCommitted: boolean;
}

interface DataItemState {
  [itemName: string]: DataItem;
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
  valueRead: number;
  time: number;
}

interface UndoLogEntry {
  item: string;
  oldValue: number;
}

interface TransactionRuntimeDetails {
  id: number;
  name: string;
  startTime: number;
  status: 'active' | 'committed' | 'aborted';
  reads: ReadLogEntry[];
  undoLog: UndoLogEntry[];
}

interface ScenarioKeyMomentHighlight {
  currentOpPanel?: boolean;
  dataItem?: string;
  transactionState?: string;
  timelineOps?: Array<{ transaction: string; time: number }>;
}

interface ScenarioKeyMoment {
  step: number;
  text: string;
  autoPause: boolean;
  isCritical?: boolean;
  highlight?: ScenarioKeyMomentHighlight;
}

interface NoMvccScenarioConfig {
  name: string;
  description: string;
  initialData: { [itemName: string]: { value: number } };
  transactions: ScenarioTransactions;
  keyMoments: ScenarioKeyMoment[];
}

type CompletedTimelineOperation = TransactionOperation & {
  transaction: string;
  color: string;
  txId?: number;
};

// --- Scenario Definition: Combined Dirty Read & Lost Update ---

const noMvccCombinedScenario: NoMvccScenarioConfig = {
  name: "Combined Anomaly: Dirty Read Leads to Lost Update",
  description: "A more complex scenario with 3 transactions on a non-MVCC system. It shows how T2 performing a 'Dirty Read' on T1's uncommitted data directly enables the 'Lost Update' anomaly when T1 later aborts.",
  initialData: {
    Balance: { value: 1000 }
  },
  transactions: {
    T1: { // The Aborting Transaction
      color: '#3b82f6', // Blue
      operations: [
        { type: 'begin', time: 10 },
        { type: 'write', time: 30, target: 'Balance', value: 900, comment: "Withdrawal of 100" },
        { type: 'abort', time: 100, comment: "Transaction is cancelled." }
      ]
    },
    T2: { // The Dirty Reader
      color: '#e11d48', // Rose
      operations: [
        { type: 'begin', time: 20 },
        { type: 'read', time: 50, target: 'Balance', comment: "Reads T1's uncommitted value" },
        { type: 'write', time: 60, target: 'Balance', value: 990, comment: "Applies 10% interest to dirty value" },
        { type: 'commit', time: 80 }
      ]
    },
    T3: { // The Observer
      color: '#f59e0b', // Amber
      operations: [
        { type: 'begin', time: 40 },
        { type: 'read', time: 70, target: 'Balance', comment: "Reads T2's uncommitted value" },
        { type: 'commit', time: 90 }
      ]
    }
  },
  keyMoments: [
    { step: 2, text: "T1 writes Balance=900. In this non-MVCC system, the write happens 'in-place', immediately changing the value. The data is now 'dirty' (uncommitted). T1 records the old value (1000) in its undo log for a potential rollback.", autoPause: true, highlight: { currentOpPanel: true, dataItem: 'Balance' } },
    { step: 5, text: "ANOMALY 1: DIRTY READ\nT2 reads the 'Balance'. It sees the uncommitted value of 900 written by T1. T2 is now making business decisions based on data that may not be permanent.", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, transactionState: 'T2' } },
    { step: 6, text: "T2 calculates a 10% interest on the dirty value (900 * 1.1 = 990) and writes Balance=990. It has now overwritten T1's uncommitted data with its own uncommitted data.", autoPause: true, highlight: { currentOpPanel: true, dataItem: 'Balance' } },
    { step: 7, text: "T3 also performs a dirty read, seeing the value 990 from T2. The data's state is becoming increasingly inconsistent.", autoPause: true, highlight: { currentOpPanel: true, transactionState: 'T3' } },
    { step: 8, text: "T2 commits. The system now considers Balance=990 to be the correct, permanent value. T2's work seems to be safely stored.", autoPause: true, highlight: { currentOpPanel: true, dataItem: 'Balance' } },
    { step: 10, text: "ANOMALY 2: LOST UPDATE\nT1 aborts! To restore consistency, it consults its undo log. It sees it must change 'Balance' back to its original value of 1000.\nThis single action completely ERASES T2's committed update. The 10% interest calculation is gone. T2's update has been lost!", autoPause: true, isCritical: true, highlight: { currentOpPanel: true, dataItem: 'Balance', transactionState: 'T1' } },
  ]
};


// --- Component ---

const NoMvccCombinedAnomalyVisualizer: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<number>(0);

  const [dataItemState, setDataItemState] = useState<DataItemState>({});
  const [transactionDetails, setTransactionDetails] = useState<{ [txName: string]: TransactionRuntimeDetails }>({});

  const [completedOperations, setCompletedOperations] = useState<CompletedTimelineOperation[]>([]);
  const [keyMomentInfo, setKeyMomentInfo] = useState<Partial<ScenarioKeyMoment>>({});

  const nextTxIdRef = useRef<number>(1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const transactionSectionRef = useRef<HTMLDivElement>(null);

  const { name, description, transactions, keyMoments, initialData } = noMvccCombinedScenario;

  const getAllOperations = useCallback((): CompletedTimelineOperation[] => {
    return Object.entries(transactions).flatMap(([txName, tx]) =>
      tx.operations.map(op => ({ ...op, transaction: txName, color: tx.color }))
    ).sort((a, b) => a.time - b.time);
  }, [transactions]);

  const allOperations = useRef<CompletedTimelineOperation[]>(getAllOperations()).current;
  const maxTime = useMemo(() => Math.max(...allOperations.map(op => op.time)) + 10, [allOperations]);

  const initializeState = useCallback(() => {
    const initialDbState: DataItemState = {};
    for (const itemName in initialData) {
      initialDbState[itemName] = {
        value: initialData[itemName].value,
        lastWriterTxId: 0,
        lastWriterTxName: 'Initial',
        isCommitted: true
      };
    }
    setDataItemState(initialDbState);
    setTransactionDetails({});
    setCompletedOperations([]);
    setKeyMomentInfo({});
    nextTxIdRef.current = 1;
  }, [initialData]);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  // The state calculation logic is identical to the previous non-MVCC example and works perfectly here.
  const calculateStateUpToStep = useCallback((step: number): {
    dbState: DataItemState;
    txDetails: { [txName: string]: TransactionRuntimeDetails };
    completedOps: CompletedTimelineOperation[];
    nextTxId: number;
  } => {
    const tempDbState: DataItemState = {};
    for (const key in initialData) {
        tempDbState[key] = {
            value: initialData[key].value,
            lastWriterTxId: 0,
            lastWriterTxName: 'Initial',
            isCommitted: true
        }
    }

    let tempTxDetails: { [txName: string]: TransactionRuntimeDetails } = {};
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
          status: 'active', reads: [], undoLog: []
        };
      } else if (tempTxDetails[txName]?.status === 'active') {
        const tx = tempTxDetails[txName];
        const writeOp = op as WriteOperation;
        const readOp = op as ReadOperation;

        if (op.type === 'read') {
          const valueRead = tempDbState[readOp.target].value;
          tx.reads.push({ item: readOp.target, valueRead, time: op.time });
        } else if (op.type === 'write') {
          const item = tempDbState[writeOp.target];
          if (!tx.undoLog.some(entry => entry.item === writeOp.target)) {
            tx.undoLog.push({ item: writeOp.target, oldValue: item.value });
          }
          item.value = writeOp.value;
          item.lastWriterTxId = tx.id;
          item.lastWriterTxName = tx.name;
          item.isCommitted = false;
        } else if (op.type === 'commit') {
          tx.status = 'committed';
          Object.values(tempDbState).forEach(item => {
            if (item.lastWriterTxId === tx.id) {
              item.isCommitted = true;
            }
          });
        } else if (op.type === 'abort') {
          tx.status = 'aborted';
          for (const undoEntry of tx.undoLog) {
            tempDbState[undoEntry.item].value = undoEntry.oldValue;
            // For simplicity, we don't try to figure out the previous lastWriter here.
            // The value change itself is the key part of the anomaly.
          }
        }
      }
      tempCompletedOps.push({...op, txId: tempTxDetails[txName]?.id });
    });

    return { dbState: tempDbState, txDetails: tempTxDetails, completedOps: tempCompletedOps, nextTxId: tempNextTxId };
  }, [allOperations, initialData]);

  const updateStateForStep = useCallback((newStep: number) => {
    if (newStep === 0) {
      initializeState();
      setCurrentTime(0);
    } else {
      const operation = allOperations[newStep - 1];
      setCurrentTime(operation.time);
      const state = calculateStateUpToStep(newStep);
      setDataItemState(state.dbState);
      setTransactionDetails(state.txDetails);
      setCompletedOperations(state.completedOps);
      nextTxIdRef.current = state.nextTxId;

      const moment = keyMoments.find(km => km.step === newStep);
      if (moment) {
        setKeyMomentInfo({ ...moment, step: newStep });
        if (moment.autoPause && isRunning && !isPaused) setIsPaused(true);
      } else if (keyMomentInfo.step !== newStep) {
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
      }, 1500);
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
  
  const [timelineMarkerHeight, setTimelineMarkerHeight] = useState('12rem');
  useEffect(() => {
    if (transactionSectionRef.current) {
      const numTransactions = Object.keys(transactions).length;
      setTimelineMarkerHeight(`${numTransactions * (1.5 + 0.75) + 1}rem`);
    }
  }, [transactions]);


  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 font-sans">
      <header className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">{name}</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </header>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 mb-6">
         <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
            <div className="flex gap-2 flex-wrap justify-center">
              <button onClick={startSimulation} disabled={isRunning && !isPaused} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 text-sm">Auto Run</button>
              {isRunning && (isPaused ?
                  <button onClick={resumeSimulation} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">Resume</button> :
                  <button onClick={pauseSimulation} className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm">Pause</button>
              )}
              <button onClick={resetSimulation} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">Reset</button>
              <div className="sm:border-l border-gray-300 dark:border-gray-700 sm:pl-2 flex gap-2">
                  <button onClick={stepBackward} disabled={currentStep === 0 || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 text-sm">← Step</button>
                  <button onClick={stepForward} disabled={currentStep >= allOperations.length || (isRunning && !isPaused)} className="px-3 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 text-sm">Step →</button>
              </div>
            </div>
            <div className="text-right text-xs sm:text-sm">
              <div className="font-mono text-gray-700 dark:text-gray-300">Step: {currentStep}/{allOperations.length} | Time: {currentTime}</div>
              <div className="text-gray-500 dark:text-gray-400">Next TxID: {nextTxIdRef.current}</div>
            </div>
          </div>
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 text-xs sm:text-sm">
        {/* Data Display */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl">
          <h3 className="font-semibold mb-3 text-base sm:text-lg border-b border-gray-200 dark:border-gray-700 pb-2">Database State (No Versions)</h3>
          {Object.entries(dataItemState).map(([itemName, item]) => {
              const isHighlighted = keyMomentInfo.highlight?.dataItem === itemName;
              const lastWriterTx = item.lastWriterTxId ? transactionDetails[item.lastWriterTxName!] : null;
              return (
                <div key={itemName} className={`p-3 rounded transition-all ${isHighlighted ? 'ring-2 ring-yellow-500 bg-gray-100 dark:bg-gray-700' : 'bg-gray-50 dark:bg-gray-800'}`}>
                  <h4 className="font-bold text-lg text-fuchsia-500 dark:text-fuchsia-400">{itemName}</h4>
                  <div className="text-3xl font-mono font-bold text-green-600 dark:text-green-400 my-2">{item.value}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    Last write by: <span style={{color: lastWriterTx ? transactions[lastWriterTx.name].color : 'inherit'}}>{item.lastWriterTxName || 'N/A'}</span>
                    <span className={`ml-2 font-semibold ${item.isCommitted ? 'text-green-500' : 'text-yellow-500'}`}>
                      {item.isCommitted ? 'COMMITTED' : 'UNCOMMITTED (Dirty)'}
                    </span>
                  </div>
                </div>
              )
          })}
        </div>

        {/* Transaction Display */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl ${currentOpIsHighlighted ? 'ring-2 ring-purple-500' : ''}`}>
            <h3 className="font-semibold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 text-sm sm:text-base">Current Operation</h3>
            {currentOpDetails ? (
              <div className="font-mono text-xs">
                <span style={{ color: currentOpDetails.color }}>{currentOpDetails.transaction} (TxID: {transactionDetails[currentOpDetails.transaction]?.id})</span>: {currentOpDetails.type.toUpperCase()}
                {(currentOpDetails as ReadOperation).target && ` ${(currentOpDetails as ReadOperation).target}`}
                {(currentOpDetails as WriteOperation).value !== undefined && ` = ${(currentOpDetails as WriteOperation).value}`}
                {currentOpDetails.comment && <span className="text-[10px] text-gray-500 block italic">({currentOpDetails.comment})</span>}
              </div>
            ) : <div className="text-gray-500 italic">None</div>}
          </div>

          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl max-h-96 overflow-y-auto">
            <h3 className="font-semibold mb-2 border-b border-gray-200 dark:border-gray-700 pb-1 text-sm sm:text-base">Transaction States & Undo Logs</h3>
            {Object.values(transactionDetails).length > 0 ? Object.values(transactionDetails).map(tx => (
              <div key={tx.id} className={`mb-2 p-2 rounded text-[11px] sm:text-xs ${keyMomentInfo.highlight?.transactionState === tx.name ? 'bg-gray-100 dark:bg-gray-700 ring-1 ring-sky-500' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <p className="font-bold" style={{ color: transactions[tx.name]?.color }}> {tx.name} (ID: {tx.id}) St: <span className={tx.status === 'committed' ? 'text-green-500' : tx.status === 'aborted' ? 'text-red-500' : 'text-yellow-500'}>{tx.status}</span></p>
                {tx.reads.map((read, idx) => (
                    <p key={idx} className="pl-1 font-mono text-gray-600 dark:text-gray-300">↳ Read {read.item} (t={read.time}): Got value {read.valueRead}</p>
                ))}
                {tx.undoLog.length > 0 && <p className="pl-1 font-mono text-blue-600 dark:text-blue-400">Undo Log: {tx.undoLog.map(u => `[${u.item}: ${u.oldValue}]`).join(', ')}</p>}
              </div>
            )) : <div className="text-gray-500 italic text-xs">No active transactions.</div>}
          </div>
        </div>
      </div>

      {keyMomentInfo.text && (
        <div className={`my-4 p-3 sm:p-4 rounded-lg border-2 ${keyMomentInfo.isCritical ? 'border-red-400 bg-red-50 dark:bg-red-900/30 shadow-lg' : 'border-blue-400 bg-blue-50 dark:bg-blue-900/30'}`}>
          <h3 className={`text-sm sm:text-base font-semibold mb-1 ${keyMomentInfo.isCritical ? 'text-red-700 dark:text-red-300' : 'text-blue-700 dark:text-blue-300'}`}>
            🔍 Insight at Step {keyMomentInfo.step} (Time: {currentOpDetails?.time})
          </h3>
          <p className={`text-xs sm:text-sm whitespace-pre-line ${keyMomentInfo.isCritical ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>{keyMomentInfo.text}</p>
          {isPaused && keyMomentInfo.autoPause && keyMomentInfo.step === currentStep && (
            <button onClick={resumeSimulation} className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs sm:text-sm">Continue</button>
          )}
        </div>
      )}

      {/* Timeline */}
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
                  return (
                    <div key={`${txName}-${op.time}-${idx}`}
                      className={`absolute top-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all ${isActiveOp ? 'bg-white dark:bg-gray-200 shadow-md scale-105 border-2' : 'bg-gray-200 dark:bg-gray-600 opacity-70 border-gray-400'}`}
                      style={{ left: `calc(${getTimePosition(op.time)}% - 10px)`, borderColor: isActiveOp ? tx.color : undefined, color: isActiveOp ? tx.color : 'text-gray-500' }}
                      title={`${op.type.toUpperCase()}`}>
                        {op.type.charAt(0).toUpperCase()}
                    </div>);
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NoMvccCombinedAnomalyVisualizer;