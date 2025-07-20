import React from 'react';
import MvccDirtyWriteVisualizer from './MvccDirtyWritesVisualiser';
import FullScreenWrapper from './FullScreenWrapper';

const FullScreenMvccDirtyWriteVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="MVCC Dirty Write Visualization">
      <MvccDirtyWriteVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenMvccDirtyWriteVisualizer;
