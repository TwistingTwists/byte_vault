import React from 'react';
import LostUpdateVisualizer from './LostUpdateV1';
import FullScreenWrapper from './FullScreenWrapper';

const FullScreenLostUpdateVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="Lost Update Visualization">
      <LostUpdateVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenLostUpdateVisualizer;
