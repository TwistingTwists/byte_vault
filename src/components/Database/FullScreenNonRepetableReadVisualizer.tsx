import React from 'react';
import NonRepetableRead from './NonRepetableRead';
import FullScreenWrapper from './FullScreenWrapper';

const FullScreenNonRepetableReadVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="">
      <NonRepetableRead />
    </FullScreenWrapper>
  );
};

export default FullScreenNonRepetableReadVisualizer;
