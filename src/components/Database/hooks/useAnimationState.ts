
import { useState, useCallback } from 'react';
import { AnimationStateType } from '../types';

export const useAnimationState = (totalSteps: number) => {
  const [animationState, setAnimationState] = useState<AnimationStateType>({
    isRunning: false,
    isPaused: false,
    currentStep: 0,
    totalSteps: totalSteps,
    speed: 1,
  });

  const handleSpeedChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setAnimationState(prev => ({ ...prev, speed: parseFloat(event.target.value) }));
  }, []);

  const resetAnimation = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: false, currentStep: 0 }));
  }, []);

  const startAnimation = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: true, isPaused: false }));
  }, []);

  const pauseAnimation = useCallback(() => {
    setAnimationState(prev => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const stepForward = useCallback(() => {
    setAnimationState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  const setTotalSteps = useCallback((steps: number) => {
    setAnimationState(prev => ({ ...prev, totalSteps: steps }));
  }, []);

  return {
    animationState,
    setAnimationState,
    handleSpeedChange,
    resetAnimation,
    startAnimation,
    pauseAnimation,
    stepForward,
    setTotalSteps
  };
};