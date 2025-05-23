import React from 'react';
import FullScreenWrapper from './FullScreenWrapper';
import MvccVisibilityVisualizer from './MvccVisibilityRules';

const FullScreenMvccVisibilityRulesVisualizer: React.FC = () => {
  return (
    <FullScreenWrapper title="MVCC Visibility Rules Visualization">
      <MvccVisibilityVisualizer />
    </FullScreenWrapper>
  );
};

export default FullScreenMvccVisibilityRulesVisualizer;
