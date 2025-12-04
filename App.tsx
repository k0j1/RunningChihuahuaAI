import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, SoftShadows, OrbitControls } from '@react-three/drei';
import { Chihuahua } from './components/Chihuahua';
import { Gorilla } from './components/Gorilla';
import { World } from './components/World';
import { Obstacle } from './components/Obstacle';
import { Projectile } from './components/Projectile';
import { Overlay } from './components/Overlay';
import { GameState, DogThought, ScoreEntry, ObstacleType, DodgeType, ReactionType, ProjectileType } from './types';
import { generateDogThought } from './services/geminiService';

// Logic Component inside Canvas to handle frame updates
const GameLoop = ({ 
  gameState, 
  speed, 
  onDistanceUpdate, 
  onObstacleTick, 
  setObstacleProgress,
  onProjectileTick,
  setProjectileProgress
}: { 
  gameState: GameState; 
  speed: number; 
  onDistanceUpdate: (delta: number) => void; 
  onObstacleTick: (delta: number) => void;
  setObstacleProgress: (progress: number) => void;
  onProjectileTick: (delta: number) => void;
  setProjectileProgress: (progress: number) => void;
}) => {
  useFrame((state, delta) => {
    if (gameState !== GameState.RUNNING) return;
    onDistanceUpdate(delta * speed * 10);
    onObstacleTick(delta);
    onProjectileTick(delta);
  });
  return null;
};

