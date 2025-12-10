
import React from 'react';
import { Trophy, ArrowLeft, Crown } from 'lucide-react';
import { ScoreEntry } from '../../types';

interface RankingScreenProps {
  topScores: ScoreEntry[];
  onHideHistory: () => void;
}

export const RankingScreen: React.FC<RankingScreenProps> = ({ topScores, onHideHistory }) => {
  const top10 = topScores.slice(0, 10);
  
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-900/90 backdrop-blur-md z-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl h-3/4 flex flex-col border-4 border-yellow-400">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-yellow-600 flex items-center gap-2">
            <Trophy className="text-yellow-500 fill-yellow-500" /> TOP 10 RANKING
          </h2>
          <button onClick={onHideHistory} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {top10.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic">No records yet.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-gray-500 border-b-2 border-yellow-100 sticky top-0 bg-white">
                <tr>
                  <th className="pb-3 pl-2">Rank</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">Distance</th>
                  <th className="pb-3 text-right pr-2">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-50">
                {top10.map((entry, idx) => (
                  <tr key={idx} className={`hover:bg-yellow-50 transition-colors ${idx < 3 ? 'bg-yellow-50/50' : ''}`}>
                    <td className="py-3 pl-2 text-sm font-bold text-gray-700">
                      {idx === 0 && <Crown size={16} className="inline mr-1 text-yellow-500 fill-yellow-500" />}
                      {idx + 1}
                    </td>
                    <td className="py-3 text-sm font-medium text-gray-700">
                      <div className="flex items-center gap-2">
                        {entry.farcasterUser?.pfpUrl ? (
                          <img
                            src={entry.farcasterUser.pfpUrl}
                            className="w-6 h-6 rounded-full border border-gray-200"
                            alt="pfp"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold">
                            {entry.farcasterUser?.username 
                              ? entry.farcasterUser.username.charAt(0).toUpperCase() 
                              : (entry.walletAddress ? 'W' : 'G')}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="leading-none font-bold">
                            {entry.farcasterUser?.displayName || 
                             (entry.walletAddress ? `${entry.walletAddress.slice(0, 6)}...` : 'Guest')}
                          </span>
                          <span className="text-[10px] text-gray-500 leading-none">
                            {entry.farcasterUser?.username 
                              ? `@${entry.farcasterUser.username}` 
                              : (entry.walletAddress ? 'Wallet' : 'Anonymous')}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-gray-800 font-bold">{entry.distance} m</td>
                    <td className="py-3 pr-2 text-lg text-yellow-600 font-black text-right">{entry.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};