
import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Overlay } from './components/Overlay';
import { GameScene } from './components/GameScene';
import { AudioManager } from './components/AudioManager';
import { useGameLogic } from './hooks/useGameLogic';
import { GameState } from './types';

const App: React.FC = () => {
  const gameLogic = useGameLogic();
  const {
    gameState, speed, dayTime, score, distance, lives, combo,
    hazardActive, hazardPosition, projectileActive, 
    isDodgeQueued, obstacleProgressRef, isDuckQueued, projectileProgressRef, projectileStartZ, bossLevel,
    history, globalRanking, totalRanking, lastGameDate, isHit, dodgeCutIn, farcasterUser, walletAddress,
    isAdded, notificationDetails, addMiniApp,
    isClaiming, claimResult, totalClaimed, handleClaimReward,
    staminaSystem, inventorySystem,
    selectedItems, toggleItem, clearSelectedItems,
    showLoginBonus, openLoginBonus, closeLoginBonus, handleClaimLoginBonus,
    pendingBonusItem, setPendingBonusItem,
    shield, hasUsedShield, handleUseShield,
    isMuted, toggleMute, isBossHit, isCelebrating,
    startGame, setGameState, handleDodge, handleDuck,
    connectWallet, disconnectWallet, shareScore, saveCurrentScore
  } = gameLogic;

  const levelMultiplier = 5 + (bossLevel - 1) * 2;
  const projectileVelocity = speed * levelMultiplier;
  const projectileTotalTime = Math.max(projectileStartZ, 1) / projectileVelocity;
  const projectileTimeRemaining = (1 - projectileProgressRef.current) * projectileTotalTime;
  const showDuckButton = projectileActive && (projectileTimeRemaining <= 1.0) && !isDuckQueued && projectileProgressRef.current < 0.85;
  const showDodgeButton = hazardActive && !isDodgeQueued && obstacleProgressRef.current < 0.8;

  const handleReturnToTitle = () => {
    clearSelectedItems();
    setGameState(GameState.TITLE);
  };

  return (
    <div className="w-full h-[100dvh] relative bg-gray-900 overflow-hidden">
      <AudioManager gameState={gameState} isMuted={isMuted} combo={combo} isBossHit={isBossHit} isCelebrating={isCelebrating} />
      <div className="absolute inset-0 z-0">
        <Canvas shadows camera={{ position: [3, 3, -5], fov: 60 }} dpr={[1, 1.5]}>
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
        isAdded={isAdded}
        notificationDetails={notificationDetails}
        onAddMiniApp={addMiniApp}
        isClaiming={isClaiming}
        claimResult={claimResult}
        totalClaimed={totalClaimed}
        handleClaimReward={handleClaimReward}
        stamina={staminaSystem.stamina}
        maxStamina={staminaSystem.maxStamina}
        nextRecoveryTime={staminaSystem.nextRecoveryTime}
        selectedItems={selectedItems}
        toggleItem={toggleItem}
        inventory={inventorySystem.inventory}
        showLoginBonus={showLoginBonus}
        onOpenLoginBonus={openLoginBonus}
        onCloseLoginBonus={closeLoginBonus}
        onClaimLoginBonus={handleClaimLoginBonus}
        onBuyItems={inventorySystem.buyItems}
        loginBonusClaimed={inventorySystem.loginBonusClaimed}
        pendingBonusItem={pendingBonusItem}
        setPendingBonusItem={setPendingBonusItem}
        shield={shield}
        hasUsedShield={hasUsedShield}
        onUseShield={handleUseShield}
        isMuted={isMuted}
        onToggleMute={toggleMute}
        onStartGame={startGame}
        onShowHistory={() => setGameState(GameState.HISTORY)}
        onShowRanking={() => setGameState(GameState.RANKING)}
        onHideHistory={() => setGameState(GameState.TITLE)}
        onTogglePause={() => setGameState(gameState === GameState.RUNNING ? GameState.PAUSED : GameState.RUNNING)}
        onDodge={handleDodge}
        onDuck={handleDuck}
        onReturnToTitle={handleReturnToTitle}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
        onShare={shareScore}
        onSaveScore={saveCurrentScore}
      />
    </div>
  );
};

export default App;
