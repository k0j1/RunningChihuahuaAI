
import React, { useMemo } from 'react';
import { GameState, ScoreEntry } from '../types';
import { TitleScreen } from './overlay/TitleScreen';
import { HistoryScreen } from './overlay/HistoryScreen';
import { RankingScreen } from './overlay/RankingScreen';
import { GameOverScreen } from './overlay/GameOverScreen';
import { GameHUD } from './overlay/GameHUD';

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
  lastGameDate: string | null;
  isHit: boolean;
  dodgeCutIn: { id: number; text: string; x: number; y: number } | null;
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
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
}) => {
  // Memoize sorted top scores
  const topScores = useMemo(() => {
    const uniqueMap = new Map<string, ScoreEntry>();
    const anonymousEntries: ScoreEntry[] = [];

    history.forEach((entry) => {
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
    // Only sort and return unique users (plus anonymous if needed, but usually ranking shows best users)
    // If we want a global ranking of unique users, we combine them. 
    // Anonymous entries might be the same user playing multiple times, so maybe exclude them or limit them?
    // For now, let's include anonymous entries but they won't be deduplicated against each other.
    const allEntries = [...uniqueEntries, ...anonymousEntries];
    return allEntries.sort((a, b) => b.score - a.score);
  }, [history]);

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
        onDisconnectWallet={onDisconnectWallet}
      />
    );
  }

  // History Screen
  if (gameState === GameState.HISTORY) {
    return <HistoryScreen history={history} onClearHistory={onClearHistory} onHideHistory={onHideHistory} />;
  }

  // Ranking Screen
  if (gameState === GameState.RANKING) {
    return <RankingScreen topScores={topScores} onHideHistory={onHideHistory} />;
  }

  // Game Over Screen
  if (gameState === GameState.GAME_OVER) {
    return (
      <GameOverScreen
        score={score}
        topScores={topScores}
        lastGameDate={lastGameDate}
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onStartGame={onStartGame}
        onReturnToTitle={onReturnToTitle}
        onConnectWallet={onConnectWallet}
        onDisconnectWallet={onDisconnectWallet}
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
};