// Component to adjust camera based on screen width
const CameraAdjuster = () => {
  const { camera, size } = useThree();
  
  useEffect(() => {
    const isMobile = size.width < 768;
    if (isMobile) {
      // Mobile position: Higher and further back to see more depth
      camera.position.set(1.5, 6, -12);
    } else {
      // Desktop position
      camera.position.set(3, 3, -5);
    }
  }, [size.width, camera]);
  
  return null;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [speed, setSpeed] = useState<number>(2.0);
  const [dayTime, setDayTime] = useState<boolean>(true);
  const [thought, setThought] = useState<DogThought | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  
  // Game Stats
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [history, setHistory] = useState<ScoreEntry[]>([]);

  // Obstacle Logic
  const [hazardActive, setHazardActive] = useState(false);
  const hazardActiveRef = useRef(false); // Ref for sync checking
  const [obstacleProgress, setObstacleProgress] = useState(0); 
  const [obstacleType, setObstacleType] = useState<ObstacleType>(ObstacleType.ROCK);
  const [hazardPosition, setHazardPosition] = useState({ top: '50%', left: '50%' });

  // Projectile Logic
  const [projectileActive, setProjectileActive] = useState(false);
  const projectileActiveRef = useRef(false); // Ref for sync checking
  const [projectileProgress, setProjectileProgress] = useState(0);
  const [projectileType, setProjectileType] = useState<ProjectileType>(ProjectileType.BARREL);
  const [projectileStartZ, setProjectileStartZ] = useState(8);

  // Dodge & Hit Logic
  const [isDodging, setIsDodging] = useState(false);
  const [dodgeType, setDodgeType] = useState<DodgeType>(DodgeType.SIDESTEP);
  const [isHit, setIsHit] = useState(false);
  const [isGorillaHit, setIsGorillaHit] = useState(false);
  
  // Reaction Faces
  const [reaction, setReaction] = useState<{ chihuahua: ReactionType, gorilla: ReactionType }>({
    chihuahua: ReactionType.NEUTRAL,
    gorilla: ReactionType.NEUTRAL
  });
  
  // Timers and Refs
  const timeSinceLastObstacle = useRef(0);
  const nextObstacleTime = useRef(3); 
  const isDodgedRef = useRef(false);

  const timeSinceLastProjectile = useRef(0);
  const nextProjectileTime = useRef(5);
  const isDuckedRef = useRef(false);
  const isThrowingRef = useRef(false);

  const reactionTimeoutRef = useRef<number | null>(null);

  // Load history on mount
  useEffect(() => {
    const saved = localStorage.getItem('chihuahua_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Auto-hide thought after 5 seconds
  useEffect(() => {
    if (thought) {
      const timer = setTimeout(() => {
        setThought(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [thought]);

  const setReactionState = (dog: ReactionType, gorilla: ReactionType) => {
    setReaction({ chihuahua: dog, gorilla: gorilla });
    if (reactionTimeoutRef.current) clearTimeout(reactionTimeoutRef.current);
    reactionTimeoutRef.current = window.setTimeout(() => {
      setReaction({ chihuahua: ReactionType.NEUTRAL, gorilla: ReactionType.NEUTRAL });
    }, 1500);
  };

  const startGame = () => {
    setGameState(GameState.RUNNING);
    setScore(0);
    setDistance(0);
    setLives(3);
    setCombo(0);
    
    setHazardActive(false);
    hazardActiveRef.current = false;
    setObstacleProgress(0);
    
    setProjectileActive(false);
    projectileActiveRef.current = false;
    setProjectileProgress(0);
    
    setIsHit(false);
    setIsGorillaHit(false);
    setReaction({ chihuahua: ReactionType.NEUTRAL, gorilla: ReactionType.NEUTRAL });
    
    timeSinceLastObstacle.current = 0;
    nextObstacleTime.current = 1.5 + Math.random() * 2; // Faster start

    timeSinceLastProjectile.current = 0;
    nextProjectileTime.current = 5 + Math.random() * 5;

    setThought({ text: "Here we go again!", emotion: "excited" });
  };

  const returnToTitle = () => {
    setGameState(GameState.TITLE);
  };

  const handleGameOver = () => {
    setGameState(GameState.GAME_OVER);
    
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newEntry: ScoreEntry = {
      date: now.toISOString(),
      formattedDate: formattedDate,
      score: score,
      distance: Math.floor(distance)
    };
    const newHistory = [newEntry, ...history].slice(0, 50); // Keep top 50
    setHistory(newHistory);
    localStorage.setItem('chihuahua_history', JSON.stringify(newHistory));
    setThought({ text: "I'll get away next time...", emotion: "tired" });
  };

  const handleTogglePause = () => {
    if (gameState === GameState.RUNNING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.RUNNING);
  };

  const handleAskThought = async () => {
    setIsThinking(true);
    const context = `Running from Gorilla. Lives: ${lives.toFixed(1)}/3. Score: ${score}. Distance: ${distance.toFixed(0)}m.`;
    const newThought = await generateDogThought(context);
    setThought(newThought);
    setIsThinking(false);
  };

  // Main Obstacle Dodge
  const handleDodge = () => {
    if (gameState !== GameState.RUNNING) return;
    
    let dodgePerformed = false;

    if (hazardActiveRef.current) {
      // Force JUMP for Sheep
      if (obstacleType === ObstacleType.SHEEP) {
        setDodgeType(DodgeType.JUMP);
      } else {
        // Pick random dodge animation for others (No SHAKE)
        const types = [DodgeType.JUMP, DodgeType.SIDESTEP, DodgeType.SPIN];
        setDodgeType(types[Math.floor(Math.random() * types.length)]);
      }

      isDodgedRef.current = true;
      dodgePerformed = true;
    }

    // Unified Dodge: Also dodge projectile if active
    if (projectileActiveRef.current) {
      isDuckedRef.current = true;
      // Also trigger visual dodge if not already triggered by obstacle
      if (!dodgePerformed) {
         setDodgeType(DodgeType.SPIN);
         dodgePerformed = true;
      }
    }

    if (dodgePerformed) {
      setIsDodging(true);
      
      // Combo logic
      setCombo(prev => prev + 1);
      const bonus = (combo + 1) * 5;
      setScore(prev => prev + 10 + bonus);
      
      setTimeout(() => setIsDodging(false), 500);
    }
  };

  // Projectile Duck (Actually uses SPIN now)
  const handleDuck = () => {
    if (gameState !== GameState.RUNNING) return;
    
    let dodgePerformed = false;

    if (projectileActiveRef.current) {
      isDuckedRef.current = true;
      setDodgeType(DodgeType.SPIN); // Replaced SLIDE with SPIN
      dodgePerformed = true;
    }

    // Unified Dodge: Also dodge obstacle if active
    if (hazardActiveRef.current) {
      isDodgedRef.current = true;
      if (!dodgePerformed) {
        setDodgeType(DodgeType.JUMP); // Generic dodge for obstacle
        dodgePerformed = true;
      }
    }

    if (dodgePerformed) {
      setIsDodging(true);
      setScore(prev => prev + 20); // More points for ducking
      setTimeout(() => setIsDodging(false), 500);
    }
  };

  const handleDistanceUpdate = (distDelta: number) => {
    setDistance(prev => prev + (distDelta / 10)); 
    setScore(prev => prev + 1);
  };

  // ----- OBSTACLE LOOP -----
  const handleObstacleTick = (delta: number) => {
    if (!hazardActiveRef.current) {
      // Only increment timer if Projectile is NOT active. This strictly separates them.
      // NOTE: We still pause obstacle spawn if projectile active to reduce clutter,
      // but unified dodge makes overlap less fatal.
      if (!projectileActiveRef.current && !isThrowingRef.current) {
         timeSinceLastObstacle.current += delta;
         
         if (timeSinceLastObstacle.current > nextObstacleTime.current) {
            // Spawn Obstacle
            setHazardActive(true);
            hazardActiveRef.current = true;
            setObstacleProgress(0);
            isDodgedRef.current = false;
            
            // Random Type (Weighted) - Removed RIVER
            const rand = Math.random();
            let type = ObstacleType.ROCK;
            if (rand < 0.3) type = ObstacleType.CAR;
            else if (rand < 0.6) type = ObstacleType.ANIMAL;
            else if (rand < 0.8) type = ObstacleType.SHEEP;
            else type = ObstacleType.ROCK;
            
            setObstacleType(type);

            // Random Button Position (within 20% to 80% to stay on screen)
            const top = 20 + Math.random() * 60;
            const left = 20 + Math.random() * 60;
            setHazardPosition({ top: `${top}%`, left: `${left}%` });

            timeSinceLastObstacle.current = 0;
            // Faster interval: 1.5s to 3.5s
            nextObstacleTime.current = 1.5 + Math.random() * 2.0; 
         }
      }
    } else {
      // Speed logic
      const approachSpeed = 0.5 * speed * delta; 
      const newProgress = obstacleProgress + approachSpeed;
      
      setObstacleProgress(newProgress);

      if (newProgress >= 1) {
        if (!isDodgedRef.current && !isHit) {
          // HIT OBSTACLE
          const newLives = lives - 1;
          setLives(newLives);
          setIsHit(true);
          setCombo(0); // Reset Combo
          setThought({ text: "OUCH!!!", emotion: "scared" });
          setReactionState(ReactionType.PAIN, ReactionType.LAUGH);
          
          setTimeout(() => setIsHit(false), 1500);

          if (newLives <= 0) {
            handleGameOver();
          }
        } else if (isDodgedRef.current) {
          // SUCCESSFUL DODGE CONTINUATION
          // Do nothing, let it travel to gorilla
        }
      }

      // 2. Gorilla Collision Logic (Past 1.0)
      if (newProgress >= 1) {
        // Only if dodged dog do we check for gorilla
        if (isDodgedRef.current) {
           // Calculate Gorilla Z position based on lives
           // Map 0..3 lives to 0..16 Z
           const gorillaZ = Math.min(16, Math.max(0, (lives / 3) * 16));
           // Map progress to Z (-40 to +X)
           // Obstacle.tsx: zPos = -40 + (progress * 40)
           const obstacleZ = -40 + (newProgress * 40);

           // Hit if obstacle passes Gorilla's "front" (approx 1.0 unit depth buffer)
           if (obstacleZ >= gorillaZ - 1.0) {
               // HIT GORILLA
               setLives(prev => Math.min(3, prev + 0.2));
               setIsGorillaHit(true);
               setReactionState(ReactionType.HAPPY, ReactionType.PAIN);
               setTimeout(() => setIsGorillaHit(false), 1000);

               // Reset Obstacle
               setHazardActive(false);
               hazardActiveRef.current = false;
               setObstacleProgress(0);
               return;
           }
        }
        
        // Safety Reset if it goes too far back (approx Z=24)
        if (newProgress > 1.6) {
           setHazardActive(false);
           hazardActiveRef.current = false;
           setObstacleProgress(0);
        }
      }
    }
  };

  // ----- PROJECTILE LOOP -----
  const handleProjectileTick = (delta: number) => {
    if (!projectileActiveRef.current) {
      // Only increment timer if Obstacle is NOT active
      if (!hazardActiveRef.current) {
         timeSinceLastProjectile.current += delta;
         
         if (timeSinceLastProjectile.current > nextProjectileTime.current) {
            // Trigger Gorilla Throw Animation
            isThrowingRef.current = true;
            setTimeout(() => {
                // Determine start Z based on current lives to sync with Gorilla Position
                const currentGorillaZ = Math.min(16, Math.max(0, (lives / 3) * 16));
                setProjectileStartZ(currentGorillaZ);

                setProjectileActive(true);
                projectileActiveRef.current = true;
                setProjectileProgress(0);
                isDuckedRef.current = false;
                isThrowingRef.current = false;
                setProjectileType(Math.random() > 0.5 ? ProjectileType.BARREL : ProjectileType.BANANA);
            }, 500);

            timeSinceLastProjectile.current = 0;
            nextProjectileTime.current = 4 + Math.random() * 4; 
         }
      }
    } else {
      // Projectile flies at a speed that depends on distance.
      // Speed in units/sec = speed * 5
      // Total Distance = projectileStartZ
      // Total Time = projectileStartZ / (speed * 5)
      const flySpeed = (speed * delta * 5) / Math.max(projectileStartZ, 1); 
      const newProgress = projectileProgress + flySpeed;
      setProjectileProgress(newProgress);

      if (newProgress >= 1) {
        if (!isDuckedRef.current && !isHit) {
           // HIT BY PROJECTILE
           const newLives = lives - 1;
           setLives(newLives);
           setIsHit(true);
           setCombo(0);
           setThought({ text: "BONK!", emotion: "scared" });
           setReactionState(ReactionType.PAIN, ReactionType.LAUGH);
           setTimeout(() => setIsHit(false), 1500);

           if (newLives <= 0) {
             handleGameOver();
           }
        }
        // Projectile done
        setProjectileActive(false);
        projectileActiveRef.current = false;
        setProjectileProgress(0);
      }
    }
  }
  
  // Calculate if the Duck Button should be shown based on "1 second distance"
  // Remaining Time = (1 - progress) * (Distance / Velocity)
  // Velocity = speed * 5
  // We want to show if Remaining Time <= 1.0
  const projectileVelocity = speed * 5;
  const projectileTotalTime = Math.max(projectileStartZ, 1) / projectileVelocity;
  const projectileTimeRemaining = (1 - projectileProgress) * projectileTotalTime;
  
  // Show button if active AND (time remaining is short OR distance was very short to begin with)
  const showDuckButton = projectileActive && (projectileTimeRemaining <= 1.0);

  return (
    <div className="w-full h-screen relative bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [3, 3, -5], fov: 60 }}>
          <CameraAdjuster />
          <Suspense fallback={null}>
            <GameLoop 
              gameState={gameState} 
              speed={speed} 
              onDistanceUpdate={handleDistanceUpdate}
              onObstacleTick={handleObstacleTick}
              setObstacleProgress={setObstacleProgress}
              onProjectileTick={handleProjectileTick}
              setProjectileProgress={setProjectileProgress}
            />

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

            <Chihuahua 
              speed={gameState === GameState.RUNNING ? speed : 0} 
              isRunning={gameState === GameState.RUNNING}
              isDodging={isDodging}
              dodgeType={dodgeType}
              isHit={isHit}
            />

            <Gorilla
              speed={gameState === GameState.RUNNING ? speed : 0} 
              isRunning={gameState === GameState.RUNNING}
              lives={lives}
              isHit={isGorillaHit}
              isThrowing={isThrowingRef.current}
            />
            
            <World 
              speed={gameState === GameState.RUNNING ? speed : 0} 
              isRunning={gameState === GameState.RUNNING}
            />

            <Obstacle 
               active={hazardActive}
               type={obstacleType}
               speed={speed}
               progress={obstacleProgress}
            />

            <Projectile 
               active={projectileActive}
               type={projectileType}
               progress={projectileProgress}
               startX={0}
               startZ={projectileStartZ}
            />

            <OrbitControls 
              enablePan={false} 
              maxPolarAngle={Math.PI / 2 - 0.1} 
              minPolarAngle={Math.PI / 4}
              maxDistance={20} // Increased max distance to allow camera zoom out on mobile
              minDistance={3}
            />
            
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
        score={score}
        distance={distance}
        lives={lives}
        combo={combo}
        hazardActive={hazardActive}
        hazardPosition={hazardPosition}
        projectileActive={projectileActive}
        showDuckButton={showDuckButton}
        history={history}
        isThinking={isThinking}
        isHit={isHit}
        reaction={reaction}
        onStartGame={startGame}
        onShowHistory={() => setGameState(GameState.HISTORY)}
        onHideHistory={() => setGameState(GameState.TITLE)}
        onTogglePause={handleTogglePause}
        onSpeedChange={setSpeed}
        onToggleDayTime={() => setDayTime(!dayTime)}
        onAskThought={handleAskThought}
        onDodge={handleDodge}
        onDuck={handleDuck}
        onReturnToTitle={returnToTitle}
      />
    </div>
  );
};

export default App;