
import React from 'react';
import { useFrame } from '@react-three/fiber';
import { GameState } from '../types';

interface GameLoopProps {
  gameState: GameState;
  speed: number;
  onDistanceUpdate: (delta: number) => void;
  onObstacleTick: (delta: number) => void;
  onProjectileTick: (delta: number) => void;
}

export const GameLoop: React.FC<GameLoopProps> = ({ 
  gameState, 
  speed, 
  onDistanceUpdate, 
  onObstacleTick, 
  onProjectileTick 
}) => {
  useFrame((state, delta) => {
    if (gameState !== GameState.RUNNING) return;
    onDistanceUpdate(delta * speed * 10);
    onObstacleTick(delta);
    onProjectileTick(delta);
  });
  return null;
};
