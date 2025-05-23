import React from 'react';
import FullScreenWrapper from './FullScreenWrapper';
import MVCCVisualizer from './MVCCVisualizer';

const FullScreenMVCCVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="MVCC Visualization">
      <MVCCVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenMVCCVisualizer;
