import React, { useState, useMemo } from 'react';
import { Skull, RotateCcw, Home, Crown, Globe, Clock, Star, BarChart3, Trophy, Share2, Coins, AlertCircle, CheckCircle2, Loader2, Copy, RefreshCw } from 'lucide-react';
import { ScoreEntry, PlayerStats, ClaimResult } from '../../types';
import { WalletWidget } from './WalletWidget';
import { RankingList, RankedEntry } from './RankingList';

interface GameOverScreenProps {
  score: number;
  lives?: number;
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
  isRefreshing?: boolean;
  claimResult: ClaimResult | null;
  totalClaimed: number;
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
  isRefreshing = false,
  claimResult,
  totalClaimed,
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
  
  // Updated Reward Calculation: score * 0.1
  const rewardTokens = (score * 0.1).toFixed(1); 

  const top10HighScores = useMemo(() => ranking.slice(0, 10).map((entry, index) => ({
    entry,
    rank: index + 1
  })), [ranking]);

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

  const isRankIn = top10HighScores.some(item => item.entry.date === lastGameDate);

  const historyItems = recentHistory.map((entry, index) => ({
    entry,
    rank: index + 1
  }));

  const activeList = useMemo(() => {
    switch (activeTab) {
      case 'TOTAL_SCORE': return top10TotalScores;
      case 'HIGH_SCORE':
      default: return top10HighScores;
    }
  }, [activeTab, top10HighScores, top10TotalScores]);

  return (
    <div className={`absolute inset-0 flex flex-col items-center justify-start backdrop-blur-md z-50 p-4 pt-12 overflow-y-auto ${isGameClear ? 'bg-yellow-900/90' : 'bg-red-900/90'}`}>
      <WalletWidget
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onConnect={onConnectWallet}
        onShowProfile={onShowProfile}
      />

      <div className={`w-full max-w-lg bg-white/95 rounded-3xl p-4 md:p-6 shadow-2xl border-4 ${isGameClear ? 'border-yellow-400' : 'border-red-500'} text-center animate-bounce-in my-8 relative flex-shrink-0 backdrop-blur-sm`}>
        
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

        <div className="bg-gray-900 rounded-xl p-3 border-2 border-yellow-500 mb-4 shadow-xl text-center relative overflow-hidden">
           {isRankIn && activeTab === 'HIGH_SCORE' && (
             <div className="absolute top-0 right-0 bg-yellow-500 text-red-900 text-xs font-black px-2 py-1 animate-pulse">
               RANK IN!
             </div>
           )}
           <span className="text-gray-400 font-bold uppercase text-[10px] block mb-1">Your Run Score</span>
           <span className={`text-4xl font-black font-mono ${isNewRecord || isGameClear ? 'text-yellow-400' : 'text-white'}`}>
              {score.toLocaleString()}
           </span>
        </div>

        {/* --- REWARD SECTION --- */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 mb-6 shadow-inner relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
           
           {!claimResult ? (
             <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-3">
                   <Coins className="text-blue-600" size={24} />
                   <h3 className="text-lg font-black text-blue-800 uppercase italic tracking-tighter">Run Rewards</h3>
                </div>
                
                {walletAddress ? (
                   <>
                      <div className="w-full bg-white/60 rounded-lg p-3 mb-4 border border-blue-100 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Payout Rate:</span>
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Score × 0.1</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-blue-100 pt-2">
                          <span className="text-sm font-bold text-gray-700 uppercase">You will get:</span>
                          <span className="text-2xl font-black text-blue-700">{rewardTokens} <span className="text-xs">$CHH</span></span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleClaimReward(walletAddress, score)}
                        disabled={isClaiming || score <= 0 || isRefreshing}
                        className="w-full bg-gradient-to-b from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-black py-4 rounded-xl shadow-lg transform active:scale-95 transition-all flex flex-col items-center justify-center gap-0 border-b-4 border-indigo-800 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed group"
                      >
                        <div className="flex items-center gap-2">
                           {isClaiming ? <Loader2 className="animate-spin" /> : <Coins fill="white" size={20} className="group-hover:rotate-12 transition-transform" />}
                           <span className="text-lg uppercase italic">
                             {isClaiming ? 'PROCESSING...' : score > 0 ? 'CLAIM THIS RUN' : 'NO SCORE TO CLAIM'}
                           </span>
                        </div>
                        {score > 0 && !isClaiming && (
                           <span className="text-[10px] opacity-80 font-bold">Claiming {rewardTokens} tokens on Base</span>
                        )}
                      </button>
                      <p className="text-[9px] text-gray-400 mt-2 italic font-medium">
                        *Claim reward for this run score regardless of past claims.
                      </p>
                   </>
                ) : (
                   <div className="text-center py-2">
                      <p className="text-xs text-gray-600 mb-3 font-medium">Connect wallet to claim your tokens on Base!</p>
                      <button 
                        onClick={onConnectWallet}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-black py-3 px-8 rounded-full shadow-lg transition-all active:scale-95"
                      >
                        CONNECT WALLET
                      </button>
                   </div>
                )}
             </div>
           ) : (
             <div className={`flex flex-col items-center animate-in zoom-in duration-300 p-2 ${claimResult.success ? 'text-green-700' : 'text-red-600'}`}>
                {claimResult.success ? (
                   <>
                     <div className="bg-green-100 p-3 rounded-full mb-3">
                        <CheckCircle2 size={40} className="text-green-500" />
                     </div>
                     <h3 className="text-xl font-black uppercase mb-1 italic">CLAIM SUCCESSFUL!</h3>
                     <p className="text-xs font-bold mb-4 text-gray-600">
                        {rewardTokens} $CHH has been sent to your wallet.
                     </p>
                     {claimResult.txHash && (
                        <a 
                          href={`https://basescan.org/tx/${claimResult.txHash}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-white px-4 py-2 rounded-lg border border-green-200 text-[10px] font-mono hover:bg-green-50 transition-colors flex items-center gap-2"
                        >
                           VIEW ON BASESCAN
                           <RefreshCw size={10} />
                        </a>
                     )}
                   </>
                ) : (
                   <>
                     <AlertCircle size={40} className="mb-3 text-red-500" />
                     <h3 className="text-lg font-black uppercase mb-1">CLAIM FAILED</h3>
                     <div className="w-full bg-red-50 p-3 rounded-xl border border-red-100 text-[10px] font-mono text-red-800 break-all text-left mb-4 flex gap-2">
                        <span className="flex-1">{claimResult.message}</span>
                        <button 
                            onClick={() => navigator.clipboard.writeText(claimResult.message)}
                            className="shrink-0 p-1 hover:bg-red-200 rounded"
                        >
                            <Copy size={14} />
                        </button>
                     </div>
                     <button 
                       onClick={() => handleClaimReward(walletAddress, score)}
                       className="bg-red-600 text-white text-xs font-black py-2 px-6 rounded-full hover:bg-red-500 transition-colors"
                     >
                       RETRY CLAIM
                     </button>
                   </>
                )}
             </div>
           )}
        </div>
        {/* --- END REWARD SECTION --- */}

        <div className="space-y-4">
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

          <div className="bg-yellow-50/80 rounded-xl p-3 border border-yellow-200">
             <div className="flex items-center justify-between gap-2 mb-3">
               <div className="flex items-center gap-2">
                 <Globe size={16} className="text-yellow-600" />
                 <h3 className="text-xs font-bold text-yellow-700 uppercase">Global Leaderboard</h3>
               </div>
             </div>

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
        </div>

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