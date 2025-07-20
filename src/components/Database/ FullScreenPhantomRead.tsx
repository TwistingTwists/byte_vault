import React from 'react';
import PhantomReadVisualizer from './PhantomReadVisualiser';
import FullScreenWrapper from './FullScreenWrapper';

const FullScreenPhantomReadVisualizer2: React.FC = () => {
  return (
    <FullScreenWrapper title="Phantom Read Visualization">
      <PhantomReadVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenPhantomReadVisualizer2;
