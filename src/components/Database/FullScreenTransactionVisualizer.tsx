import React from 'react';
import TransactionTimelineVisualizer from './TransactionsV5';
import FullScreenWrapper from './FullScreenWrapper';

const FullScreenTransactionVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="Transaction Timeline Visualization">
      <TransactionTimelineVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenTransactionVisualizer;
