export interface AnimationStateType {
    isRunning: boolean;
    isPaused: boolean;
    currentStep: number;
    totalSteps: number;
    speed: number;
  }
  
  export interface DbDataState {
    key: string;
    committedValue: string;
    uncommittedValue: string | null;
    writerTx: 'T1' | 'T2' | null; // Which Tx holds the uncommitted write
  }
  
  export interface TransactionState {
    status: 'idle' | 'reading' | 'writing' | 'holding_read' | 'holding_uncommitted_write' | 'committed' | 'error_dirty_read' | 'error_dirty_write';
    lastReadValue: string | null;
    lastWriteValue: string | null;
    isDirtyRead: boolean;
    isDirtyWrite: boolean;
  }
  
  export interface SystemStateType {
    dbData: DbDataState;
    transaction1: TransactionState;
    transaction2: TransactionState;
  }
  
  export interface TimelineEvent {
    step: number;
    tx: 'T1' | 'T2' | null;
    action: string;
    position: number;
    highlight?: boolean;
    // Enhancement fields for advanced WebGL visualization
    id: number; // Unique identifier
    timestamp?: number; // Absolute time reference for exact positioning
    concurrentWith?: number[]; // IDs of events this event is concurrent with
    labelPosition?: 'top' | 'bottom' | 'auto'; // Custom position for label
    labelOffset?: number; // Vertical offset for labels
    animationParams?: {
      pulsate?: boolean;
      glow?: boolean;
      glowColor?: string;
      glowIntensity?: number;
    };
  }
  
  export interface AnimationStep {
    action: () => string;
  }
