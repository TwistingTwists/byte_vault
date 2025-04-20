
import { useState, useCallback } from 'react';
import { SystemStateType, TransactionState } from '../types';

export const useSystemState = (initialKey: string, initialValue: string) => {
  const initialTxState: TransactionState = { 
    status: 'idle', 
    lastReadValue: null, 
    lastWriteValue: null,
    isDirtyRead: false,
    isDirtyWrite: false
  };

  const [systemState, setSystemState] = useState<SystemStateType>({
    dbData: { 
      key: initialKey, 
      committedValue: initialValue, 
      uncommittedValue: null, 
      writerTx: null 
    },
    transaction1: { ...initialTxState },
    transaction2: { ...initialTxState },
  });

  const resetSystem = useCallback(() => {
    setSystemState({
      dbData: { 
        key: initialKey, 
        committedValue: initialValue, 
        uncommittedValue: null, 
        writerTx: null 
      },
      transaction1: { ...initialTxState },
      transaction2: { ...initialTxState },
    });
  }, [initialKey, initialValue]);

  return {
    systemState,
    setSystemState,
    resetSystem
  };
};