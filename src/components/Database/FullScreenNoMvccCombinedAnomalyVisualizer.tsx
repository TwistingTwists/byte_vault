import React from 'react';
import NoMvccCombinedAnomalyVisualizer from './NoMvccCombinedAnomalyVisualizer';
import FullScreenWrapper from './FullScreenWrapper';

const FullScreenNoMvccCombinedAnomalyVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="No-MVCC Combined Anomaly Visualization">
      <NoMvccCombinedAnomalyVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenNoMvccCombinedAnomalyVisualizer;
