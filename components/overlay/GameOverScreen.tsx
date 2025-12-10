
import React from 'react';
import { Skull, Trophy, RotateCcw, Home } from 'lucide-react';
import { ScoreEntry } from '../../types';
import { WalletWidget } from './WalletWidget';

interface GameOverScreenProps {
  score: number;
  topScores: ScoreEntry[];
  lastGameDate: string | null;
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
  walletAddress: string | null;
  onStartGame: () => void;
  onReturnToTitle: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  topScores,
  lastGameDate,
  farcasterUser,
  walletAddress,
  onStartGame,
  onReturnToTitle,
  onConnectWallet,
  onDisconnectWallet,
}) => {
  const top5 = topScores.slice(0, 5);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start md:justify-center bg-red-900/80 backdrop-blur-md z-50 p-4 pt-12 md:pt-4 overflow-y-auto">
      {/* Wallet Widget (Top Right) */}
      <WalletWidget
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onConnect={onConnectWallet}
        onDisconnect={onDisconnectWallet}
      />

      <div className="w-full max-w-lg bg-white/10 rounded-3xl p-6 shadow-2xl border-4 border-red-500 text-center animate-bounce-in my-8 relative flex-shrink-0 backdrop-blur-sm">
        <Skull className="w-16 h-16 mx-auto text-red-500 mb-2 filter drop-shadow-lg" />
        <h2 className="text-5xl font-black text-white mb-6 tracking-tighter shadow-black drop-shadow-md">CAUGHT!</h2>

        <div className="bg-white/90 rounded-xl p-4 border-2 border-yellow-500 mb-6 shadow-xl text-left">
          <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
            <span className="text-gray-500 font-bold uppercase text-xs">Score</span>
            <span className="text-4xl font-black text-blue-600">{score}</span>
          </div>

          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
            <Trophy size={14} className="text-yellow-600" /> Top Scores
          </h3>
          <ul className="space-y-1">
            {top5.map((entry, idx) => {
              const isCurrent = entry.date === lastGameDate;
              return (
                <li
                  key={idx}
                  className={`flex justify-between items-center text-xs p-2 rounded ${
                    isCurrent ? 'bg-yellow-200 font-bold border border-yellow-400' : 'bg-gray-50'
                  }`}
                >
                  <span className="w-4">{idx + 1}.</span>
                  <span className="flex-1 text-left pl-2 flex items-center gap-1">
                    {entry.farcasterUser?.pfpUrl ? (
                      <img src={entry.farcasterUser.pfpUrl} className="w-4 h-4 rounded-full" alt="pfp" />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-[8px]">
                        ?
                      </div>
                    )}
                    <span className="truncate max-w-[120px]">
                      {entry.farcasterUser?.username || entry.formattedDate.split(' ')[0]}
                    </span>
                  </span>
                  <span className={isCurrent ? 'text-red-600' : 'text-blue-600'}>{entry.score}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onStartGame}
            className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 duration-200"
          >
            <RotateCcw /> TRY AGAIN
          </button>
          <button
            onClick={onReturnToTitle}
            className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold text-lg shadow hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <Home /> TITLE
          </button>
        </div>
      </div>
    </div>
  );
};
