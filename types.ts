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

// Global JSX definitions for React Three Fiber elements to fix TypeScript errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      boxGeometry: any;
      meshStandardMaterial: any;
      sphereGeometry: any;
      coneGeometry: any;
      cylinderGeometry: any;
      planeGeometry: any;
      dodecahedronGeometry: any;
      ambientLight: any;
      directionalLight: any;
      orthographicCamera: any;
      fog: any;
    }
  }
}