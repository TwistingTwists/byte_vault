
import React from 'react';
import { SystemStateType, AnimationStateType } from './types';

interface DatabaseStateVisualizationProps {
  systemState: SystemStateType;
  animationState: AnimationStateType;
  currentStatus: string;
  issueType: 'dirty-read' | 'dirty-write' | 'lost-update' | 'write-skew';
}

const DatabaseStateVisualization: React.FC<DatabaseStateVisualizationProps> = ({
  systemState,
  animationState,
  currentStatus,
  issueType
}) => {
  const { dbData, transaction1, transaction2 } = systemState;
  const currentStep = animationState.currentStep;
  
  // Determine transaction states
  const t1State = transaction1.status;
  const t2State = transaction2.status;
  const isDirtyRead = transaction1.isDirtyRead;
  const isDirtyWrite = transaction1.isDirtyWrite || transaction2.isDirtyWrite;
  
  // Helper functions for formatting
  const formatStatus = (status: string): string => {
    switch (status) {
      case 'idle': return 'Idle';
      case 'reading': return 'Reading';
      case 'writing': return 'Writing';
      case 'holding_read': return 'Holding Read';
      case 'holding_uncommitted_write': return 'Holding Uncommitted Write';
      case 'committed': return 'Committed';
      case 'error_dirty_read': return 'DIRTY READ ERROR';
      case 'error_dirty_write': return 'DIRTY WRITE ERROR';
      default: return status;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'idle': return 'text-gray-300';
      case 'reading': 
      case 'holding_read': return 'text-cyan-400';
      case 'writing':
      case 'holding_uncommitted_write': return 'text-orange-400';
      case 'committed': return 'text-green-400';
      case 'error_dirty_read': return 'text-yellow-400';
      case 'error_dirty_write': return 'text-yellow-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="w-full mt-2 mb-6 px-6 py-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700">
      {/* Table visualization always on top */}
      <div className="flex justify-center mb-8">
        <div className="relative bg-gray-900 rounded-lg border border-gray-600 p-6 w-full max-w-md shadow-lg">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold">
            Database
          </div>
          
          {/* Table visualization */}
          <table className="w-full text-white border-collapse">
            <thead>
              <tr>
                <th className="border-b border-gray-700 py-2 text-left w-1/3">Key</th>
                <th className="border-b border-gray-700 py-2 text-left w-2/3">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-2 font-mono">{dbData.key}</td>
                <td className="py-2 font-mono flex items-center gap-2">
                  <span className="text-blue-400 whitespace-nowrap">{dbData.committedValue}</span>
                  <span className="text-xs text-blue-300 whitespace-nowrap">(committed)</span>
                </td>
              </tr>
              {dbData.uncommittedValue && (
                <tr className="bg-red-900/20">
                  <td className="py-2 font-mono">{dbData.key}</td>
                  <td className="py-2 font-mono flex items-center gap-2">
                    <span className="text-red-400 whitespace-nowrap">{dbData.uncommittedValue}</span>
                    <span className="text-xs text-red-300 whitespace-nowrap">(uncommitted by {dbData.writerTx})</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Status Display Area */}
      <div className="w-full max-w-4xl mb-4 p-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md text-center border border-gray-700 mx-auto">
        <p className="font-medium text-white text-lg leading-tight">
          <span className="font-bold text-indigo-300">Status:</span> {currentStatus}
          <span className="ml-6 text-gray-300 text-base">(Step: {animationState.currentStep}/{animationState.totalSteps})</span>
        </p>
      </div>
      {/* Transactions state */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transaction 1 */}
        <div className={`relative bg-gray-900 rounded-lg border ${
          isDirtyRead || (isDirtyWrite && transaction1.isDirtyWrite) ? 'border-yellow-500' : 'border-gray-600'
        } p-4 shadow-lg`}>
          <div className={`absolute -top-3 left-4 ${
            isDirtyRead || (isDirtyWrite && transaction1.isDirtyWrite) ? 'bg-yellow-500' : 'bg-cyan-600'
          } text-white px-3 py-1 rounded-md text-sm font-bold`}>
            Transaction 1
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${getStatusColor(t1State)}`}>{formatStatus(t1State)}</span>
            </div>
            
            {transaction1.lastReadValue && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Last Read:</span>
                <span className={`font-mono ${isDirtyRead ? 'text-yellow-400' : 'text-white'}`}>
                  '{transaction1.lastReadValue}'
                  {isDirtyRead && <span className="ml-1 text-xs text-yellow-300">(dirty!)</span>}
                </span>
              </div>
            )}
            
            {transaction1.lastWriteValue && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Write:</span>
                <span className={`font-mono ${transaction1.isDirtyWrite ? 'text-yellow-400' : 'text-white'}`}>
                  '{transaction1.lastWriteValue}'
                  {transaction1.isDirtyWrite && <span className="ml-1 text-xs text-yellow-300">(dirty!)</span>}
                </span>
              </div>
            )}
            
            {/* Visual indicator for dirty read/write */}
            {isDirtyRead && issueType === 'dirty-read' && (
              <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-300 text-sm">
                <span className="font-bold">⚠️ Dirty Read:</span> Reading uncommitted data from T2
              </div>
            )}
            
            {transaction1.isDirtyWrite && issueType === 'dirty-write' && (
              <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-300 text-sm">
                <span className="font-bold">⚠️ Dirty Write:</span> Writing over uncommitted data from T2
              </div>
            )}
          </div>
        </div>
        
        {/* Transaction 2 */}
        <div className={`relative bg-gray-900 rounded-lg border ${
          isDirtyWrite && transaction2.isDirtyWrite ? 'border-yellow-500' : 'border-gray-600'
        } p-4 shadow-lg`}>
          <div className={`absolute -top-3 left-4 ${
            isDirtyWrite && transaction2.isDirtyWrite ? 'bg-yellow-500' : 'bg-orange-600'
          } text-white px-3 py-1 rounded-md text-sm font-bold`}>
            Transaction 2
          </div>
          
          <div className="mt-3">
            <div className="flex justify-between mb-2">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${getStatusColor(t2State)}`}>{formatStatus(t2State)}</span>
            </div>
            
            {transaction2.lastReadValue && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Last Read:</span>
                <span className="font-mono text-white">'{transaction2.lastReadValue}'</span>
              </div>
            )}
            
            {transaction2.lastWriteValue && (
              <div className="flex justify-between">
                <span className="text-gray-400">Last Write:</span>
                <span className={`font-mono ${transaction2.isDirtyWrite ? 'text-yellow-400' : 'text-white'}`}>
                  '{transaction2.lastWriteValue}'
                  {transaction2.isDirtyWrite && <span className="ml-1 text-xs text-yellow-300">(dirty!)</span>}
                </span>
              </div>
            )}
            
            {/* Visual indicator for transaction holding uncommitted write */}
            {t2State === 'holding_uncommitted_write' && (
              <div className="mt-3 p-2 bg-orange-900/30 border border-orange-800 rounded text-orange-300 text-sm">
                <span className="font-bold">🔒 Lock:</span> Holding write lock on '{dbData.key}'
              </div>
            )}
            
            {/* Visual indicator for dirty write */}
            {transaction2.isDirtyWrite && issueType === 'dirty-write' && (
              <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-800 rounded text-yellow-300 text-sm">
                <span className="font-bold">⚠️ Dirty Write:</span> Writing over uncommitted data from T1
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStateVisualization;