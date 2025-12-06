
import React, { useMemo } from 'react';
import { GameState, ScoreEntry } from '../types';
import { Play, Pause, Skull, Heart, RotateCcw, History, ArrowLeft, Home, Zap, Trophy, Crown, Gauge } from 'lucide-react';
import { TitleBackground } from './TitleBackground';

interface OverlayProps {
  gameState: GameState;
  speed: number;
  dayTime: boolean;
  score: number;
  distance: number;
  lives: number;
  combo: number;
  hazardActive: boolean;
  showDodgeButton: boolean;
  hazardPosition: { top: string, left: string };
  projectileActive: boolean;
  showDuckButton: boolean;
  history: ScoreEntry[];
  lastGameDate: string | null;
  isHit: boolean;
  dodgeCutIn: { id: number, text: string, x: number, y: number } | null;
  onStartGame: () => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onHideHistory: () => void;
  onTogglePause: () => void;
  onDodge: (e: any) => void;
  onDuck: (e: any) => void;
  onReturnToTitle: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({
  gameState,
  speed,
  dayTime,
  score,
  distance,
  lives,
  combo,
  hazardActive,
  showDodgeButton,
  hazardPosition,
  projectileActive,
  showDuckButton,
  history,
  lastGameDate,
  isHit,
  dodgeCutIn,
  onStartGame,
  onShowHistory,
  onShowRanking,
  onHideHistory,
  onTogglePause,
  onDodge,
  onDuck,
  onReturnToTitle
}) => {

  // Memoize sorted top scores
  const topScores = useMemo(() => {
    return [...history].sort((a, b) => b.score - a.score);
  }, [history]);

  // Title Screen
  if (gameState === GameState.TITLE) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 overflow-hidden">
        {/* Generative Background */}
        <TitleBackground />
        
        {/* Content */}
        <div className="relative z-10 text-center text-white p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl animate-fade-in-up max-w-lg w-full mx-4">
          <h1 className="text-6xl font-black mb-4 tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
            RUNNING<br/>CHIHUAHUA
          </h1>
          <p className="text-xl mb-8 font-light text-gray-100">Escape the Gorilla!</p>
          <div className="flex flex-col gap-4">
            <button 
              onClick={onStartGame}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-2xl font-bold shadow-lg hover:scale-105 hover:shadow-blue-500/50 transition-all active:scale-95"
            >
              START RUNNING
            </button>
            <div className="flex gap-4">
              <button 
                onClick={onShowHistory}
                className="flex-1 px-4 py-3 bg-white/20 rounded-full text-lg font-bold shadow-lg hover:bg-white/30 transition-all flex items-center justify-center gap-2"
              >
                <History size={20}/> HISTORY
              </button>
              <button 
                onClick={onShowRanking}
                className="flex-1 px-4 py-3 bg-yellow-500/80 rounded-full text-lg font-bold shadow-lg hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
              >
                <Trophy size={20}/> RANKING
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // History Screen
  if (gameState === GameState.HISTORY) {
     return (
       <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-md z-50 p-6">
         <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl h-3/4 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2">
                <History className="text-blue-500" /> GAME HISTORY
              </h2>
              <button onClick={onHideHistory} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-gray-600"/>
              </button>
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
                          <td className="py-3 pl-2 text-sm text-gray-600 font-medium">
                            {entry.formattedDate}
                          </td>
                          <td className="py-3 text-sm text-gray-800 font-bold">
                            {entry.distance} m
                          </td>
                          <td className="py-3 pr-2 text-sm text-blue-600 font-black text-right">
                            {entry.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                 </table>
               )}
            </div>
         </div>
       </div>
     );
  }

  // Ranking Screen
  if (gameState === GameState.RANKING) {
    const top10 = topScores.slice(0, 10);
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-yellow-900/90 backdrop-blur-md z-50 p-6">
        <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl h-3/4 flex flex-col border-4 border-yellow-400">
           <div className="flex justify-between items-center mb-6">
             <h2 className="text-3xl font-black text-yellow-600 flex items-center gap-2">
               <Trophy className="text-yellow-500 fill-yellow-500" /> TOP 10 RANKING
             </h2>
             <button onClick={onHideHistory} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
               <ArrowLeft size={24} className="text-gray-600"/>
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
                       <th className="pb-3">Date</th>
                       <th className="pb-3">Distance</th>
                       <th className="pb-3 text-right pr-2">Score</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-yellow-50">
                     {top10.map((entry, idx) => (
                       <tr key={idx} className={`hover:bg-yellow-50 transition-colors ${idx < 3 ? 'bg-yellow-50/50' : ''}`}>
                         <td className="py-3 pl-2 text-sm font-bold text-gray-700">
                           {idx === 0 && <Crown size={16} className="inline mr-1 text-yellow-500 fill-yellow-500"/>}
                           {idx + 1}
                         </td>
                         <td className="py-3 text-xs text-gray-500">
                           {entry.formattedDate}
                         </td>
                         <td className="py-3 text-sm text-gray-800 font-bold">
                           {entry.distance} m
                         </td>
                         <td className="py-3 pr-2 text-lg text-yellow-600 font-black text-right">
                           {entry.score}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                </table>
              )}
           </div>
        </div>
      </div>
    );
 }

