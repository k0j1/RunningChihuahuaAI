export enum GameState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED'
}

export interface DogThought {
  text: string;
  emotion: 'happy' | 'tired' | 'excited' | 'hungry' | 'philosophical';
}

export interface GameSettings {
  speed: number;
  dayTime: boolean;
}