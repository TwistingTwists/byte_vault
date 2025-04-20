
import React, { useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { AnimationStateType } from './types';

interface ControlPanelProps {
  animationState: AnimationStateType;
  handlePlay: () => void;
  handlePause: () => void;
  handleStep: () => void;
  handleReset: () => void;
  handleSpeedChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  animationState,
  handlePlay,
  handlePause,
  handleStep,
  handleReset,
  handleSpeedChange
}) => {
  // Refs for confetti buttons
  const playBtnRef = useRef<HTMLButtonElement>(null);
  const stepBtnRef = useRef<HTMLButtonElement>(null);
  const resetBtnRef = useRef<HTMLButtonElement>(null);

  // Ref to track if confetti has already fired for each button
  const confettiFired = useRef({ play: false, step: false, reset: false });

  // Confetti helper
  const triggerConfetti = (btnRef: React.RefObject<HTMLButtonElement>, key: 'play' | 'step' | 'reset') => {
    if (!confettiFired.current[key]) {
      const buttonElement = btnRef.current;
      if (buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x, y },
          colors: ['#22c55e', '#3b82f6', '#64748b', '#ef4444', '#a855f7'],
        });
        confettiFired.current[key] = true;
      }
    }
  };

  // Reset confetti fired state when needed
  useEffect(() => {
    if (animationState.currentStep === 0) {
      confettiFired.current = { play: false, step: false, reset: false };
    }
  }, [animationState.currentStep]);

  // Modified handlers to include confetti
  const handlePlayWithConfetti = () => {
    triggerConfetti(playBtnRef, 'play');
    handlePlay();
  };

  const handleStepWithConfetti = () => {
    triggerConfetti(stepBtnRef, 'step');
    handleStep();
  };

  const handleResetWithConfetti = () => {
    triggerConfetti(resetBtnRef, 'reset');
    handleReset();
  };

  return (
    <div className="w-full max-w-4xl flex flex-wrap justify-center items-center gap-3 mt-4 p-3 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-md border border-gray-700 sticky bottom-0 z-50">
      {/* Buttons */}
      <button 
        ref={playBtnRef}
        onClick={handlePlayWithConfetti} 
        disabled={animationState.isRunning && !animationState.isPaused} 
        className="px-5 py-2 text-base bg-blue-600 text-white font-semibold rounded-md shadow hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150 ease-in-out relative overflow-visible"
      >
        {animationState.currentStep >= animationState.totalSteps ? 'Replay' : (animationState.isPaused ? 'Resume' : 'Play')}
      </button>
      <button 
        onClick={handlePause} 
        disabled={!animationState.isRunning || animationState.isPaused} 
        className="px-5 py-2 text-base bg-yellow-500 text-white font-semibold rounded-md shadow hover:bg-yellow-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150"
      >
        Pause
      </button>
      <button 
        ref={stepBtnRef}
        onClick={handleStepWithConfetti} 
        disabled={animationState.isRunning || animationState.currentStep >= animationState.totalSteps} 
        className="px-5 py-2 text-base bg-purple-600 text-white font-semibold rounded-md shadow hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-150"
      >
        Step
      </button>
      <button 
        ref={resetBtnRef}
        onClick={handleResetWithConfetti} 
        className="px-5 py-2 text-base bg-red-600 text-white font-semibold rounded-md shadow hover:bg-red-700 transition-all duration-150"
      >
        Reset
      </button>

      {/* Speed Slider */}
      <div className="flex items-center gap-3 px-3 md:px-5 py-2 bg-gray-700/50 backdrop-blur-sm rounded-md">
        <label htmlFor="speed-slider" className="text-white text-sm whitespace-nowrap">
          Speed: x{animationState.speed.toFixed(1)}
        </label>
        <input 
          id="speed-slider"
          type="range" 
          min="0.5" 
          max="2.5" 
          step="0.5" 
          value={animationState.speed} 
          onChange={handleSpeedChange}
          className="w-24 md:w-36 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      {/* Progress indicator */}
      <div className="hidden md:flex items-center gap-2 px-3 md:px-5 py-2 bg-gray-700/50 backdrop-blur-sm rounded-md">
        <span className="text-white text-sm whitespace-nowrap">
          Progress: {animationState.currentStep} / {animationState.totalSteps}
        </span>
        <div className="w-24 md:w-32 bg-gray-600 rounded-full h-2.5 overflow-hidden">
          <div 
            className="bg-green-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(animationState.currentStep / animationState.totalSteps) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;
