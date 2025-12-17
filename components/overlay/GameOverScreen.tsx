
import React, { useState, useMemo } from 'react';
import { Skull, RotateCcw, Home, Crown, Globe, Clock, Star, BarChart3, Trophy, Share2, Coins, AlertCircle, CheckCircle2, Loader2, Copy } from 'lucide-react';
import { ScoreEntry, PlayerStats, ClaimResult } from '../../types';
import { WalletWidget } from './WalletWidget';
import { RankingList, RankedEntry } from './RankingList';

interface GameOverScreenProps {
  score: number;
  lives?: number; // Added optional lives prop to check for Clear state
  ranking: ScoreEntry[];
  totalRanking: PlayerStats[];
  userBestEntry: RankedEntry | null;
  recentHistory: ScoreEntry[];
  isNewRecord: boolean;
  lastGameDate: string | null;
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
  walletAddress: string | null;
  // Reward Props
  isClaiming: boolean;
  claimResult: ClaimResult | null;
  handleClaimReward: (wallet: string | null, score: number) => void;
  // Actions
  onStartGame: () => void;
  onReturnToTitle: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  onShowProfile: () => void;
  onShare: () => void;
}

type RankingTab = 'HIGH_SCORE' | 'TOTAL_SCORE';

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  score,
  lives = 0,
  ranking,
  totalRanking,
  userBestEntry,
  recentHistory,
  isNewRecord,
  lastGameDate,
  farcasterUser,
  walletAddress,
  isClaiming,
  claimResult,
  handleClaimReward,
  onStartGame,
  onReturnToTitle,
  onConnectWallet,
  onDisconnectWallet,
  onShowProfile,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState<RankingTab>('HIGH_SCORE');

  const isGameClear = lives > 0;
  const rewardAmount = Math.floor(score * 0.1);

  // Top 10 for Global Ranking display (High Scores)
  const top10HighScores = useMemo(() => ranking.slice(0, 10).map((entry, index) => ({
    entry,
    rank: index + 1
  })), [ranking]);

  // Top 10 for Total Scores
  const top10TotalScores = useMemo(() => {
    return [...totalRanking]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 10)
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
  }, [totalRanking]);

  // Check if current run is inside Top 10 High Scores
  const isRankIn = top10HighScores.some(item => item.entry.date === lastGameDate);

  // Map Recent History for display
  const historyItems = recentHistory.map((entry, index) => ({
    entry,
    rank: index + 1
  }));

  // Determine which list to show based on tab
  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'TOTAL_SCORE': return top10TotalScores;
      case 'HIGH_SCORE':
      default: return top10HighScores;
    }
  }, [activeTab, top10HighScores, top10TotalScores]);

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-start backdrop-blur-md z-50 p-4 pt-12 overflow-y-auto ${isGameClear ? 'bg-yellow-900/90' : 'bg-red-900/90'}`}>
      {/* Wallet Widget */}
      <WalletWidget
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onConnect={onConnectWallet}
        onShowProfile={onShowProfile}
      />

      <div className={`w-full max-w-lg bg-white/95 rounded-3xl p-4 md:p-6 shadow-2xl border-4 ${isGameClear ? 'border-yellow-400' : 'border-red-500'} text-center animate-bounce-in my-8 relative flex-shrink-0 backdrop-blur-sm`}>
        
        {/* Header Section */}
        {isGameClear ? (
            <div className="mb-4">
                <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-500 tracking-tighter drop-shadow-lg">
                  GAME CLEAR!!
                </h2>
                <Crown className="w-12 h-12 mx-auto text-yellow-500 animate-pulse mt-2 filter drop-shadow-lg" />
            </div>
        ) : isNewRecord ? (
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
           {isRankIn && activeTab === 'HIGH_SCORE' && (
             <div className="absolute top-0 right-0 bg-yellow-500 text-red-900 text-xs font-black px-2 py-1 animate-pulse">
               RANK IN!
             </div>
           )}
           <span className="text-gray-400 font-bold uppercase text-[10px] block mb-1">Your Score</span>
           <span className={`text-4xl font-black font-mono ${isNewRecord || isGameClear ? 'text-yellow-400' : 'text-white'}`}>
              {score.toLocaleString()}
           </span>
        </div>

        {/* --- REWARD SECTION --- */}
        <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-xl p-4 border border-yellow-300 mb-6 shadow-inner relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-orange-500"></div>
           
           {!claimResult ? (
             <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                   <Coins className="text-yellow-600" size={24} />
                   <h3 className="text-lg font-black text-yellow-800 uppercase italic tracking-tighter">Token Rewards</h3>
                </div>
                
                {walletAddress ? (
                   <>
                      <p className="text-sm font-bold text-gray-700 mb-3">
                        Earn <span className="text-orange-600 font-black">{rewardAmount} $CHH</span> for this run!
                      </p>
                      <button
                        onClick={() => handleClaimReward(walletAddress, score)}
                        disabled={isClaiming || rewardAmount <= 0}
                        className="w-full bg-gradient-to-b from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-white font-black py-3 rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 border-b-4 border-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isClaiming ? <Loader2 className="animate-spin" /> : <Coins fill="white" size={20} />}
                        {isClaiming ? 'SENDING...' : 'CLAIM REWARDS'}
                      </button>
                      <p className="text-[10px] text-gray-500 mt-2 text-center">
                         *Gas covered by developer treasury.
                      </p>
                   </>
                ) : (
                   <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2 font-medium">Connect wallet to claim <span className="font-bold">{rewardAmount} $CHH</span>.</p>
                      <button 
                        onClick={onConnectWallet}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2 px-4 rounded-full shadow transition-colors"
                      >
                        Connect Wallet
                      </button>
                   </div>
                )}
             </div>
           ) : (
             <div className={`flex flex-col items-center animate-in zoom-in duration-300 ${claimResult.success ? 'text-green-700' : 'text-red-600'}`}>
                {claimResult.success ? (
                   <>
                     <CheckCircle2 size={32} className="mb-2 text-green-500" />
                     <h3 className="text-xl font-black uppercase mb-1">Claim Successful!</h3>
                     <p className="text-sm font-bold mb-2">
                        Sent {claimResult.amount} $CHH to wallet.
                     </p>
                     {claimResult.txHash && (
                        <a href={`https://basescan.org/tx/${claimResult.txHash}`} target="_blank" rel="noreferrer" className="text-[10px] underline opacity-70 hover:opacity-100 font-mono">
                           Tx: {claimResult.txHash.slice(0, 10)}...
                        </a>
                     )}
                   </>
                ) : (
                   <>
                     <AlertCircle size={32} className="mb-2 text-red-500" />
                     <h3 className="text-lg font-bold uppercase mb-1">Claim Failed</h3>
                     
                     <div className="w-full flex items-center gap-2 mb-2 max-w-xs mx-auto">
                        <div className="flex-1 bg-red-50 p-2 rounded border border-red-200 text-[10px] font-mono text-red-800 break-all select-all text-left">
                           {claimResult.message}
                        </div>
                        <button 
                            onClick={() => navigator.clipboard.writeText(claimResult.message)}
                            className="p-2 bg-white border border-gray-200 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                            title="Copy Error"
                        >
                            <Copy size={14} className="text-gray-500" />
                        </button>
                     </div>

                     <button 
                       onClick={() => handleClaimReward(walletAddress, score)}
                       className="mt-2 text-xs font-bold underline hover:no-underline"
                     >
                       Try Again
                     </button>
                   </>
                )}
             </div>
           )}
        </div>
        {/* --- END REWARD SECTION --- */}

        <div className="space-y-4">
          
          {/* Section 1: Self Best (Always show personal best high score for reference) */}
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
                 rankingType="HIGH_SCORE"
               />
            </div>
          )}

          {/* Section 2: Global Ranking Tabs */}
          <div className="bg-yellow-50/80 rounded-xl p-3 border border-yellow-200">
             <div className="flex items-center justify-between gap-2 mb-3">
               <div className="flex items-center gap-2">
                 <Globe size={16} className="text-yellow-600" />
                 <h3 className="text-xs font-bold text-yellow-700 uppercase">Global Leaderboard</h3>
               </div>
             </div>

             {/* Tabs */}
             <div className="flex bg-yellow-200/50 p-1 rounded-lg mb-2">
               <button
                 onClick={() => setActiveTab('HIGH_SCORE')}
                 className={`flex-1 py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${activeTab === 'HIGH_SCORE' ? 'bg-white text-yellow-700 shadow-sm' : 'text-yellow-700/60 hover:text-yellow-700'}`}
               >
                 <Trophy size={12} /> High Score
               </button>
               <button
                 onClick={() => setActiveTab('TOTAL_SCORE')}
                 className={`flex-1 py-1.5 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${activeTab === 'TOTAL_SCORE' ? 'bg-white text-blue-600 shadow-sm' : 'text-blue-600/60 hover:text-blue-600'}`}
               >
                 <BarChart3 size={12} /> Total Score
               </button>
             </div>

             <RankingList 
                items={activeList} 
                highlightDate={activeTab === 'HIGH_SCORE' ? lastGameDate : null} 
                showHeader={true}
                rankingType={activeTab}
                title={
                  activeTab === 'HIGH_SCORE' ? "Top 10 Runs" : "Top 10 Cumulative Score"
                }
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
            onClick={onShare}
            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95 duration-200"
          >
            <Share2 /> SHARE SCORE
          </button>
          
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
