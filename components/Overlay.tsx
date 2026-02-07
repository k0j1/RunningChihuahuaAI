
import React, { useMemo, useState } from 'react';
import { GameState, ScoreEntry, PlayerStats, ClaimResult, ItemType, UserInventory } from '../types';
import { TitleScreen } from './overlay/TitleScreen';
import { HistoryScreen } from './overlay/HistoryScreen';
import { RankingScreen } from './overlay/RankingScreen';
import { GameOverScreen } from './overlay/GameOverScreen';
import { GameHUD } from './overlay/GameHUD';
import { GameClearScreen } from './overlay/GameClearScreen';
import { AdminScreen } from './overlay/AdminScreen'; // Import AdminScreen
import { RankedEntry } from './overlay/RankingList';
import { UserInfoModal } from './overlay/UserInfoModal';
import { LoginBonusModal } from './overlay/LoginBonusModal';
import { ShopModal } from './overlay/ShopModal';
import { MaintenanceScreen } from './overlay/MaintenanceScreen';

interface OverlayProps {
  gameState: GameState;
  speed: number;
  dayTime: boolean;
  score: number;
  distance: number;
  lives: number;
  combo: number;
  hazardActive: boolean;
  showDodgeButton: boolean;
  hazardPosition: { top: string; left: string };
  projectileActive: boolean;
  showDuckButton: boolean;
  history: ScoreEntry[];
  globalRanking: ScoreEntry[];
  totalRanking?: PlayerStats[];
  lastGameDate: string | null;
  // Loading & Error states
  isLoadingHistory?: boolean;
  historyError?: string | null;
  isLoadingRanking?: boolean;
  rankingError?: string | null;
  
  isHit: boolean;
  dodgeCutIn: { id: number; text: string; x: number; y: number } | null;
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string; fid?: number } | null;
  walletAddress: string | null;
  isAdded?: boolean;
  notificationDetails?: { token: string; url: string } | null; 
  onAddMiniApp?: () => void;
  // Reward Props
  isClaiming: boolean;
  isRefreshing?: boolean;
  claimResult: ClaimResult | null;
  totalClaimed: number;
  handleClaimReward: (wallet: string | null, score: number) => void;
  // Stamina Props
  stamina: number;
  maxStamina: number;
  nextRecoveryTime: number | null;
  // Items & Inventory
  selectedItems: ItemType[];
  toggleItem: (item: ItemType) => void;
  inventory: UserInventory;
  // Shop & Bonus
  showLoginBonus: boolean;
  onOpenLoginBonus: () => void;
  onCloseLoginBonus: () => void;
  onClaimLoginBonus: (item: ItemType) => Promise<ClaimResult>;
  onBuyItems: (purchases: Record<string, number>, totalCHH: number) => Promise<ClaimResult>;
  loginBonusClaimed: boolean;
  pendingBonusItem: ItemType | null;
  setPendingBonusItem: (item: ItemType) => void;
  // Shield
  shield: number;
  hasUsedShield: boolean;
  onUseShield: () => void;
  // Audio Props
  isMuted: boolean;
  onToggleMute: () => void;
  // Blocked & Maintenance State
  isBlocked?: boolean;
  isMaintenanceTest?: boolean;
  onExitMaintenanceTest?: () => void;
  onTestMaintenance?: () => void;
  // Actions
  onStartGame: (isDemo?: boolean) => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onShare: () => void;
  onReturnToTitle: () => void;
  onHideHistory: () => void;
  onTogglePause: () => void;
  onDodge: (e: any) => void;
  onDuck: (e: any) => void;
  onSaveScore: () => Promise<void>;
  onShowAdmin: () => void; // Add Admin Handler
}

