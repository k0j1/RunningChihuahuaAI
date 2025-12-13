import React, { useState } from 'react';
import { Trophy, ArrowLeft, BarChart3 } from 'lucide-react';
import { ScoreEntry, PlayerStats, RankingMode } from '../../types';
import { RankingList } from './RankingList';

interface RankingScreenProps {
  topScores: ScoreEntry[];
  totalStats?: PlayerStats[];
  onHideHistory: () => void;
}

export const RankingScreen: React.FC<RankingScreenProps> = ({ topScores, totalStats = [], onHideHistory }) => {
  const [mode, setMode] = useState<RankingMode>(RankingMode.HIGH_SCORE);

  // Map scores to RankedEntry format
  const rankedTopScores = topScores.slice(0, 100).map((entry, index) => ({
    entry,
    rank: index + 1
  }));

  // Map totals to RankedEntry format (Adapting PlayerStats to the list structure)
  // We re-use ScoreEntry structure purely for display compatibility in RankingList
  const rankedTotalStats = totalStats.slice(0, 100).map((stat, index) => ({
    entry: {
       date: stat.lastActive,
       formattedDate: 'Total',
       score: stat.totalScore, // Mapping totalScore to score for display
       distance: stat.totalDistance, // Mapping totalDistance to distance
       farcasterUser: stat.farcasterUser,
       walletAddress: stat.walletAddress
    },
    rank: index + 1
  }));
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-900/90 backdrop-blur-md z-50 p-6 pointer-events-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl h-3/4 flex flex-col border-4 border-yellow-400">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-black text-yellow-600 flex items-center gap-2">
            <Trophy className="text-yellow-500 fill-yellow-500" /> LEADERBOARD
          </h2>
          <button onClick={onHideHistory} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Toggle Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
           <button 
             onClick={() => setMode(RankingMode.HIGH_SCORE)}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === RankingMode.HIGH_SCORE ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <Trophy size={16} /> High Score
           </button>
           <button 
             onClick={() => setMode(RankingMode.TOTAL_STATS)}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${mode === RankingMode.TOTAL_STATS ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <BarChart3 size={16} /> Total Stats
           </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {mode === RankingMode.HIGH_SCORE ? (
            <RankingList items={rankedTopScores} />
          ) : (
            <RankingList items={rankedTotalStats} isTotalMode={true} />
          )}
        </div>
      </div>
    </div>
  );
};