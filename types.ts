import React from 'react';

export enum GameState {
  TITLE = 'TITLE',
  HISTORY = 'HISTORY',
  RANKING = 'RANKING',
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  CAUGHT_ANIMATION = 'CAUGHT_ANIMATION',
  GAME_OVER = 'GAME_OVER'
}

export enum BossType {
  GORILLA = 'GORILLA',
  CHEETAH = 'CHEETAH',
  DRAGON = 'DRAGON'
}

export enum ObstacleType {
  ROCK = 'ROCK',
  CAR = 'CAR',
  ANIMAL = 'ANIMAL',
  SHEEP = 'SHEEP'
}

export enum ProjectileType {
  BARREL = 'BARREL',
  BANANA = 'BANANA',
  BONE = 'BONE',
  ROCK = 'ROCK',
  FIREBALL = 'FIREBALL'
}

export enum DodgeType {
  SIDESTEP = 'SIDESTEP',
  JUMP = 'JUMP',
  SPIN = 'SPIN'
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
  farcasterUser?: {
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  walletAddress?: string;
}

export interface DogThought {
  text: string;
  emotion: string;
}

// Global JSX definitions for React Three Fiber elements to fix TypeScript errors
declare global {
  interface Window {
    ethereum?: any;
  }
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      primitive: any;
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;
      orthographicCamera: any;
      perspectiveCamera: any;
      boxGeometry: any;
      planeGeometry: any;
      sphereGeometry: any;
      coneGeometry: any;
      cylinderGeometry: any;
      dodecahedronGeometry: any;
      capsuleGeometry: any;
      torusGeometry: any;
      ringGeometry: any;
      circleGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
      meshPhongMaterial: any;
      fog: any;
      color: any;
      [elemName: string]: any;
    }
  }
}
