
import React, { useMemo, useState } from 'react';
import { GameState, ScoreEntry, PlayerStats } from '../types';
import { TitleScreen } from './overlay/TitleScreen';
import { HistoryScreen } from './overlay/HistoryScreen';
import { RankingScreen } from './overlay/RankingScreen';
import { GameOverScreen } from './overlay/GameOverScreen';
import { GameHUD } from './overlay/GameHUD';
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
  onStartGame: () => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onHideHistory: () => void;
  onTogglePause: () => void;
  onDodge: (e: any) => void;
  onDuck: (e: any) => void;
  onReturnToTitle: () => void;
  onClearHistory: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onShare: () => void;
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
}) => {
  const [showUserInfo, setShowUserInfo] = useState(false);

  // Memoize top scores from LOCAL history for comparison
  const localTopScores = useMemo(() => {
    return [...history].sort((a, b) => b.score - a.score);
  }, [history]);

  // Determine if the current run is a new local record
  const isNewRecord = useMemo(() => {
    if (!lastGameDate || localTopScores.length === 0) return false;
    // Since localTopScores includes the current run, if index 0 matches current date, it's the best.
    return localTopScores[0].date === lastGameDate;
  }, [localTopScores, lastGameDate]);

  // Find the recorded score for the current game to ensure consistency
  // This prevents the "Your Score" display from differing from the history log
  const currentRunEntry = useMemo(() => {
    return history.find(entry => entry.date === lastGameDate);
  }, [history, lastGameDate]);

  // Use the recorded score for Game Over display, fallback to state score if not found
  const displayScore = (gameState === GameState.GAME_OVER && currentRunEntry) 
    ? currentRunEntry.score 
    : score;

  // Process GLOBAL ranking for deduplication and sorting
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

  // Identify current user's best entry in the global ranking
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

  // User Info Modal Control
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

      {/* Screens */}
      {(() => {
        // Title Screen
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

        // History Screen
        if (gameState === GameState.HISTORY) {
          return <HistoryScreen history={history} onClearHistory={onClearHistory} onHideHistory={onHideHistory} />;
        }

        // Ranking Screen
        if (gameState === GameState.RANKING) {
          return <RankingScreen topScores={uniqueGlobalRanking} totalStats={totalRanking} onHideHistory={onHideHistory} />;
        }

        // Game Over Screen
        if (gameState === GameState.GAME_OVER) {
          return (
            <GameOverScreen
              score={displayScore}
              ranking={uniqueGlobalRanking}
              totalRanking={totalRanking}
              userBestEntry={userBestInfo}
              recentHistory={history.slice(0, 5)}
              isNewRecord={isNewRecord}
              lastGameDate={lastGameDate}
              farcasterUser={farcasterUser}
              walletAddress={walletAddress}
              onStartGame={onStartGame}
              onReturnToTitle={onReturnToTitle}
              onConnectWallet={onConnectWallet}
              onDisconnectWallet={onDisconnectWallet}
              onShowProfile={handleShowProfile}
              onShare={onShare}
            />
          );
        }

        // HUD & Gameplay Overlay
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
