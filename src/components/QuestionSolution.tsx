import React, { useState } from 'react';
import styles from './QuestionSolution.module.css';

interface QuestionSolutionProps {
  question: React.ReactNode;
  solution: React.ReactNode;
}

export default function QuestionSolution({ question, solution }: QuestionSolutionProps): JSX.Element {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimated, setIsAnimated] = useState(true);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls}>
        <label className={styles.animationToggle}>
          <input
            type="checkbox"
            checked={isAnimated}
            onChange={(e) => setIsAnimated(e.target.checked)}
          />
          <span>Enable Animation</span>
        </label>
      </div>
      
      <div className={styles.flashcardContainer}>
        <div 
          className={`${styles.flashcard} ${isFlipped ? styles.flipped : ''} ${!isAnimated ? styles.noAnimation : ''}`}
          onClick={handleFlip}
        >
          <div className={styles.front}>
            <div className={styles.content}>
              <h4 className={styles.header}>Question</h4>
              <div className={styles.text}>{question}</div>
            </div>
            <div className={styles.flipHint}>Click to flip ↻</div>
          </div>
          <div className={styles.back}>
            <div className={styles.content}>
              <h4 className={styles.header}>Solution</h4>
              <div className={styles.text}>{solution}</div>
            </div>
            <div className={styles.flipHint}>Click to flip ↻</div>
          </div>
        </div>
      </div>
    </div>
  );
}
