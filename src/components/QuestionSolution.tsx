import React, { useState } from 'react';
import styles from './QuestionSolution.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ContentType = string | React.ReactNode;

// Type guard for string content
const isStringContent = (content: ContentType): content is string => {
  return typeof content === 'string';
};

interface QuestionSolutionProps {
  question: ContentType;
  solution: ContentType;
}

export default function QuestionSolution({ question, solution }: QuestionSolutionProps): JSX.Element {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimated, setIsAnimated] = useState(true);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const renderContent = (content: ContentType) => {
    return isStringContent(content) 
      ? <ReactMarkdown 
      className="markdownContent"
      remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      : content;
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
              <div className={styles.text}>
                {renderContent(question)}
              </div>
            </div>
            <div className={styles.flipHint}>Click to flip ↻</div>
          </div>
          <div className={styles.back}>
            <div className={styles.content}>
              <h4 className={styles.header}>Solution</h4>
              <div className={styles.text}>
                <div className={styles['markdown-content']}>{renderContent(solution)}</div>
              </div>
            </div>
            <div className={styles.flipHint}>Click to flip ↻</div>
          </div>
        </div>
      </div>
    </div>
  );
}
