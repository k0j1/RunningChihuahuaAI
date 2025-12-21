import React, { useMemo, useState } from 'react';
import { GameState, ScoreEntry, PlayerStats, ClaimResult } from '../types';
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
  // Reward Props
  isClaiming: boolean;
  isRefreshing?: boolean;
  claimResult: ClaimResult | null;
  totalClaimed: number;
  handleClaimReward: (wallet: string | null, score: number) => void;
  // Actions
  onStartGame: (isDemo?: boolean) => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  // onShowProfile Removed as it is handled internally
  onShare: () => void;
  onReturnToTitle: () => void;
  onClearHistory: () => void;
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
  isClaiming,
  isRefreshing = false,
  claimResult,
  totalClaimed,
  handleClaimReward,
  onStartGame,
  onShowHistory,
  onShowRanking,
  onHideHistory,
  onTogglePause,
  onDodge,
  onDuck,
  onReturnToTitle,
  onClearHistory,
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

  const uniqueGlobalRanking = useMemo(() => {
    const uniqueMap = new Map<string, ScoreEntry>();
    const anonymousEntries: ScoreEntry[] = [];

    globalRanking.forEach((entry) => {
      let key = null;
      if (entry.farcasterUser && entry.farcasterUser.username) {
        key = `fc:${entry.farcasterUser.username}`;
      } else if (entry.walletAddress) {
        key = `wa:${entry.walletAddress}`;
      }

      if (key) {
        const existing = uniqueMap.get(key);
        if (!existing || entry.score > existing.score) {
          uniqueMap.set(key, entry);
        }
      } else {
        anonymousEntries.push(entry); 
      }
    });

    const uniqueEntries = Array.from(uniqueMap.values());
    const allEntries = [...uniqueEntries, ...anonymousEntries];
    return allEntries.sort((a, b) => b.score - a.score);
  }, [globalRanking]);

  const userBestInfo = useMemo((): RankedEntry | null => {
    let key = null;
    if (farcasterUser && farcasterUser.username) {
      key = `fc:${farcasterUser.username}`;
    } else if (walletAddress) {
      key = `wa:${walletAddress}`;
    }
    if (!key) return null;
    const idx = uniqueGlobalRanking.findIndex(entry => {
      if (key?.startsWith('fc:') && entry.farcasterUser?.username) {
        return `fc:${entry.farcasterUser.username}` === key;
      }
      if (key?.startsWith('wa:') && entry.walletAddress) {
        return `wa:${entry.walletAddress}` === key;
      }
      return false;
    });
    if (idx !== -1) {
      return {
        entry: uniqueGlobalRanking[idx],
        rank: idx + 1
      };
    }
    return null;
  }, [uniqueGlobalRanking, farcasterUser, walletAddress]);

  const handleShowProfile = () => setShowUserInfo(true);
  const handleCloseProfile = () => setShowUserInfo(false);

  return (
    <>
      {showUserInfo && (
        <UserInfoModal 
          farcasterUser={farcasterUser}
          walletAddress={walletAddress}
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
              onStartGame={onStartGame}
              onShowHistory={onShowHistory}
              onShowRanking={onShowRanking}
              onConnectWallet={onConnectWallet}
              onShowProfile={handleShowProfile}
            />
          );
        }
        if (gameState === GameState.HISTORY) {
          return <HistoryScreen history={history} onClearHistory={onClearHistory} onHideHistory={onHideHistory} />;
        }
        if (gameState === GameState.RANKING) {
          return <RankingScreen topScores={uniqueGlobalRanking} totalStats={totalRanking} onHideHistory={onHideHistory} />;
        }
        if (gameState === GameState.GAME_CLEAR) {
            return <GameClearScreen score={score} />;
        }
        if (gameState === GameState.GAME_OVER) {
          return (
            <GameOverScreen
              score={displayScore}
              lives={lives}
              ranking={uniqueGlobalRanking}
              totalRanking={totalRanking}
              userBestEntry={userBestInfo}
              recentHistory={history.slice(0, 5)}
              isNewRecord={isNewRecord}
              lastGameDate={lastGameDate}
              farcasterUser={farcasterUser}
              walletAddress={walletAddress}
              isClaiming={isClaiming}
              isRefreshing={isRefreshing}
              claimResult={claimResult}
              totalClaimed={totalClaimed}
              handleClaimReward={handleClaimReward}
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
          />
        );
      })()}
    </>
  );
};