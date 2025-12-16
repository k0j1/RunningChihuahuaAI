
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Overlay } from './components/Overlay';
import { GameScene } from './components/GameScene';
import { useGameLogic } from './hooks/useGameLogic';
import { GameState } from './types';

const App: React.FC = () => {
  const gameLogic = useGameLogic();
  const {
    gameState, speed, dayTime, score, distance, lives, combo,
    hazardActive, hazardPosition, projectileActive, 
    isDodgeQueued, obstacleProgressRef, isDuckQueued, projectileProgressRef, projectileStartZ, bossLevel,
    history, globalRanking, totalRanking, lastGameDate, isHit, dodgeCutIn, farcasterUser, walletAddress,
    startGame, setGameState, handleDodge, handleDuck, clearHistory,
    connectWallet, disconnectWallet, shareScore
  } = gameLogic;

  // UI Button Visibility Logic (Using Ref.current for logic check is tricky inside render if it updates 60fps)
  // But for button visibility, we can rely on standard state triggers or accept slight delay.
  // Actually, we should probably check Ref here, but since this component renders on distance update (integer), it's close enough.
  
  const levelMultiplier = 5 + (bossLevel - 1) * 2;
  const projectileVelocity = speed * levelMultiplier;
  const projectileTotalTime = Math.max(projectileStartZ, 1) / projectileVelocity;
  // Use ref current value for momentary calculation
  const projectileTimeRemaining = (1 - projectileProgressRef.current) * projectileTotalTime;
  
  const showDuckButton = projectileActive && (projectileTimeRemaining <= 1.0) && !isDuckQueued && projectileProgressRef.current < 0.85;
  const showDodgeButton = hazardActive && !isDodgeQueued && obstacleProgressRef.current < 0.8;

  const handleTogglePause = () => {
    if (gameState === GameState.RUNNING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.RUNNING);
  };

  return (
    <div className="w-full h-[100dvh] relative bg-gray-900 overflow-hidden">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          shadows 
          camera={{ position: [3, 3, -5], fov: 60 }}
          dpr={[1, 1.5]} // Limit pixel ratio to save GPU
        >
          <GameScene gameLogic={gameLogic} />
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
        hazardActive={hazardActive} 
        showDodgeButton={showDodgeButton} 
        hazardPosition={hazardPosition}
        projectileActive={projectileActive}
        showDuckButton={showDuckButton}
        history={history}
        globalRanking={globalRanking}
        totalRanking={totalRanking}
        lastGameDate={lastGameDate}
        isHit={isHit}
        dodgeCutIn={dodgeCutIn}
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onStartGame={startGame}
        onShowHistory={() => setGameState(GameState.HISTORY)}
        onShowRanking={() => setGameState(GameState.RANKING)}
        onHideHistory={() => setGameState(GameState.TITLE)}
        onTogglePause={handleTogglePause}
        onDodge={handleDodge}
        onDuck={handleDuck}
        onReturnToTitle={() => setGameState(GameState.TITLE)}
        onClearHistory={clearHistory}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        onShare={shareScore}
      />
    </div>
  );
};

export default App;
