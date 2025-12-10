
import React from 'react';
import { Skull, RotateCcw, Home, Crown, Globe, Clock, Star } from 'lucide-react';
import { ScoreEntry } from '../../types';
import { WalletWidget } from './WalletWidget';
import { RankingList, RankedEntry } from './RankingList';

interface GameOverScreenProps {
  score: number;
  ranking: ScoreEntry[];
  userBestEntry: RankedEntry | null;
  recentHistory: ScoreEntry[];
  isNewRecord: boolean;
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
  ranking,
  userBestEntry,
  recentHistory,
  isNewRecord,
  lastGameDate,
  farcasterUser,
  walletAddress,
  onStartGame,
  onReturnToTitle,
  onConnectWallet,
  onDisconnectWallet,
}) => {
  // Top 10 for Global Ranking display
  const top10 = ranking.slice(0, 10).map((entry, index) => ({
    entry,
    rank: index + 1
  }));

  // Check if current run is inside Top 10
  const isRankIn = top10.some(item => item.entry.date === lastGameDate);

  // Map Recent History for display (Rank is just index+1 visually, or we can hide it)
  const historyItems = recentHistory.map((entry, index) => ({
    entry,
    rank: index + 1
  }));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-start bg-red-900/90 backdrop-blur-md z-50 p-4 pt-12 overflow-y-auto">
      {/* Wallet Widget */}
      <WalletWidget
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onConnect={onConnectWallet}
        onDisconnect={onDisconnectWallet}
      />

      <div className="w-full max-w-lg bg-white/95 rounded-3xl p-4 md:p-6 shadow-2xl border-4 border-red-500 text-center animate-bounce-in my-8 relative flex-shrink-0 backdrop-blur-sm">
        
        {/* Header Section */}
        {isNewRecord ? (
          <div className="mb-4">
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 animate-pulse drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
              NEW RECORD!!
            </h2>
            <Crown className="w-12 h-12 mx-auto text-yellow-400 animate-bounce mt-2 filter drop-shadow-lg" />
          </div>
        ) : (
          <div className="mb-4">
            <Skull className="w-12 h-12 mx-auto text-red-500 mb-1 filter drop-shadow-lg" />
            <h2 className="text-4xl font-black text-gray-800 tracking-tighter shadow-black drop-shadow-sm">GAME OVER</h2>
          </div>
        )}

        {/* Current Score */}
        <div className="bg-gray-900 rounded-xl p-3 border-2 border-yellow-500 mb-4 shadow-xl text-center relative overflow-hidden">
           {isRankIn && (
             <div className="absolute top-0 right-0 bg-yellow-500 text-red-900 text-xs font-black px-2 py-1 animate-pulse">
               RANK IN!
             </div>
           )}
           <span className="text-gray-400 font-bold uppercase text-[10px] block mb-1">Your Score</span>
           <span className={`text-4xl font-black font-mono ${isNewRecord ? 'text-yellow-400' : 'text-white'}`}>
              {score}
           </span>
        </div>

        <div className="space-y-4">
          
          {/* Section 1: Self Best */}
          {userBestEntry && (
            <div className="bg-blue-50/80 rounded-xl p-3 border border-blue-200">
               <div className="flex items-center gap-2 mb-2">
                 <Star size={16} className="text-blue-500 fill-blue-500" />
                 <h3 className="text-xs font-bold text-blue-700 uppercase">Your Personal Best</h3>
               </div>
               <RankingList 
                 items={[userBestEntry]} 
                 highlightDate={lastGameDate} 
                 showHeader={true}
                 showRank={true}
               />
            </div>
          )}

          {/* Section 2: Global Top 10 */}
          <div className="bg-yellow-50/80 rounded-xl p-3 border border-yellow-200">
             <div className="flex items-center gap-2 mb-2">
               <Globe size={16} className="text-yellow-600" />
               <h3 className="text-xs font-bold text-yellow-700 uppercase">Global Top 10</h3>
             </div>
             <RankingList 
                items={top10} 
                highlightDate={lastGameDate} 
                showHeader={true} 
              />
          </div>

          {/* Section 3: Recent History */}
          <div className="bg-gray-50/80 rounded-xl p-3 border border-gray-200">
             <div className="flex items-center gap-2 mb-2">
               <Clock size={16} className="text-gray-500" />
               <h3 className="text-xs font-bold text-gray-600 uppercase">Recent History (Last 5)</h3>
             </div>
             <RankingList 
               items={historyItems} 
               highlightDate={lastGameDate} 
               showHeader={false} // Hide header for cleaner history view
               showRank={false}   // Don't show rank for history
               emptyMessage="No history yet"
             />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={onStartGame}
            className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 duration-200"
          >
            <RotateCcw /> TRY AGAIN
          </button>
          <button
            onClick={onReturnToTitle}
            className="w-full py-3 bg-white text-gray-700 rounded-xl font-bold text-lg shadow hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 border border-gray-200"
          >
            <Home /> TITLE
          </button>
        </div>
      </div>
    </div>
  );
};
