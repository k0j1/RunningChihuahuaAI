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
    isClaiming, claimResult, totalClaimed, handleClaimReward, // Reward Props
    staminaSystem, // Stamina Props
    startGame, setGameState, handleDodge, handleDuck,
    connectWallet, disconnectWallet, shareScore, saveCurrentScore
  } = gameLogic;

  const levelMultiplier = 5 + (bossLevel - 1) * 2;
  const projectileVelocity = speed * levelMultiplier;
  const projectileTotalTime = Math.max(projectileStartZ, 1) / projectileVelocity;
  const projectileTimeRemaining = (1 - projectileProgressRef.current) * projectileTotalTime;
  
  const showDuckButton = projectileActive && (projectileTimeRemaining <= 1.0) && !isDuckQueued && projectileProgressRef.current < 0.85;
  const showDodgeButton = hazardActive && !isDodgeQueued && obstacleProgressRef.current < 0.8;

  const handleTogglePause = () => {
    if (gameState === GameState.RUNNING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.RUNNING);
  };

  return (
    <div className="w-full h-[100dvh] relative bg-gray-900 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Canvas 
          shadows 
          camera={{ position: [3, 3, -5], fov: 60 }}
          dpr={[1, 1.5]}
        >
          <GameScene gameLogic={gameLogic} />
        </Canvas>
      </div>

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
        isClaiming={isClaiming}
        claimResult={claimResult}
        totalClaimed={totalClaimed}
        handleClaimReward={handleClaimReward}
        stamina={staminaSystem.stamina}
        maxStamina={staminaSystem.maxStamina}
        nextRecoveryTime={staminaSystem.nextRecoveryTime}
        onStartGame={startGame}
        onShowHistory={() => setGameState(GameState.HISTORY)}
        onShowRanking={() => setGameState(GameState.RANKING)}
        onHideHistory={() => setGameState(GameState.TITLE)}
        onTogglePause={handleTogglePause}
        onDodge={handleDodge}
        onDuck={handleDuck}
        onReturnToTitle={() => setGameState(GameState.TITLE)}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        onShare={shareScore}
        onSaveScore={saveCurrentScore}
      />
    </div>
  );
};

export default App;