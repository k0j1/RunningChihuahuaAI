import React, { useState, Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Environment, SoftShadows, OrbitControls } from '@react-three/drei';
import { Chihuahua } from './components/Chihuahua';
import { World } from './components/World';
import { Overlay } from './components/Overlay';
import { GameState, DogThought } from './types';
import { generateDogThought } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.RUNNING);
  const [speed, setSpeed] = useState<number>(2.0);
  const [dayTime, setDayTime] = useState<boolean>(true);
  const [thought, setThought] = useState<DogThought | null>({ text: "Ready to run!", emotion: "happy" });
  const [isThinking, setIsThinking] = useState(false);

  // Auto-hide thought after 5 seconds
  useEffect(() => {
    if (thought) {
      const timer = setTimeout(() => {
        setThought(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [thought]);

  const handleTogglePause = () => {
    setGameState(prev => prev === GameState.RUNNING ? GameState.PAUSED : GameState.RUNNING);
  };

  const handleAskThought = async () => {
    setIsThinking(true);
    const context = `Speed is ${speed.toFixed(1)}, Time is ${dayTime ? 'Day' : 'Night'}, Status is ${gameState}`;
    const newThought = await generateDogThought(context);
    setThought(newThought);
    setIsThinking(false);
  };

  return (
    <div className="w-full h-screen relative bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [0, 1.5, -4], fov: 60 }}>
          <Suspense fallback={null}>
            {/* Lighting & Environment */}
            <ambientLight intensity={dayTime ? 0.5 : 0.1} />
            <directionalLight 
              position={[10, 20, 10]} 
              intensity={dayTime ? 1.2 : 0.2} 
              castShadow 
              shadow-mapSize={[2048, 2048]}
            >
              <orthographicCamera attach="shadow-camera" args={[-10, 10, 10, -10]} />
            </directionalLight>
            
            <Sky 
              sunPosition={dayTime ? [100, 20, 100] : [100, -20, 100]} 
              turbidity={dayTime ? 0.5 : 10}
              rayleigh={dayTime ? 0.5 : 0.2}
              mieCoefficient={0.005}
              mieDirectionalG={0.8}
            />
            { !dayTime && <Environment preset="night" /> }
            
            <SoftShadows size={10} samples={16} />

            {/* Game Objects */}
            <Chihuahua 
              speed={gameState === GameState.RUNNING ? speed : 0} 
              isRunning={gameState === GameState.RUNNING}
            />
            
            <World 
              speed={gameState === GameState.RUNNING ? speed : 0} 
              isRunning={gameState === GameState.RUNNING}
            />

            {/* Controls */}
            {/* Restrict OrbitControls to prevent going under ground */}
            <OrbitControls 
              enablePan={false} 
              maxPolarAngle={Math.PI / 2 - 0.1} 
              minPolarAngle={Math.PI / 4}
              maxDistance={10}
              minDistance={3}
            />
            
            {/* Fog for endless effect */}
            <fog attach="fog" args={[dayTime ? '#87CEEB' : '#050505', 10, 50]} />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Overlay */}
      <Overlay
        gameState={gameState}
        speed={speed}
        dayTime={dayTime}
        thought={thought}
        isThinking={isThinking}
        onTogglePause={handleTogglePause}
        onSpeedChange={setSpeed}
        onToggleDayTime={() => setDayTime(!dayTime)}
        onAskThought={handleAskThought}
      />
    </div>
  );
};

export default App;