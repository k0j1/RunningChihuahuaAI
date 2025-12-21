import { useState, useRef, useEffect } from 'react';
import sdk from '@farcaster/frame-sdk';
import { GameState, BossType } from '../types';
import { useAuth } from './useAuth';
import { useScoreSystem } from './useScoreSystem';
import { usePlayerSystem } from './usePlayerSystem';
import { useBossSystem } from './useBossSystem';
import { useObstacleSystem } from './useObstacleSystem';
import { useProjectileSystem } from './useProjectileSystem';
import { useRewardSystem } from './useRewardSystem';

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [dayTime, setDayTime] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  
  // Use Ref to ensure the game loop always sees the correct mode immediately without waiting for re-renders
  const isDemoModeRef = useRef<boolean>(false);
  
  // Prevent duplicate Game Over / Game Clear triggers
  const gameEndedRef = useRef<boolean>(false);

  // --- Sub-Systems ---
  const { farcasterUser, walletAddress, connectWallet, disconnectWallet } = useAuth();
  
  const scoreSystem = useScoreSystem(farcasterUser, walletAddress);
  const playerSystem = usePlayerSystem();
  const bossSystem = useBossSystem();
  const obstacleSystem = useObstacleSystem();
  const projectileSystem = useProjectileSystem();
  const rewardSystem = useRewardSystem(); 

  const obstacleDodgedRef = useRef(false);

  // Sync claimed status when game over or wallet connects
  useEffect(() => {
    if ((gameState === GameState.GAME_OVER || gameState === GameState.TITLE) && walletAddress) {
        rewardSystem.refreshTotalClaimed(walletAddress);
    }
  }, [gameState, walletAddress]);

  // --- Actions ---

  const startGame = (demoMode: boolean = false) => {
    setIsDemoMode(demoMode);
    isDemoModeRef.current = demoMode; // Sync ref immediately
    gameEndedRef.current = false; // Reset game ended flag
    setGameState(GameState.RUNNING);
    setDayTime(true);
    scoreSystem.resetScore();
    playerSystem.resetPlayer();
    bossSystem.resetBoss();
    obstacleSystem.resetObstacles();
    projectileSystem.resetProjectiles();
    rewardSystem.resetClaimStatus(); 
    obstacleDodgedRef.current = false;
  };

  // Wrapper to save score with the current demo mode state
  const saveCurrentScore = async () => {
      await scoreSystem.saveRun(isDemoModeRef.current);
  };

  const handleGameOver = () => {
    if (gameEndedRef.current) return; // Prevent duplicates
    gameEndedRef.current = true;

    // Score saving is now handled by the GameOverScreen component
    setGameState(GameState.CAUGHT_ANIMATION);
    setTimeout(() => {
        setGameState(GameState.GAME_OVER);
    }, 3000);
  };

  const handleGameClear = async (bonus: number = 0) => {
     if (gameEndedRef.current) return; // Prevent duplicates
     gameEndedRef.current = true;

     // Add bonus to state immediately so it's reflected when GameOverScreen mounts
     if (bonus > 0) {
         scoreSystem.addScore(bonus);
     }

     setGameState(GameState.GAME_CLEAR);
     
     // Transition to Game Over screen after celebration
     setTimeout(() => {
         setGameState(GameState.GAME_OVER);
     }, 6000); 
  };

  const shareScore = () => {
    const text = `I scored ${scoreSystem.score} pts and ran ${Math.floor(scoreSystem.distance)}m in Running Chihuahua AI! 🐕💨\n\nCan you beat the bosses?`;
    const appUrl = 'https://farcaster.xyz/miniapps/7RH3c4fEALgF/runningchihuahua';
    const intentUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(appUrl)}`;
    
    if (farcasterUser) {
       try {
          sdk.actions.openUrl(intentUrl);
       } catch (e) {
          window.open(intentUrl, '_blank');
       }
    } else {
        window.open(intentUrl, '_blank');
    }
  };

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
    if (projectileSystem.projectileActiveRef.current && !obstacleSystem.hazardActiveRef.current) {
       playerSystem.queueDuck(); 
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
        playerSystem.queueDodge(); 
    }
  };

  const handleDistanceUpdate = (distDelta: number) => {
    scoreSystem.updateDistance(distDelta);
  };

  const handleObstacleTick = (delta: number) => {
    if (bossSystem.isBossDefeated || gameState === GameState.CAUGHT_ANIMATION || gameState === GameState.GAME_CLEAR) return;
    if (!obstacleSystem.hazardActiveRef.current && !projectileSystem.projectileActiveRef.current && !projectileSystem.isThrowingRef.current) {
       const res = obstacleSystem.updateObstacle(delta, scoreSystem.score);
       if (res.spawned) {
         playerSystem.clearQueues();
         obstacleDodgedRef.current = false;
       }
    } 
    else if (obstacleSystem.hazardActiveRef.current) {
       const res = obstacleSystem.updateObstacle(delta, scoreSystem.speed);
       const progress = res.progress;
       
       // AI Auto-Dodge (Demo Mode) - Adjusted to be tighter (0.90)
       if (isDemoModeRef.current && progress > 0.90 && !obstacleDodgedRef.current && !playerSystem.isHit) {
           const bonusCombo = playerSystem.performDodge(obstacleSystem.obstacleType);
           const bonus = bonusCombo * 10;
           scoreSystem.addScore(10 + bonus);
           obstacleDodgedRef.current = true;
           playerSystem.triggerComicCutIn(); 
       }
       
       // Player Dodge Logic
       // Tightened hitbox: Success window starts at 0.85
       if (progress > 0.85 && playerSystem.isDodgeQueued && !playerSystem.isHit) {
           if (!obstacleDodgedRef.current) {
                const bonusCombo = playerSystem.performDodge(obstacleSystem.obstacleType);
                const bonus = bonusCombo * 10;
                scoreSystem.addScore(10 + bonus);
                obstacleDodgedRef.current = true;
           }
       }
       if (progress >= 1.0 && progress < 1.1) {
          if (!obstacleDodgedRef.current && !playerSystem.isDodgedRef.current && !playerSystem.isHit) {
             const remainingLives = playerSystem.takeDamage();
             if (remainingLives <= 0.2) handleGameOver();
          }
       }
       if (progress >= 1.0) {
          if (obstacleDodgedRef.current) {
              const bossZ = Math.min(16, Math.max(0, (playerSystem.lives / 3) * 16));
              const obstacleZ = -40 + (progress * 40);
              if (obstacleZ >= bossZ - 1.0) {
                  playerSystem.heal(0.2);
                  bossSystem.registerHit();
                  if (bossSystem.bossHits + 1 >= 10) {
                      if (bossSystem.bossType === BossType.DRAGON && bossSystem.bossLevel >= 2) {
                          bossSystem.defeatBoss(true); 
                          const bonus = 21000;
                          // Don't add score here for clear, handleGameClear handles it with the full clear sequence
                          playerSystem.triggerCelebration();
                          handleGameClear(bonus);
                      } else {
                          bossSystem.defeatBoss(false);
                          scoreSystem.addScore(1000);
                          playerSystem.triggerCelebration(); 
                      }
                      obstacleSystem.setHazardActive(false);
                      obstacleSystem.hazardActiveRef.current = false;
                      projectileSystem.setProjectileActive(false);
                  }
                  obstacleSystem.setHazardActive(false);
                  obstacleSystem.hazardActiveRef.current = false;
                  obstacleSystem.setObstacleProgress(0);
                  playerSystem.clearQueues();
                  obstacleDodgedRef.current = false;
              }
          }
       }
    }
  };

  const handleProjectileTick = (delta: number) => {
    if (bossSystem.isBossDefeated || gameState === GameState.CAUGHT_ANIMATION || gameState === GameState.GAME_CLEAR) return;
    if (!projectileSystem.projectileActiveRef.current) {
        if (!obstacleSystem.hazardActiveRef.current) {
           const ready = projectileSystem.checkSpawn(delta);
           if (ready) {
               projectileSystem.triggerThrow(playerSystem.lives, bossSystem.bossType);
               playerSystem.clearQueues();
           }
        }
    } 
    else {
        const res = projectileSystem.updateProjectile(delta, scoreSystem.speed, bossSystem.bossLevel);
        const progress = res.progress;
        
        // AI Auto-Duck (Demo Mode) - Adjusted to be tighter (0.92)
        if (isDemoModeRef.current && progress > 0.92 && !playerSystem.isDuckedRef.current && !playerSystem.isHit) {
            playerSystem.performDuck();
            scoreSystem.addScore(20);
            playerSystem.triggerComicCutIn();
        }
        
        // Player Duck Logic
        // Tightened hitbox: Success window starts at 0.90
        if (progress > 0.90 && playerSystem.isDuckQueued && !playerSystem.isDuckedRef.current && !playerSystem.isHit) {
            playerSystem.performDuck();
            scoreSystem.addScore(20);
        }
        if (res.finished) {
             if (!playerSystem.isDuckedRef.current && !playerSystem.isHit) {
                 const remainingLives = playerSystem.takeDamage();
                 if (remainingLives <= 0.2) handleGameOver();
             }
             playerSystem.clearQueues();
        }
    }
  };

  if (gameState === GameState.RANKING && scoreSystem.globalRanking.length === 0) {
      scoreSystem.loadRankings();
  }

  return {
    gameState, setGameState,
    dayTime, setDayTime,
    isDemoMode, 
    farcasterUser, walletAddress, connectWallet, disconnectWallet,
    ...scoreSystem,
    ...playerSystem,
    ...bossSystem,
    ...obstacleSystem,
    ...projectileSystem,
    ...rewardSystem,
    isThrowing: projectileSystem.isThrowingRef.current,
    startGame, handleGameOver, shareScore,
    saveCurrentScore, // Export saving function
    handleDodge, handleDuck,
    handleDistanceUpdate, handleObstacleTick, handleProjectileTick,
  };
};