import React from 'react';
import PhantomReadVisualizer from './PhantomReadVisualiser';
import FullScreenWrapper from './FullScreenWrapper';

const FullScreenPhantomReadVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="Phantom Read Visualization">
      <PhantomReadVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenPhantomReadVisualizer;