  // Game Over Screen
  if (gameState === GameState.GAME_OVER) {
    const top5 = topScores.slice(0, 5);
    
    // Use justify-start on mobile (md:justify-center) to prevent clipping at the top
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-start md:justify-center bg-red-900/80 backdrop-blur-md z-50 p-4 pt-12 md:pt-4 overflow-y-auto">
        <div className="w-full max-w-lg bg-white/10 rounded-3xl p-6 shadow-2xl border-4 border-red-500 text-center animate-bounce-in my-8 relative flex-shrink-0 backdrop-blur-sm">
          
          <Skull className="w-16 h-16 mx-auto text-red-500 mb-2 filter drop-shadow-lg" />
          <h2 className="text-5xl font-black text-white mb-6 tracking-tighter shadow-black drop-shadow-md">CAUGHT!</h2>
          
          <div className="bg-white/90 rounded-xl p-4 border-2 border-yellow-500 mb-6 shadow-xl text-left">
             <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                <span className="text-gray-500 font-bold uppercase text-xs">Score</span>
                <span className="text-4xl font-black text-blue-600">{score}</span>
             </div>

             <h3 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                <Trophy size={14} className="text-yellow-600"/> Top Scores
             </h3>
             <ul className="space-y-1">
                {top5.map((entry, idx) => {
                  const isCurrent = entry.date === lastGameDate;
                  return (
                    <li key={idx} className={`flex justify-between items-center text-xs p-2 rounded ${isCurrent ? 'bg-yellow-200 font-bold border border-yellow-400' : 'bg-gray-50'}`}>
                       <span className="w-4">{idx+1}.</span>
                       <span className="flex-1 text-left pl-2">{entry.formattedDate.split(' ')[0]}</span>
                       <span className={isCurrent ? 'text-red-600' : 'text-blue-600'}>{entry.score}</span>
                    </li>
                  )
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
  }

  // HUD & Gameplay Overlay
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10">
      
      {/* Comic Wipe Cut-In (Jagged Starburst) */}
      {dodgeCutIn && (
        <div 
           key={dodgeCutIn.id} 
           className="absolute z-[100] pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-none animate-in zoom-in spin-in-6 duration-200"
           style={{ left: dodgeCutIn.x, top: dodgeCutIn.y }}
        >
           {/* Starburst Container */}
           <div className="relative w-40 h-40 md:w-60 md:h-60 flex items-center justify-center animate-pulse">
             {/* Background Layer (Black Outline) */}
             <div className="absolute inset-0 bg-black scale-110" style={{ clipPath: 'polygon(100% 50%, 85% 60%, 100% 85%, 75% 85%, 65% 100%, 50% 85%, 35% 100%, 25% 85%, 0% 85%, 15% 60%, 0% 50%, 15% 40%, 0% 15%, 25% 15%, 35% 0%, 50% 15%, 65% 0%, 75% 15%, 100% 15%, 85% 40%)' }}></div>
             
             {/* Foreground Layer (Yellow Body) */}
             <div className="absolute inset-0 bg-yellow-400" style={{ clipPath: 'polygon(100% 50%, 85% 60%, 100% 85%, 75% 85%, 65% 100%, 50% 85%, 35% 100%, 25% 85%, 0% 85%, 15% 60%, 0% 50%, 15% 40%, 0% 15%, 25% 15%, 35% 0%, 50% 15%, 65% 0%, 75% 15%, 100% 15%, 85% 40%)' }}></div>
             
             {/* Text */}
             <span className="relative z-10 text-3xl md:text-5xl font-black italic text-black tracking-tighter rotate-[-6deg] drop-shadow-md" style={{ fontFamily: 'sans-serif' }}>
               {dodgeCutIn.text}
             </span>
           </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto w-full relative">
        
        {/* Left: Stats & Pause */}
        <div className="flex gap-2">
          <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 flex flex-col gap-1 min-w-[140px]">
            <div className="flex justify-between items-center border-b border-gray-200 pb-1 mb-1">
              <span className="text-xs font-bold text-gray-400 uppercase">Distance</span>
              <span className="font-mono font-bold text-gray-700">{distance.toFixed(0)}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-gray-400 uppercase">Score</span>
              <span className="font-mono font-bold text-blue-600 text-lg">{score}</span>
            </div>
            
            {/* Hearts */}
            <div className="flex gap-1 mt-2 items-center justify-center bg-gray-50 rounded-lg p-1">
                {[0, 1, 2].map((i) => {
                  const fillPct = Math.min(Math.max((lives - i) * 100, 0), 100);
                  return (
                    <div key={i} className={`relative w-5 h-5 transition-transform duration-300 ${isHit && Math.ceil(lives) === i + 1 ? 'scale-125' : ''}`}>
                      <Heart size={20} className="text-gray-300 fill-gray-300 absolute top-0 left-0" />
                      <div className="absolute top-0 left-0 h-full overflow-hidden transition-all duration-300" style={{ width: `${fillPct}%` }}>
                        <Heart size={20} className="text-red-500 fill-red-500 min-w-[20px]" />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
          
          {/* Pause Button */}
          <button 
              onClick={onTogglePause}
              className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/90 backdrop-blur-md shadow-xl border border-white/50 text-gray-700 hover:bg-white transition-colors active:scale-95"
            >
              {gameState === GameState.RUNNING ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
          </button>
        </div>

        {/* Right: Combo */}
        <div className="flex flex-col items-end gap-2 pr-4">
           {/* Combo Display */}
           {combo > 1 && (
             <div className="flex flex-col items-end animate-bounce">
               <span className="text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transform -skew-x-12 stroke-white" style={{WebkitTextStroke: '2px white'}}>
                 x{combo}
               </span>
               <div className="flex items-center gap-1 bg-yellow-400 text-red-900 px-2 py-1 rounded shadow-lg transform rotate-3">
                  <Zap size={16} className="fill-current animate-pulse" />
                  <span className="text-xs font-black uppercase tracking-widest">COMBO!</span>
               </div>
             </div>
           )}
        </div>
      </div>
      
      {/* Bottom Center: Speedometer */}
      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-0 pb-8 md:pb-4 z-20">
          <div className="bg-black/80 backdrop-blur-md text-white px-6 py-2 rounded-t-3xl shadow-xl border-x-2 border-t-2 border-gray-700 flex items-center gap-3">
            <div className="relative">
                <Gauge size={28} className="text-cyan-400" />
                <div className="absolute inset-0 animate-pulse bg-cyan-400/20 rounded-full blur-md"></div>
            </div>
            <div className="flex flex-col items-start leading-none">
                <span className="text-2xl font-mono font-bold tracking-wider text-cyan-300">
                  {(speed * 20).toFixed(0)}
                </span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">km/h</span>
            </div>
          </div>
      </div>

      {/* Dodge Button (Obstacles) - Replaced logic: Use showDodgeButton */}
      {showDodgeButton && (
        <div 
           className="absolute pointer-events-auto z-50 transform -translate-x-1/2 -translate-y-1/2 transition-none"
           style={{ top: hazardPosition.top, left: hazardPosition.left }}
        >
           <button 
             onClick={onDodge}
             className="animate-pulse bg-red-600 border-4 border-yellow-400 text-white font-black text-2xl md:text-4xl px-8 py-6 rounded-full shadow-[0_0_50px_rgba(220,38,38,0.8)] hover:scale-110 active:scale-90 transition-transform cursor-pointer whitespace-nowrap"
           >
             DODGE!
           </button>
        </div>
      )}

      {/* Duck Button (Projectiles) */}
      {showDuckButton && (
        <div 
           className="absolute pointer-events-auto z-50 transform -translate-x-1/2 -translate-y-1/2 transition-none"
           style={{ top: '80%', left: '50%' }}
        >
           <button 
             onClick={onDuck}
             className="animate-bounce bg-blue-600 border-4 border-cyan-400 text-white font-black text-2xl md:text-3xl px-10 py-5 rounded-full shadow-[0_0_50px_rgba(37,99,235,0.8)] hover:scale-110 active:scale-90 transition-transform cursor-pointer whitespace-nowrap"
           >
             DUCK!
           </button>
        </div>
      )}
    </div>
  );
};