export const Overlay: React.FC<OverlayProps> = ({
  gameState,
  speed,
  dayTime,
  score,
  distance,
  lives,
  combo,
  hazardActive,
  showDodgeButton,
  hazardPosition,
  projectileActive,
  showDuckButton,
  history,
  globalRanking,
  totalRanking = [],
  lastGameDate,
  isLoadingHistory = false,
  historyError = null,
  isLoadingRanking = false,
  rankingError = null,
  isHit,
  dodgeCutIn,
  farcasterUser,
  walletAddress,
  isAdded,
  notificationDetails,
  onAddMiniApp,
  isClaiming,
  isRefreshing = false,
  claimResult,
  totalClaimed,
  handleClaimReward,
  stamina,
  maxStamina,
  nextRecoveryTime,
  selectedItems,
  toggleItem,
  inventory,
  showLoginBonus,
  onOpenLoginBonus,
  onCloseLoginBonus,
  onClaimLoginBonus,
  onBuyItems,
  loginBonusClaimed,
  pendingBonusItem,
  setPendingBonusItem,
  shield,
  hasUsedShield,
  onUseShield,
  isMuted,
  onToggleMute,
  isBlocked = false,
  isMaintenanceTest = false,
  onExitMaintenanceTest,
  onTestMaintenance,
  onStartGame,
  onShowHistory,
  onShowRanking,
  onHideHistory,
  onTogglePause,
  onDodge,
  onDuck,
  onReturnToTitle,
  onConnectWallet,
  onDisconnectWallet,
  onShare,
  onSaveScore,
  onShowAdmin,
}) => {
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [showShop, setShowShop] = useState(false);

  const localTopScores = useMemo(() => {
    return [...history].sort((a, b) => b.score - a.score);
  }, [history]);

  const isNewRecord = useMemo(() => {
    if (!lastGameDate || localTopScores.length === 0) return false;
    return localTopScores[0].date === lastGameDate;
  }, [localTopScores, lastGameDate]);

  const currentRunEntry = useMemo(() => {
    return history.find(entry => entry.date === lastGameDate);
  }, [history, lastGameDate]);

  const displayScore = (gameState === GameState.GAME_OVER && currentRunEntry) 
    ? currentRunEntry.score 
    : score;

  const displayGlobalRanking = useMemo(() => {
    return [...globalRanking].sort((a, b) => b.score - a.score);
  }, [globalRanking]);

  const userBestInfo = useMemo((): RankedEntry | null => {
    let key = null;
    if (farcasterUser && farcasterUser.username) {
      key = `fc:${farcasterUser.username}`;
    }
    if (!key) return null;
    const idx = displayGlobalRanking.findIndex(entry => {
      if (key?.startsWith('fc:') && entry.farcasterUser?.username) {
        return `fc:${entry.farcasterUser.username}` === key;
      }
      return false;
    });
    if (idx !== -1) return { entry: displayGlobalRanking[idx], rank: idx + 1 };
    return null;
  }, [displayGlobalRanking, farcasterUser]);

  return (
    <>
      {/* 1. Maintenance Screen Override (Real or Test) */}
      {(isBlocked || isMaintenanceTest) && (
        <MaintenanceScreen onBack={isMaintenanceTest ? onExitMaintenanceTest : undefined} />
      )}

      {/* 2. Modals */}
      {!isBlocked && !isMaintenanceTest && showUserInfo && (
        <UserInfoModal 
          farcasterUser={farcasterUser}
          walletAddress={walletAddress}
          isAdded={isAdded}
          notificationDetails={notificationDetails}
          onAddMiniApp={onAddMiniApp}
          onConnect={onConnectWallet}
          onDisconnect={onDisconnectWallet}
          onClose={() => setShowUserInfo(false)}
        />
      )}

      {!isBlocked && !isMaintenanceTest && showLoginBonus && (
        <LoginBonusModal 
          onClose={onCloseLoginBonus}
          onClaim={onClaimLoginBonus}
          walletAddress={walletAddress}
          pendingBonusItem={pendingBonusItem}
          onRegisterPending={setPendingBonusItem}
        />
      )}

      {!isBlocked && !isMaintenanceTest && showShop && (
        <ShopModal 
           onClose={() => setShowShop(false)}
           onBuy={onBuyItems}
           walletAddress={walletAddress}
           inventory={inventory}
        />
      )}

      {/* 3. Main Game State Views */}
      {!isBlocked && !isMaintenanceTest && (() => {
        if (gameState === GameState.ADMIN) {
           return <AdminScreen onBack={onReturnToTitle} onTestMaintenance={onTestMaintenance || (() => {})} />;
        }
        if (gameState === GameState.TITLE) {
          return (
            <TitleScreen
              farcasterUser={farcasterUser}
              walletAddress={walletAddress}
              isAdded={isAdded}
              onAddMiniApp={onAddMiniApp}
              onStartGame={onStartGame}
              onShowHistory={onShowHistory}
              onShowRanking={onShowRanking}
              onOpenShop={() => setShowShop(true)}
              onConnectWallet={onConnectWallet}
              onShowProfile={() => setShowUserInfo(true)}
              stamina={stamina}
              maxStamina={maxStamina}
              nextRecoveryTime={nextRecoveryTime}
              selectedItems={selectedItems}
              toggleItem={toggleItem}
              inventory={inventory}
              onOpenLoginBonus={onOpenLoginBonus}
              loginBonusClaimed={loginBonusClaimed}
              isMuted={isMuted}
              onToggleMute={onToggleMute}
              onShowAdmin={onShowAdmin}
            />
          );
        }
        if (gameState === GameState.HISTORY) {
          return (
            <HistoryScreen 
                history={history} 
                onHideHistory={onHideHistory} 
                isLoading={isLoadingHistory}
                error={historyError}
            />
          );
        }
        if (gameState === GameState.RANKING) {
          return (
            <RankingScreen 
                topScores={displayGlobalRanking} 
                totalStats={totalRanking} 
                onHideHistory={onHideHistory} 
                isLoading={isLoadingRanking}
                error={rankingError}
            />
          );
        }
        if (gameState === GameState.GAME_CLEAR) {
            return <GameClearScreen score={score} />;
        }
        if (gameState === GameState.GAME_OVER) {
          return (
            <GameOverScreen
              score={displayScore}
              lives={lives}
              ranking={displayGlobalRanking}
              totalRanking={totalRanking}
              userBestEntry={userBestInfo}
              recentHistory={history.slice(0, 5)}
              isNewRecord={isNewRecord}
              lastGameDate={lastGameDate}
              farcasterUser={farcasterUser}
              walletAddress={walletAddress}
              isAdded={isAdded}
              onAddMiniApp={onAddMiniApp}
              isClaiming={isClaiming}
              isRefreshing={isRefreshing}
              claimResult={claimResult}
              totalClaimed={totalClaimed}
              handleClaimReward={handleClaimReward}
              stamina={stamina}
              maxStamina={maxStamina}
              onStartGame={onStartGame}
              onReturnToTitle={onReturnToTitle}
              onConnectWallet={onConnectWallet}
              onDisconnectWallet={onDisconnectWallet}
              onShowProfile={() => setShowUserInfo(true)}
              onShare={onShare}
              onSaveScore={onSaveScore}
            />
          );
        }
        return (
          <GameHUD
            distance={distance}
            score={score}
            lives={lives}
            shield={shield}
            isHit={isHit}
            gameState={gameState}
            onTogglePause={onTogglePause}
            combo={combo}
            speed={speed}
            dodgeCutIn={dodgeCutIn}
            showDodgeButton={showDodgeButton}
            hazardPosition={hazardPosition}
            onDodge={onDodge}
            showDuckButton={showDuckButton}
            onDuck={onDuck}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            hasUsedShield={hasUsedShield}
            onUseShield={onUseShield}
            shieldInventoryCount={inventory[ItemType.SHIELD] || 0}
          />
        );
      })()}
    </>
  );
};
