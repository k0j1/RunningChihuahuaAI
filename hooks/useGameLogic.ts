
import { useState } from 'react';
import { GameState } from '../types';
import { useAuth } from './useAuth';
import { useScoreSystem } from './useScoreSystem';
import { usePlayerSystem } from './usePlayerSystem';
import { useBossSystem } from './useBossSystem';
import { useObstacleSystem } from './useObstacleSystem';
import { useProjectileSystem } from './useProjectileSystem';

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [dayTime, setDayTime] = useState<boolean>(true);

  // --- Sub-Systems ---
  const { farcasterUser, walletAddress, connectWallet, disconnectWallet } = useAuth();
  
  const scoreSystem = useScoreSystem(farcasterUser, walletAddress);
  const playerSystem = usePlayerSystem();
  const bossSystem = useBossSystem();
  const obstacleSystem = useObstacleSystem();
  const projectileSystem = useProjectileSystem();

  // --- Actions ---

  const startGame = () => {
    setGameState(GameState.RUNNING);
    setDayTime(true);
    scoreSystem.resetScore();
    playerSystem.resetPlayer();
    bossSystem.resetBoss();
    obstacleSystem.resetObstacles();
    projectileSystem.resetProjectiles();
  };

  const handleGameOver = () => {
    scoreSystem.saveRun();
    setGameState(GameState.CAUGHT_ANIMATION);
    setTimeout(() => {
        setGameState(GameState.GAME_OVER);
    }, 3000);
  };

  const shareScore = () => {
    const text = `I scored ${scoreSystem.score} pts and ran ${Math.floor(scoreSystem.distance)}m in Running Chihuahua AI! 🐕💨\n\nCan you beat the bosses?`;
    const url = 'https://runningchihuahuaai.k0j1.v2002.coreserver.jp/';
    const intentUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
    try {
       // @ts-ignore
       if (window.farcaster?.actions) window.farcaster.actions.openUrl(intentUrl);
       else window.open(intentUrl, '_blank');
    } catch (e) {
        window.open(intentUrl, '_blank');
    }
  };

  // --- Event Handlers (UI) ---

  const getEventCoords = (e?: any) => {
    if (!e) return { x: undefined, y: undefined };
    if (e.clientX) return { x: e.clientX, y: e.clientY };
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: undefined, y: undefined };
  };

  const handleDodge = (e?: any) => {
    if (gameState !== GameState.RUNNING) return;
    if (obstacleSystem.hazardActiveRef.current) {
       playerSystem.queueDodge();
       const { x, y } = getEventCoords(e);
       playerSystem.triggerComicCutIn(x, y);
    }
    // Also trigger cut-in if ducking projectile while hazard is inactive (for fun)
    if (projectileSystem.projectileActiveRef.current && !obstacleSystem.hazardActiveRef.current) {
       playerSystem.queueDuck(); // Fallback intent
    }
  };

  const handleDuck = (e?: any) => {
    if (gameState !== GameState.RUNNING) return;
    if (projectileSystem.projectileActiveRef.current) {
       playerSystem.queueDuck();
       const { x, y } = getEventCoords(e);
       playerSystem.triggerComicCutIn(x, y);
    }
    if (obstacleSystem.hazardActiveRef.current && !projectileSystem.projectileActiveRef.current) {
        playerSystem.queueDodge(); // Fallback intent
    }
  };

  // --- Game Loop Ticks ---

  const handleDistanceUpdate = (distDelta: number) => {
    scoreSystem.updateDistance(distDelta);
  };

  const handleObstacleTick = (delta: number) => {
    if (bossSystem.isBossDefeated || gameState === GameState.CAUGHT_ANIMATION) return;

    // 1. Check Spawning (Only if projectile not spawning)
    if (!obstacleSystem.hazardActiveRef.current && !projectileSystem.projectileActiveRef.current && !projectileSystem.isThrowingRef.current) {
       // updateObstacle handles internal timer and returns { spawned: true } if ready
       const res = obstacleSystem.updateObstacle(delta, scoreSystem.score); // Passing score just to advance timer
       if (res.spawned) {
         playerSystem.clearQueues();
       }
    } 
    // 2. Update Active Obstacle
    else if (obstacleSystem.hazardActiveRef.current) {
       const res = obstacleSystem.updateObstacle(delta, scoreSystem.speed);
       const progress = res.progress;

       // A. Input Timing Check (Dodge)
       if (progress > 0.8 && playerSystem.isDodgeQueued && !playerSystem.isDodgedRef.current && !playerSystem.isHit) {
           const bonusCombo = playerSystem.performDodge(obstacleSystem.obstacleType);
           const bonus = bonusCombo * 5;
           scoreSystem.addScore(10 + bonus);
       }

       // B. Hit Player Check
       if (progress >= 1.0 && progress < 1.1) {
          if (!playerSystem.isDodgedRef.current && !playerSystem.isHit) {
             const remainingLives = playerSystem.takeDamage();
             if (remainingLives <= 0.2) handleGameOver();
          }
       }

       // C. Hit Boss Check (Counter Attack)
       if (progress >= 1.0) {
          if (playerSystem.isDodgedRef.current) {
              const bossZ = Math.min(16, Math.max(0, (playerSystem.lives / 3) * 16));
              const obstacleZ = -40 + (progress * 40);
              
              // If obstacle reaches boss
              if (obstacleZ >= bossZ - 1.0) {
                  playerSystem.heal(0.2); // Reward life
                  bossSystem.registerHit();
                  
                  if (bossSystem.bossHits + 1 >= 10) {
                      bossSystem.defeatBoss();
                      scoreSystem.addScore(1000);
                      // Reset hazards
                      obstacleSystem.setHazardActive(false);
                      obstacleSystem.hazardActiveRef.current = false;
                      projectileSystem.setProjectileActive(false);
                  }
                  
                  // Despawn obstacle immediately on hit
                  obstacleSystem.setHazardActive(false);
                  obstacleSystem.hazardActiveRef.current = false;
                  obstacleSystem.setObstacleProgress(0);
                  playerSystem.clearQueues();
              }
          }
       }
    }
  };

  const handleProjectileTick = (delta: number) => {
    if (bossSystem.isBossDefeated || gameState === GameState.CAUGHT_ANIMATION) return;

    // 1. Check Spawning
    if (!projectileSystem.projectileActiveRef.current) {
        if (!obstacleSystem.hazardActiveRef.current) {
           const ready = projectileSystem.checkSpawn(delta);
           if (ready) {
               projectileSystem.triggerThrow(playerSystem.lives, bossSystem.bossType);
               playerSystem.clearQueues();
           }
        }
    } 
    // 2. Update Active Projectile
    else {
        const res = projectileSystem.updateProjectile(delta, scoreSystem.speed, bossSystem.bossLevel);
        const progress = res.progress;

        // A. Input Timing Check (Duck)
        if (progress > 0.85 && playerSystem.isDuckQueued && !playerSystem.isDuckedRef.current && !playerSystem.isHit) {
            playerSystem.performDuck();
            scoreSystem.addScore(20);
        }

        // B. Hit Player Check
        if (res.finished) {
             if (!playerSystem.isDuckedRef.current && !playerSystem.isHit) {
                 const remainingLives = playerSystem.takeDamage();
                 if (remainingLives <= 0.2) handleGameOver();
             }
             playerSystem.clearQueues();
        }
    }
  };

  // --- Reload Rankings on Screen Change ---
  if (gameState === GameState.RANKING && scoreSystem.globalRanking.length === 0) {
      scoreSystem.loadRankings();
  }

  return {
    // Game State
    gameState, setGameState,
    dayTime, setDayTime,
    
    // Auth
    farcasterUser, walletAddress, connectWallet, disconnectWallet,

    // Systems (Destructured for compatibility with View)
    ...scoreSystem,
    ...playerSystem,
    ...bossSystem,
    ...obstacleSystem,
    ...projectileSystem,

    // Computed properties for View
    isThrowing: projectileSystem.isThrowingRef.current,
    
    // Handlers
    startGame, handleGameOver, shareScore,
    handleDodge, handleDuck,
    handleDistanceUpdate, handleObstacleTick, handleProjectileTick,
  };
};
