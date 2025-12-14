
import React from 'react';
import { Crown } from 'lucide-react';
import { ScoreEntry } from '../../types';

export interface RankedEntry {
  entry: ScoreEntry;
  rank: number;
}

export type RankingType = 'HIGH_SCORE' | 'TOTAL_SCORE';

interface RankingListProps {
  items: RankedEntry[];
  highlightDate?: string | null;
  emptyMessage?: string;
  showHeader?: boolean;
  showRank?: boolean;
  title?: string;
  rankingType?: RankingType;
}

export const RankingList: React.FC<RankingListProps> = ({ 
  items, 
  highlightDate, 
  emptyMessage = "No records yet.",
  showHeader = true,
  showRank = true,
  title,
  rankingType = 'HIGH_SCORE'
}) => {
  if (items.length === 0) {
    return (
      <div className="w-full">
        {title && <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">{title}</h3>}
        <div className="text-gray-400 italic text-center py-4 text-xs bg-black/5 rounded-lg">{emptyMessage}</div>
      </div>
    );
  }

  // Column Visibility Logic
  const showDistance = rankingType === 'HIGH_SCORE';
  const showScore = true;

  // Responsive & Alignment Classes:
  // Distance is secondary (hidden on mobile, left aligned).
  const distanceHeaderClass = 'hidden md:table-cell';
  const distanceCellClass = 'hidden md:table-cell text-xs text-gray-600';

  return (
    <div className="w-full">
      {title && <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">{title}</h3>}
      <div className="overflow-hidden rounded-lg border border-yellow-100/50">
        <table className="w-full text-left bg-white/50">
          {showHeader && (
            <thead className="text-[10px] uppercase text-gray-500 border-b border-yellow-100 bg-yellow-50/50">
              <tr>
                {showRank && <th className="py-2 pl-2 w-10">Rank</th>}
                <th className="py-2 pl-2">User</th>
                {showDistance && <th className={`py-2 ${distanceHeaderClass}`}>Dist.</th>}
                {showScore && <th className="py-2 text-right pr-2">{rankingType === 'TOTAL_SCORE' ? 'Total Score' : 'Score'}</th>}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-yellow-50/50">
            {items.map(({ entry, rank }, idx) => {
              const isCurrent = entry.date === highlightDate;
              const isTop3 = rank <= 3 && showRank;
              
              return (
                <tr 
                  key={`${entry.date}-${idx}`} 
                  className={`
                    transition-colors 
                    ${isCurrent ? 'bg-yellow-200 animate-pulse-slow ring-1 ring-inset ring-yellow-400' : 'hover:bg-yellow-50/80 bg-white/40'} 
                    ${isTop3 && !isCurrent ? 'bg-yellow-50/30' : ''}
                  `}
                >
                  {showRank && (
                    <td className="py-1.5 pl-2 text-xs font-bold text-gray-700">
                      <div className="flex items-center gap-1">
                        {rank === 1 && <Crown size={12} className="text-yellow-500 fill-yellow-500" />}
                        {rank}
                      </div>
                    </td>
                  )}
                  <td className="py-1.5 pl-2 text-xs font-medium text-gray-700">
                    <div className="flex items-center gap-2">
                      {entry.farcasterUser?.pfpUrl ? (
                        <img
                          src={entry.farcasterUser.pfpUrl}
                          className="w-5 h-5 rounded-full border border-gray-200"
                          alt="pfp"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-500 font-bold shrink-0">
                          {entry.farcasterUser?.username 
                            ? entry.farcasterUser.username.charAt(0).toUpperCase() 
                            : (entry.walletAddress ? 'W' : 'G')}
                        </div>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="leading-none font-bold truncate max-w-[80px] md:max-w-[120px]">
                          {entry.farcasterUser?.displayName || 
                           entry.farcasterUser?.username ||
                           (entry.walletAddress ? `${entry.walletAddress.slice(0, 4)}...${entry.walletAddress.slice(-4)}` : 'Guest')}
                        </span>
                      </div>
                    </div>
                  </td>
                  {showDistance && (
                    <td className={`py-1.5 font-mono whitespace-nowrap ${distanceCellClass}`}>
                      {entry.distance.toLocaleString()}m
                    </td>
                  )}
                  {showScore && (
                    <td className={`py-1.5 pr-2 text-sm font-black text-right font-mono ${isCurrent ? 'text-red-600' : 'text-yellow-700'}`}>
                      {entry.score.toLocaleString()}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
