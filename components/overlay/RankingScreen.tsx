
import React from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { ScoreEntry } from '../../types';
import { RankingList } from './RankingList';

interface RankingScreenProps {
  topScores: ScoreEntry[];
  onHideHistory: () => void;
}

export const RankingScreen: React.FC<RankingScreenProps> = ({ topScores, onHideHistory }) => {
  // Map scores to RankedEntry format (limit to 100 as requested)
  const rankedItems = topScores.slice(0, 100).map((entry, index) => ({
    entry,
    rank: index + 1
  }));
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-900/90 backdrop-blur-md z-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl h-3/4 flex flex-col border-4 border-yellow-400">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-yellow-600 flex items-center gap-2">
            <Trophy className="text-yellow-500 fill-yellow-500" /> GLOBAL RANKING
          </h2>
          <button onClick={onHideHistory} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <RankingList items={rankedItems} />
        </div>
      </div>
    </div>
  );
};
