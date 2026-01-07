
import React, { useMemo, useState } from 'react';
import { GameState, ScoreEntry, PlayerStats, ClaimResult, ItemType, UserInventory } from '../types';
import { TitleScreen } from './overlay/TitleScreen';
import { HistoryScreen } from './overlay/HistoryScreen';
import { RankingScreen } from './overlay/RankingScreen';
import { GameOverScreen } from './overlay/GameOverScreen';
import { GameHUD } from './overlay/GameHUD';
import { GameClearScreen } from './overlay/GameClearScreen';
import { RankedEntry } from './overlay/RankingList';
import { UserInfoModal } from './overlay/UserInfoModal';

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
  // Shield
  shield: number;
  hasUsedShield: boolean;
  onUseShield: () => void;
  // Audio Props
  isMuted: boolean;
  onToggleMute: () => void;
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
  shield,
  hasUsedShield,
  onUseShield,
  isMuted,
  onToggleMute,
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
}) => {
  const [showUserInfo, setShowUserInfo] = useState(false);

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
    
    // walletAddress fallback removed per request

    if (!key) return null;
    const idx = displayGlobalRanking.findIndex(entry => {
      if (key?.startsWith('fc:') && entry.farcasterUser?.username) {
        return `fc:${entry.farcasterUser.username}` === key;
      }
      return false;
    });
    if (idx !== -1) {
      return {
        entry: displayGlobalRanking[idx],
        rank: idx + 1
      };
    }
    return null;
  }, [displayGlobalRanking, farcasterUser]);

  const handleShowProfile = () => setShowUserInfo(true);
  const handleCloseProfile = () => setShowUserInfo(false);

  return (
    <>
      {showUserInfo && (
        <UserInfoModal 
          farcasterUser={farcasterUser}
          walletAddress={walletAddress}
          isAdded={isAdded}
          notificationDetails={notificationDetails}
          onAddMiniApp={onAddMiniApp}
          onConnect={onConnectWallet}
          onDisconnect={onDisconnectWallet}
          onClose={handleCloseProfile}
        />
      )}

      {(() => {
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
              onConnectWallet={onConnectWallet}
              onShowProfile={handleShowProfile}
              stamina={stamina}
              maxStamina={maxStamina}
              nextRecoveryTime={nextRecoveryTime}
              selectedItems={selectedItems}
              toggleItem={toggleItem}
              inventory={inventory}
              isMuted={isMuted}
              onToggleMute={onToggleMute}
            />
          );
        }
        if (gameState === GameState.HISTORY) {
          return <HistoryScreen history={history} onHideHistory={onHideHistory} />;
        }
        if (gameState === GameState.RANKING) {
          return <RankingScreen topScores={displayGlobalRanking} totalStats={totalRanking} onHideHistory={onHideHistory} />;
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
              onShowProfile={handleShowProfile}
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
