import React, { useState, ReactNode } from 'react';
import styles from './QuestionSolution.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import processMultilineString from '../scripts/processMultiline';

type ContentType = string | React.ReactNode;

// Type guard for string content
const isStringContent = (content: ContentType): content is string => {
  return typeof content === 'string';
};

const renderContent = (content: ContentType) => {
  return isStringContent(content) 
    ? <ReactMarkdown 
      className="markdownContent"
      remarkPlugins={[remarkGfm]}>{processMultilineString(content)}</ReactMarkdown>
    : content;
};

interface QuestionProps {
  children: ReactNode;
}

interface SolutionProps {
  children: ReactNode;
}

export const Question: React.FC<QuestionProps> = ({ children }) => {
  return (
      <div className={styles.content}>
        <h4 className={styles.header}>Question</h4>
          <div className={styles.text}>
            {renderContent(children)}
          </div>
      </div>
  );
};

export const Solution: React.FC<SolutionProps> = ({ children }) => {
  return (
    <div className={styles.content}>
      <h4 className={styles.header}>Solution</h4>
      <div className={styles.text}>
        {renderContent(children)}
      </div>
    </div>
  );
};

interface QSComponentProps {
  children: ReactNode;
}

const QSComponent: React.FC<QSComponentProps> = ({ children }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isAnimated, setIsAnimated] = useState(true);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  // Find Question and Solution components among children
  const questionElement = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === Question
  );
  
  const solutionElement = React.Children.toArray(children).find(
    child => React.isValidElement(child) && child.type === Solution
  );

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
            {questionElement}
            <div className={styles.flipInstruction}>Click to Flip</div>
          </div>
          <div className={styles.back}>
            {solutionElement}
            <div className={styles.flipInstruction}>Click to Flip</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QSComponent;
