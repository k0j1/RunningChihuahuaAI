import React from 'react';

export enum GameState {
  TITLE = 'TITLE',
  HISTORY = 'HISTORY',
  RANKING = 'RANKING',
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER'
}

export enum ObstacleType {
  ROCK = 'ROCK',
  CAR = 'CAR',
  ANIMAL = 'ANIMAL',
  SHEEP = 'SHEEP'
}

export enum ProjectileType {
  BARREL = 'BARREL',
  BANANA = 'BANANA'
}

export enum DodgeType {
  SIDESTEP = 'SIDESTEP',
  JUMP = 'JUMP',
  SPIN = 'SPIN'
}

export enum ReactionType {
  NEUTRAL = 'NEUTRAL',
  HAPPY = 'HAPPY',
  PAIN = 'PAIN',
  LAUGH = 'LAUGH'
}

export interface DogThought {
  text: string;
  emotion: 'happy' | 'tired' | 'excited' | 'hungry' | 'philosophical' | 'scared';
}

export interface GameSettings {
  speed: number;
  dayTime: boolean;
}

export interface ScoreEntry {
  date: string;     // ISO string
  formattedDate: string; // Readable string with time
  score: number;
  distance: number;
}

// Global JSX definitions for React Three Fiber elements to fix TypeScript errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      // Catch-all to allow any R3F element without explicit definition
      [elemName: string]: any;
    }
  }
}