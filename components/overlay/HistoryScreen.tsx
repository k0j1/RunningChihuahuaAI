
import React from 'react';
import { History, Trash2, ArrowLeft } from 'lucide-react';
import { ScoreEntry } from '../../types';

interface HistoryScreenProps {
  history: ScoreEntry[];
  onClearHistory: () => void;
  onHideHistory: () => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onClearHistory, onHideHistory }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-md z-50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl h-3/4 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2">
            <History className="text-blue-500" /> GAME HISTORY
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onClearHistory}
              className="p-2 hover:bg-red-100 rounded-full transition-colors group"
              title="Clear History"
            >
              <Trash2 size={24} className="text-gray-400 group-hover:text-red-500" />
            </button>
            <button onClick={onHideHistory} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {history.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400 italic">No runs recorded yet.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="text-xs uppercase text-gray-500 border-b-2 border-gray-100 sticky top-0 bg-white">
                <tr>
                  <th className="pb-3 pl-2">Date / Time</th>
                  <th className="pb-3">Distance</th>
                  <th className="pb-3 text-right pr-2">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-blue-50 transition-colors">
                    <td className="py-3 pl-2 text-sm text-gray-600 font-medium">{entry.formattedDate}</td>
                    <td className="py-3 text-sm text-gray-800 font-bold">{entry.distance} m</td>
                    <td className="py-3 pr-2 text-sm text-blue-600 font-black text-right">{entry.score}</td>
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
