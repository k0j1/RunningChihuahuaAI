
import React, { useState, useMemo } from 'react';
import { Trophy, ArrowLeft, BarChart3 } from 'lucide-react';
import { ScoreEntry, PlayerStats } from '../../types';
import { RankingList } from './RankingList';

interface RankingScreenProps {
  topScores: ScoreEntry[];
  totalStats?: PlayerStats[];
  onHideHistory: () => void;
}

type RankingTab = 'HIGH_SCORE' | 'TOTAL_SCORE';

export const RankingScreen: React.FC<RankingScreenProps> = ({ topScores, totalStats = [], onHideHistory }) => {
  const [activeTab, setActiveTab] = useState<RankingTab>('HIGH_SCORE');

  // 1. High Scores (Global Ranking)
  const rankedHighScores = useMemo(() => topScores.slice(0, 100).map((entry, index) => ({
    entry,
    rank: index + 1
  })), [topScores]);

  // 2. Total Scores
  const rankedTotalScores = useMemo(() => {
    return [...totalStats]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 100)
      .map((stat, index) => ({
        entry: {
          date: stat.lastActive,
          formattedDate: 'Total',
          score: stat.totalScore,
          distance: stat.totalDistance,
          farcasterUser: stat.farcasterUser,
          walletAddress: stat.walletAddress
        } as ScoreEntry,
        rank: index + 1
      }));
  }, [totalStats]);

  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'TOTAL_SCORE': return rankedTotalScores;
      case 'HIGH_SCORE':
      default: return rankedHighScores;
    }
  }, [activeTab, rankedHighScores, rankedTotalScores]);
  
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
             onClick={() => setActiveTab('HIGH_SCORE')}
             className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${activeTab === 'HIGH_SCORE' ? 'bg-white text-yellow-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <Trophy size={16} /> High Score
           </button>
           <button 
             onClick={() => setActiveTab('TOTAL_SCORE')}
             className={`flex-1 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-1 md:gap-2 transition-all ${activeTab === 'TOTAL_SCORE' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
           >
             <BarChart3 size={16} /> Total Score
           </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <RankingList 
            items={activeList} 
            rankingType={activeTab}
            title={
                activeTab === 'HIGH_SCORE' ? "Top Players (Single Run)" : "Top Players (Cumulative Score)"
            }
          />
        </div>
      </div>
    </div>
  );
};
