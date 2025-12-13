import { useState, useEffect, useRef } from 'react';
import sdk from '@farcaster/frame-sdk';
import { GameState, ScoreEntry, ObstacleType, DodgeType, ProjectileType, BossType, PlayerStats } from '../types';
import { fetchGlobalRanking, fetchTotalRanking, saveScoreToSupabase } from '../services/supabase';

export const useGameLogic = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.TITLE);
  const [speed, setSpeed] = useState<number>(2.0);
  const [dayTime, setDayTime] = useState<boolean>(true);
  
  // Game Stats
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [lives, setLives] = useState(3);
  const [combo, setCombo] = useState(0);
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [globalRanking, setGlobalRanking] = useState<ScoreEntry[]>([]); // Single Run High Scores
  const [totalRanking, setTotalRanking] = useState<PlayerStats[]>([]); // Cumulative Stats
  const [lastGameDate, setLastGameDate] = useState<string | null>(null);

  // User Context (Farcaster & Wallet)
  const [farcasterUser, setFarcasterUser] = useState<{username?: string, displayName?: string, pfpUrl?: string} | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // Boss Stats
  const [bossType, setBossType] = useState<BossType>(BossType.GORILLA);
  const [bossLevel, setBossLevel] = useState(1);
  const [bossHits, setBossHits] = useState(0);
  const [isBossDefeated, setIsBossDefeated] = useState(false);

  // Obstacle Logic
  const [hazardActive, setHazardActive] = useState(false);
  const hazardActiveRef = useRef(false);
  const [obstacleProgress, setObstacleProgress] = useState(0); 
  const [obstacleType, setObstacleType] = useState<ObstacleType>(ObstacleType.ROCK);
  const [hazardPosition, setHazardPosition] = useState({ top: '50%', left: '50%' });

  // Projectile Logic
  const [projectileActive, setProjectileActive] = useState(false);
  const projectileActiveRef = useRef(false);
  const [projectileProgress, setProjectileProgress] = useState(0);
  const [projectileType, setProjectileType] = useState<ProjectileType>(ProjectileType.BARREL);
  const [projectileStartZ, setProjectileStartZ] = useState(8);

  // Dodge & Hit Logic
  const [isDodging, setIsDodging] = useState(false);
  const [dodgeType, setDodgeType] = useState<DodgeType>(DodgeType.SIDESTEP);
  const [isHit, setIsHit] = useState(false);
  const [isBossHit, setIsBossHit] = useState(false);

  // Queued Actions
  const [isDodgeQueued, setIsDodgeQueued] = useState(false);
  const [isDuckQueued, setIsDuckQueued] = useState(false);
  
  // Cut-In Logic
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

  // Initialize Farcaster SDK
  useEffect(() => {
    const load = async () => {
      try {
        setFarcasterUser(null);
        sdk.actions.ready(); 
        
        const context = await sdk.context;
        if (context?.user) {
          setFarcasterUser({
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl
          });
        }
      } catch (error) {
        console.warn("Farcaster SDK load warning:", error);
      }
    };
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Wallet Connection Logic
  const connectWallet = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error("User denied account access or error", error);
      }
    } else {
      alert("MetaMask is not installed. Please install it to connect.");
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
  };

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
    
    // Load global rankings
    loadRankings();
  }, []);

  const loadRankings = async () => {
    const ranking = await fetchGlobalRanking();
    setGlobalRanking(ranking);
    const totals = await fetchTotalRanking();
    setTotalRanking(totals);
  };

  const triggerComicCutIn = (clickX?: number, clickY?: number) => {
    const comicWords = ["WHOOSH!", "SWISH!", "NICE!", "WOW!", "ZOOM!", "YEAH!", "DODGE!"];
    const word = comicWords[Math.floor(Math.random() * comicWords.length)];
    
    const width = window.innerWidth;
    const height = window.innerHeight;

    let x = width * 0.8;
    let y = height * 0.5;

    if (clickX !== undefined && clickY !== undefined) {
      const isLeft = clickX < width / 2;
      x = isLeft ? width * 0.2 : width * 0.8;
      y = clickY;
    } else {
      x = Math.random() > 0.5 ? width * 0.2 : width * 0.8;
      y = height * 0.4 + Math.random() * (height * 0.2);
    }

    y = Math.max(height * 0.2, Math.min(y, height * 0.8));

    setDodgeCutIn({ id: Date.now(), text: word, x, y });

    if (cutInTimeoutRef.current) clearTimeout(cutInTimeoutRef.current);
    cutInTimeoutRef.current = window.setTimeout(() => {
      setDodgeCutIn(null);
    }, 500); 
  };

  const startGame = () => {
    setGameState(GameState.RUNNING);
    setScore(0);
    setDistance(0);
    setLives(3);
    setCombo(0);
    setSpeed(2.0); 
    setLastGameDate(null);
    
    setBossType(BossType.GORILLA);
    setBossLevel(1);
    setBossHits(0);
    setIsBossDefeated(false);

    setHazardActive(false);
    hazardActiveRef.current = false;
    setObstacleProgress(0);
    setIsDodgeQueued(false);
    
    setProjectileActive(false);
    projectileActiveRef.current = false;
    setProjectileProgress(0);
    setIsDuckQueued(false);
    
    setIsHit(false);
    setIsBossHit(false);
    setDodgeCutIn(null);
    
    timeSinceLastObstacle.current = 0;
    nextObstacleTime.current = 1.5 + Math.random() * 2;

    timeSinceLastProjectile.current = 0;
    nextProjectileTime.current = 5 + Math.random() * 5;
  };

  const shareScore = () => {
    const text = `I scored ${score} pts and ran ${Math.floor(distance)}m in Running Chihuahua AI! 🐕💨\n\nCan you beat the bosses?`;
    // Updated to the specified Coreserver URL
    const url = 'https://runningchihuahuaai.k0j1.v2002.coreserver.jp/';
    const intentUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(url)}`;
    
    try {
        sdk.actions.openUrl(intentUrl);
    } catch (e) {
        window.open(intentUrl, '_blank');
    }
  };

  const handleGameOver = async () => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const isoDate = now.toISOString();

    const newEntry: ScoreEntry = {
      date: isoDate,
      formattedDate: formattedDate,
      score: score,
      distance: Math.floor(distance),
      farcasterUser: farcasterUser ? {
        fid: 0, // Not available in context directly without auth
        username: farcasterUser.username || '',
        displayName: farcasterUser.displayName || '',
        pfpUrl: farcasterUser.pfpUrl || ''
      } : undefined,
      walletAddress: walletAddress || undefined
    };
    
    setLastGameDate(isoDate); 
    
    // Save locally
    const newHistory = [newEntry, ...history].slice(0, 100); 
    setHistory(newHistory);
    localStorage.setItem('chihuahua_history', JSON.stringify(newHistory));

    // Save to server (Fire and forget, but reload ranking after)
    saveScoreToSupabase(newEntry).then(() => {
       loadRankings();
    });

    setGameState(GameState.CAUGHT_ANIMATION);
    setTimeout(() => {
        setGameState(GameState.GAME_OVER);
    }, 3000);
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all game history?")) {
      setHistory([]);
      localStorage.removeItem('chihuahua_history');
    }
  };

  const handleBossDefeat = () => {
    setIsBossDefeated(true);
    setScore(prev => prev + 1000);
    
    setHazardActive(false);
    hazardActiveRef.current = false;
    setIsDodgeQueued(false);
    
    setProjectileActive(false);
    projectileActiveRef.current = false;
    setIsDuckQueued(false);

    setTimeout(() => {
      if (bossLevel >= 2) {
          if (bossType === BossType.GORILLA) setBossType(BossType.CHEETAH);
          else if (bossType === BossType.CHEETAH) setBossType(BossType.DRAGON);
          setBossLevel(1);
      } else {
          setBossLevel(prev => prev + 1);
      }
      setBossHits(0);
      setIsBossDefeated(false);
      timeSinceLastObstacle.current = 0;
      timeSinceLastProjectile.current = 0;
    }, 3000);
  };

  const getEventCoords = (e?: any) => {
    if (!e) return { x: undefined, y: undefined };
    if (e.clientX) return { x: e.clientX, y: e.clientY };
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: undefined, y: undefined };
  };

  const performDodge = () => {
    if (obstacleType === ObstacleType.SHEEP) {
      setDodgeType(DodgeType.JUMP);
    } else {
      const types = [DodgeType.JUMP, DodgeType.SIDESTEP, DodgeType.SPIN];
      setDodgeType(types[Math.floor(Math.random() * types.length)]);
    }

    isDodgedRef.current = true;
    setIsDodging(true);
    
    setCombo(prev => prev + 1);
    const bonus = (combo + 1) * 5;
    setScore(prev => prev + 10 + bonus);
    
    setTimeout(() => setIsDodging(false), 500);
  };

  const performDuck = () => {
    setDodgeType(DodgeType.SPIN);
    isDuckedRef.current = true;
    setIsDodging(true);
    setScore(prev => prev + 20); 
    setTimeout(() => setIsDodging(false), 500);
  };

  const handleDodge = (e?: any) => {
    if (gameState !== GameState.RUNNING) return;
    if (hazardActiveRef.current) {
       setIsDodgeQueued(true);
       const { x, y } = getEventCoords(e);
       triggerComicCutIn(x, y);
    }
    if (projectileActiveRef.current) {
       setIsDuckQueued(true);
       if (!hazardActiveRef.current) {
           const { x, y } = getEventCoords(e);
           triggerComicCutIn(x, y);
       }
    }
  };

  const handleDuck = (e?: any) => {
    if (gameState !== GameState.RUNNING) return;
    if (projectileActiveRef.current) {
       setIsDuckQueued(true);
       const { x, y } = getEventCoords(e);
       triggerComicCutIn(x, y);
    }
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
      if (Math.floor(newDist / 50) > Math.floor(prev / 50)) {
         setSpeed(s => Math.min(s + (0.2 * (2/3)), 5.0)); 
      }
      return newDist;
    }); 
    setScore(prev => prev + 1);
  };

  const handleObstacleTick = (delta: number) => {
    if (isBossDefeated) return;
    if (gameState === GameState.CAUGHT_ANIMATION) return;

    if (!hazardActiveRef.current) {
      if (!projectileActiveRef.current && !isThrowingRef.current) {
         timeSinceLastObstacle.current += delta;
         if (timeSinceLastObstacle.current > nextObstacleTime.current) {
            setHazardActive(true);
            hazardActiveRef.current = true;
            setIsDodgeQueued(false); 
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
      const approachSpeed = 0.5 * speed * delta; 
      const newProgress = obstacleProgress + approachSpeed;
      setObstacleProgress(newProgress);

      if (newProgress > 0.8 && isDodgeQueued && !isDodgedRef.current && !isHit) {
          performDodge();
      }

      if (newProgress >= 1) {
        if (!isDodgedRef.current && !isHit) {
          const newLives = lives - 1;
          setLives(newLives);
          setIsHit(true);
          setCombo(0); 
          setTimeout(() => setIsHit(false), 1500);
          if (newLives <= 0.2) handleGameOver();
        } 
      }

      if (newProgress >= 1) {
        if (isDodgedRef.current) {
           const bossZ = Math.min(16, Math.max(0, (lives / 3) * 16));
           const obstacleZ = -40 + (newProgress * 40);

           if (obstacleZ >= bossZ - 1.0) {
               setLives(prev => Math.min(3, prev + 0.2));
               setIsBossHit(true);
               setTimeout(() => setIsBossHit(false), 1000);
               const newHits = bossHits + 1;
               setBossHits(newHits);
               if (newHits >= 10) handleBossDefeat();

               setHazardActive(false);
               hazardActiveRef.current = false;
               setIsDodgeQueued(false);
               setObstacleProgress(0);
               return;
           }
        }
        if (newProgress > 1.6) {
           setHazardActive(false);
           hazardActiveRef.current = false;
           setIsDodgeQueued(false);
           setObstacleProgress(0);
        }
      }
    }
  };

  const handleProjectileTick = (delta: number) => {
    if (isBossDefeated) return;
    if (gameState === GameState.CAUGHT_ANIMATION) return;

    if (!projectileActiveRef.current) {
      if (!hazardActiveRef.current) {
         timeSinceLastProjectile.current += delta;
         if (timeSinceLastProjectile.current > nextProjectileTime.current) {
            isThrowingRef.current = true;
            setTimeout(() => {
                const currentBossZ = Math.min(16, Math.max(0, (lives / 3) * 16));
                setProjectileStartZ(currentBossZ);
                setProjectileActive(true);
                projectileActiveRef.current = true;
                setIsDuckQueued(false); 
                setProjectileProgress(0);
                isDuckedRef.current = false;
                isThrowingRef.current = false;
                
                let pType = ProjectileType.BARREL;
                const rand = Math.random();
                if (bossType === BossType.GORILLA) pType = rand > 0.5 ? ProjectileType.BARREL : ProjectileType.BANANA;
                else if (bossType === BossType.CHEETAH) pType = rand > 0.5 ? ProjectileType.BONE : ProjectileType.ROCK;
                else if (bossType === BossType.DRAGON) pType = ProjectileType.FIREBALL;
                setProjectileType(pType);
            }, 500);

            timeSinceLastProjectile.current = 0;
            nextProjectileTime.current = 4 + Math.random() * 4; 
         }
      }
    } else {
      const levelMultiplier = 5 + (bossLevel - 1) * 2;
      const flySpeed = (speed * delta * levelMultiplier) / Math.max(projectileStartZ, 1); 
      const newProgress = projectileProgress + flySpeed;
      setProjectileProgress(newProgress);

      if (newProgress > 0.85 && isDuckQueued && !isDuckedRef.current && !isHit) {
          performDuck();
      }

      if (newProgress >= 1) {
        if (!isDuckedRef.current && !isHit) {
           const newLives = lives - 1;
           setLives(newLives);
           setIsHit(true);
           setCombo(0);
           setTimeout(() => setIsHit(false), 1500);
           if (newLives <= 0.2) handleGameOver();
        }
        setProjectileActive(false);
        projectileActiveRef.current = false;
        setIsDuckQueued(false);
        setProjectileProgress(0);
      }
    }
  }

  // Reload ranking when showing ranking screen
  useEffect(() => {
    if (gameState === GameState.RANKING) {
        loadRankings();
    }
  }, [gameState]);

  return {
    gameState, setGameState,
    speed, setSpeed,
    dayTime, setDayTime,
    score, distance, lives, combo,
    history, globalRanking, totalRanking, lastGameDate, farcasterUser, walletAddress,
    bossType, bossLevel, bossHits, isBossDefeated,
    hazardActive, obstacleProgress, obstacleType, hazardPosition, setObstacleProgress,
    projectileActive, projectileProgress, projectileType, projectileStartZ, setProjectileProgress,
    isDodging, dodgeType, isHit, isBossHit,
    isDodgeQueued, isDuckQueued, dodgeCutIn,
    isThrowing: isThrowingRef.current,
    startGame, handleGameOver, clearHistory, handleBossDefeat,
    handleDodge, handleDuck,
    handleDistanceUpdate, handleObstacleTick, handleProjectileTick,
    connectWallet, disconnectWallet,
    shareScore
  };
};