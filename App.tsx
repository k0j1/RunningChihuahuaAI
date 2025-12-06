import React, { useState, Suspense, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Environment, SoftShadows, OrbitControls } from '@react-three/drei';
import { Chihuahua } from './components/Chihuahua';
import { Gorilla } from './components/Gorilla';
import { World } from './components/World';
import { Obstacle } from './components/Obstacle';
import { Projectile } from './components/Projectile';
import { Overlay } from './components/Overlay';
import { GameState, ScoreEntry, ObstacleType, DodgeType, ProjectileType } from './types';

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
  
  // Game Stats
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [lastGameDate, setLastGameDate] = useState<string | null>(null);

  // Gorilla Boss Stats
  const [gorillaLevel, setGorillaLevel] = useState(1);
  const [gorillaHits, setGorillaHits] = useState(0);
  const [isGorillaDefeated, setIsGorillaDefeated] = useState(false);

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

  // Queued Actions (Button pressed but waiting for timing)
  const [isDodgeQueued, setIsDodgeQueued] = useState(false);
  const [isDuckQueued, setIsDuckQueued] = useState(false);
  
  // Cut-In Logic
  // Included ID for re-render, and x/y for positioning
  const [dodgeCutIn, setDodgeCutIn] = useState<{id: number, text: string, x: number, y: number} | null>(null);
  
  // Timers and Refs
  const timeSinceLastObstacle = useRef(0);
  const nextObstacleTime = useRef(3); 
  const isDodgedRef = useRef(false);

  const timeSinceLastProjectile = useRef(0);
  const nextProjectileTime = useRef(5);
  const isDuckedRef = useRef(false);
  const isThrowingRef = useRef(false);

  const cutInTimeoutRef = useRef<number | null>(null);

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

  const triggerComicCutIn = (clickX?: number, clickY?: number) => {
    const comicWords = ["WHOOSH!", "SWISH!", "NICE!", "WOW!", "ZOOM!", "YEAH!", "DODGE!"];
    const word = comicWords[Math.floor(Math.random() * comicWords.length)];
    
    const width = window.innerWidth;
    const height = window.innerHeight;

    let x = width * 0.8; // Default Right
    let y = height * 0.5;

    if (clickX !== undefined && clickY !== undefined) {
      // If clicked on left side, show wipe on left (20%). If right, show on right (80%).
      const isLeft = clickX < width / 2;
      x = isLeft ? width * 0.2 : width * 0.8;
      y = clickY;
    } else {
      // Random side if triggered without click (e.g. keyboard)
      x = Math.random() > 0.5 ? width * 0.2 : width * 0.8;
      y = height * 0.4 + Math.random() * (height * 0.2);
    }

    // Clamp Y to avoid overlapping top HUD or bottom Speedometer
    // Keep between 20% and 80% height
    y = Math.max(height * 0.2, Math.min(y, height * 0.8));

    // Set with unique ID to force key change in Overlay
    setDodgeCutIn({ id: Date.now(), text: word, x, y });

    if (cutInTimeoutRef.current) clearTimeout(cutInTimeoutRef.current);
    cutInTimeoutRef.current = window.setTimeout(() => {
      setDodgeCutIn(null);
    }, 1000); // 1 second duration for wipe
  };

  const startGame = () => {
    setGameState(GameState.RUNNING);
    setScore(0);
    setDistance(0);
    setLives(3);
    setCombo(0);
    setSpeed(2.0); // Reset speed
    setLastGameDate(null);
    
    // Reset Gorilla
    setGorillaLevel(1);
    setGorillaHits(0);
    setIsGorillaDefeated(false);

    setHazardActive(false);
    hazardActiveRef.current = false;
    setObstacleProgress(0);
    setIsDodgeQueued(false);
    
    setProjectileActive(false);
    projectileActiveRef.current = false;
    setProjectileProgress(0);
    setIsDuckQueued(false);
    
    setIsHit(false);
    setIsGorillaHit(false);
    setDodgeCutIn(null);
    
    timeSinceLastObstacle.current = 0;
    nextObstacleTime.current = 1.5 + Math.random() * 2; // Faster start

    timeSinceLastProjectile.current = 0;
    nextProjectileTime.current = 5 + Math.random() * 5;
  };

  const returnToTitle = () => {
    setGameState(GameState.TITLE);
  };

  const handleGameOver = () => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const isoDate = now.toISOString();

    const newEntry: ScoreEntry = {
      date: isoDate,
      formattedDate: formattedDate,
      score: score,
      distance: Math.floor(distance)
    };
    
    setLastGameDate(isoDate); // Mark this run
    
    const newHistory = [newEntry, ...history].slice(0, 100); // Keep top 100
    setHistory(newHistory);
    localStorage.setItem('chihuahua_history', JSON.stringify(newHistory));

    setGameState(GameState.GAME_OVER);
  };

  const handleTogglePause = () => {
    if (gameState === GameState.RUNNING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.RUNNING);
  };

  const handleGorillaDefeat = () => {
    setIsGorillaDefeated(true);
    setScore(prev => prev + 500); // Big bonus
    
    // Clear hazards during transition
    setHazardActive(false);
    hazardActiveRef.current = false;
    setIsDodgeQueued(false);
    
    setProjectileActive(false);
    projectileActiveRef.current = false;
    setIsDuckQueued(false);

    // Wait for animation, then level up
    setTimeout(() => {
      setGorillaLevel(prev => prev + 1);
      setGorillaHits(0);
      setIsGorillaDefeated(false);
      
      // Push back timer so he doesn't attack instantly
      timeSinceLastObstacle.current = 0;
      timeSinceLastProjectile.current = 0;
    }, 3000);
  };

  // Helper to extract coordinates from event
  const getEventCoords = (e?: React.MouseEvent | React.TouchEvent | any) => {
    if (!e) return { x: undefined, y: undefined };
    if (e.clientX) return { x: e.clientX, y: e.clientY };
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: undefined, y: undefined };
  };

  // Dodge Action Performer (called from Queue)
  const performDodge = () => {
    if (obstacleType === ObstacleType.SHEEP) {
      setDodgeType(DodgeType.JUMP);
    } else {
      const types = [DodgeType.JUMP, DodgeType.SIDESTEP, DodgeType.SPIN];
      setDodgeType(types[Math.floor(Math.random() * types.length)]);
    }

    isDodgedRef.current = true;
    setIsDodging(true);
    
    // Combo logic
    setCombo(prev => prev + 1);
    const bonus = (combo + 1) * 5;
    setScore(prev => prev + 10 + bonus);
    
    setTimeout(() => setIsDodging(false), 500);
  };

  // Duck Action Performer (called from Queue)
  const performDuck = () => {
    setDodgeType(DodgeType.SPIN);
    isDuckedRef.current = true;
    setIsDodging(true);
    
    setScore(prev => prev + 20); 
    setTimeout(() => setIsDodging(false), 500);
  };

  // Main Dodge Button Handler (Queues Action)
  const handleDodge = (e?: any) => {
    if (gameState !== GameState.RUNNING) return;
    
    // Queue Dodge if active
    if (hazardActiveRef.current) {
       setIsDodgeQueued(true);
       const { x, y } = getEventCoords(e);
       triggerComicCutIn(x, y);
    }

    // Unified: Queue Duck if active too
    if (projectileActiveRef.current) {
       setIsDuckQueued(true);
       if (!hazardActiveRef.current) {
           const { x, y } = getEventCoords(e);
           triggerComicCutIn(x, y);
       }
    }
  };

  // Main Duck Button Handler (Queues Action)
  const handleDuck = (e?: any) => {
    if (gameState !== GameState.RUNNING) return;

    // Queue Duck if active
    if (projectileActiveRef.current) {
       setIsDuckQueued(true);
       const { x, y } = getEventCoords(e);
       triggerComicCutIn(x, y);
    }
    
    // Unified: Queue Dodge if active too
    if (hazardActiveRef.current) {
        setIsDodgeQueued(true);
        if (!projectileActiveRef.current) {
           const { x, y } = getEventCoords(e);
           triggerComicCutIn(x, y);
        }
    }
  };

  const handleDistanceUpdate = (distDelta: number) => {
    const increment = distDelta / 10;
    
    setDistance(prev => {
      const newDist = prev + increment;
      // Speed up every 50 meters
      if (Math.floor(newDist / 50) > Math.floor(prev / 50)) {
         setSpeed(s => Math.min(s + 0.2, 5.0)); // Cap speed at 5.0
      }
      return newDist;
    }); 
    setScore(prev => prev + 1);
  };

  // ----- OBSTACLE LOOP -----
  const handleObstacleTick = (delta: number) => {
    // Stop spawning if Gorilla is defeated
    if (isGorillaDefeated) return;

    if (!hazardActiveRef.current) {
      // Only increment timer if Projectile is NOT active. This strictly separates them.
      if (!projectileActiveRef.current && !isThrowingRef.current) {
         timeSinceLastObstacle.current += delta;
         
         if (timeSinceLastObstacle.current > nextObstacleTime.current) {
            // Spawn Obstacle
            setHazardActive(true);
            hazardActiveRef.current = true;
            setIsDodgeQueued(false); // Reset queue for new hazard
            setObstacleProgress(0);
            isDodgedRef.current = false;
            
            const rand = Math.random();
            let type = ObstacleType.ROCK;
            if (rand < 0.3) type = ObstacleType.CAR;
            else if (rand < 0.6) type = ObstacleType.ANIMAL;
            else if (rand < 0.8) type = ObstacleType.SHEEP;
            else type = ObstacleType.ROCK;
            
            setObstacleType(type);

            const top = 20 + Math.random() * 60;
            const left = 20 + Math.random() * 60;
            setHazardPosition({ top: `${top}%`, left: `${left}%` });

            timeSinceLastObstacle.current = 0;
            nextObstacleTime.current = 1.5 + Math.random() * 2.0; 
         }
      }
    } else {
      // Speed logic
      const approachSpeed = 0.5 * speed * delta; 
      const newProgress = obstacleProgress + approachSpeed;
      
      setObstacleProgress(newProgress);

      // Check Queue Logic - If close enough (>0.8) and queued, trigger actual dodge
      if (newProgress > 0.8 && isDodgeQueued && !isDodgedRef.current && !isHit) {
          performDodge();
      }

      if (newProgress >= 1) {
        if (!isDodgedRef.current && !isHit) {
          // HIT DOG
          const newLives = lives - 1;
          setLives(newLives);
          setIsHit(true);
          setCombo(0); // Reset Combo
          
          setTimeout(() => setIsHit(false), 1500);

          if (newLives <= 0) {
            handleGameOver();
          }
        } 
      }

      // 2. Gorilla Collision Logic (Past 1.0)
      if (newProgress >= 1) {
        // Only if dodged dog do we check for gorilla
        if (isDodgedRef.current) {
           const gorillaZ = Math.min(16, Math.max(0, (lives / 3) * 16));
           const obstacleZ = -40 + (newProgress * 40);

           if (obstacleZ >= gorillaZ - 1.0) {
               // HIT GORILLA
               setLives(prev => Math.min(3, prev + 0.2));
               setIsGorillaHit(true);
               setTimeout(() => setIsGorillaHit(false), 1000);
               
               const newHits = gorillaHits + 1;
               setGorillaHits(newHits);
               if (newHits >= 10) {
                  handleGorillaDefeat();
               }

               // Reset Obstacle
               setHazardActive(false);
               hazardActiveRef.current = false;
               setIsDodgeQueued(false);
               setObstacleProgress(0);
               return;
           }
        }
        
        // Safety Reset
        if (newProgress > 1.6) {
           setHazardActive(false);
           hazardActiveRef.current = false;
           setIsDodgeQueued(false);
           setObstacleProgress(0);
        }
      }
    }
  };

  // ----- PROJECTILE LOOP -----
  const handleProjectileTick = (delta: number) => {
    if (isGorillaDefeated) return;

    if (!projectileActiveRef.current) {
      if (!hazardActiveRef.current) {
         timeSinceLastProjectile.current += delta;
         
         if (timeSinceLastProjectile.current > nextProjectileTime.current) {
            isThrowingRef.current = true;
            setTimeout(() => {
                const currentGorillaZ = Math.min(16, Math.max(0, (lives / 3) * 16));
                setProjectileStartZ(currentGorillaZ);

                setProjectileActive(true);
                projectileActiveRef.current = true;
                setIsDuckQueued(false); // Reset queue
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
      const levelMultiplier = 5 + (gorillaLevel - 1) * 2;
      const flySpeed = (speed * delta * levelMultiplier) / Math.max(projectileStartZ, 1); 
      
      const newProgress = projectileProgress + flySpeed;
      setProjectileProgress(newProgress);

      // Check Queue Logic - If close enough (>0.85) and queued, trigger actual duck
      if (newProgress > 0.85 && isDuckQueued && !isDuckedRef.current && !isHit) {
          performDuck();
      }

      if (newProgress >= 1) {
        if (!isDuckedRef.current && !isHit) {
           // HIT BY PROJECTILE
           const newLives = lives - 1;
           setLives(newLives);
           setIsHit(true);
           setCombo(0);
           setTimeout(() => setIsHit(false), 1500);

           if (newLives <= 0) {
             handleGameOver();
           }
        }
        // Projectile done
        setProjectileActive(false);
        projectileActiveRef.current = false;
        setIsDuckQueued(false);
        setProjectileProgress(0);
      }
    }
  }
  
  // Calculate visibility based on timing
  const levelMultiplier = 5 + (gorillaLevel - 1) * 2;
  const projectileVelocity = speed * levelMultiplier;
  const projectileTotalTime = Math.max(projectileStartZ, 1) / projectileVelocity;
  const projectileTimeRemaining = (1 - projectileProgress) * projectileTotalTime;
  
  // Visibility Logic: 
  // 1. Hazard must be active.
  // 2. Button must NOT have been pressed (queued) yet.
  // 3. It must NOT be too late (progress < threshold).
  const showDuckButton = projectileActive && (projectileTimeRemaining <= 1.0) && !isDuckQueued && projectileProgress < 0.85;
  const showDodgeButton = hazardActive && !isDodgeQueued && obstacleProgress < 0.8;

  const projectileScale = 1 + (gorillaLevel - 1) * 0.5;

  return (
    <div className="w-full h-[100dvh] relative bg-gray-900 overflow-hidden">
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
              level={gorillaLevel}
              isDefeated={isGorillaDefeated}
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
               scale={projectileScale}
            />

            <OrbitControls 
              enablePan={false} 
              maxPolarAngle={Math.PI / 2 - 0.1} 
              minPolarAngle={Math.PI / 4}
              maxDistance={20} 
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
        score={score}
        distance={distance}
        lives={lives}
        combo={combo}
        hazardActive={hazardActive} // Still passed for fallback if needed, but we use showDodgeButton mainly
        showDodgeButton={showDodgeButton} // NEW
        hazardPosition={hazardPosition}
        projectileActive={projectileActive}
        showDuckButton={showDuckButton}
        history={history}
        lastGameDate={lastGameDate}
        isHit={isHit}
        dodgeCutIn={dodgeCutIn}
        onStartGame={startGame}
        onShowHistory={() => setGameState(GameState.HISTORY)}
        onShowRanking={() => setGameState(GameState.RANKING)}
        onHideHistory={() => setGameState(GameState.TITLE)}
        onTogglePause={handleTogglePause}
        onDodge={handleDodge}
        onDuck={handleDuck}
        onReturnToTitle={returnToTitle}
      />
    </div>
  );
};

export default App;