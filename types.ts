
import React from 'react';

export enum GameState {
  TITLE = 'TITLE',
  HISTORY = 'HISTORY',
  RANKING = 'RANKING',
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  CAUGHT_ANIMATION = 'CAUGHT_ANIMATION',
  GAME_CLEAR = 'GAME_CLEAR',
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

export enum ItemType {
  NONE = 'NONE',
  MAX_HP = 'MAX_HP',         // 💖 Max Lives +1
  HEAL_ON_DODGE = 'HEAL_ON_DODGE', // ❤️‍🩹 Heal 0.2 per dodge
  SHIELD = 'SHIELD'          // 🛡️ Guard 3 times
}

export interface UserInventory {
  [ItemType.MAX_HP]: number;
  [ItemType.HEAL_ON_DODGE]: number;
  [ItemType.SHIELD]: number;
  [ItemType.NONE]: number;
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
  stamina?: number; // Current stamina stored in DB
  lastStaminaUpdate?: string; // Timestamp of last stamina calculation
  notificationToken?: string;
  notificationUrl?: string;
  lastLoginBonusTime?: string | null; // Timestamp of last claim
}

export enum RankingMode {
  HIGH_SCORE = 'HIGH_SCORE',
  TOTAL_STATS = 'TOTAL_STATS'
}

export interface DogThought {
  text: string;
  emotion: string;
}

export interface ClaimResult {
  success: boolean;
  message: string;
  txHash?: string;
  amount?: number;
}

// Global JSX definitions for React Three Fiber elements to fix TypeScript errors across the project
declare global {
  interface Window {
    ethereum?: any;
  }
  // Standard global JSX augmentation for older TS/React setups or global JSX usage
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
