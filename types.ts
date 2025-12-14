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

export interface PlayerStats {
  id: string; // Unique key (username or wallet)
  farcasterUser?: {
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  walletAddress?: string;
  totalScore: number;
  totalDistance: number;
  runCount: number;
  lastActive: string;
}

export enum RankingMode {
  HIGH_SCORE = 'HIGH_SCORE',
  TOTAL_STATS = 'TOTAL_STATS'
}

export interface DogThought {
  text: string;
  emotion: string;
}

// Define the R3F elements shape to reuse
interface R3FElements {
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

// Global JSX definitions for React Three Fiber elements to fix TypeScript errors
declare global {
  interface Window {
    ethereum?: any;
  }
  namespace JSX {
    interface IntrinsicElements extends R3FElements {}
  }
}

// Augment React's JSX namespace for newer TS/React versions (React 18+)
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements extends R3FElements {}
  }
}