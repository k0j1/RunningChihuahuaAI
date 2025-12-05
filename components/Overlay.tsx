import React, { useMemo } from 'react';
import { DogThought, GameState, ScoreEntry, ReactionType } from '../types';
import { Play, Pause, MessageCircle, Skull, Heart, RotateCcw, Frown, History, ArrowLeft, Home, Smile, Laugh, Zap, Trophy, Crown } from 'lucide-react';

interface OverlayProps {
  gameState: GameState;
  speed: number;
  dayTime: boolean;
  thought: DogThought | null;
  score: number;
  distance: number;
  lives: number;
  combo: number;
  hazardActive: boolean;
  hazardPosition: { top: string, left: string };
  projectileActive: boolean;
  showDuckButton: boolean;
  history: ScoreEntry[];
  lastGameDate: string | null;
  isThinking: boolean;
  isHit: boolean;
  reaction: { chihuahua: ReactionType, gorilla: ReactionType };
  onStartGame: () => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onHideHistory: () => void;
  onTogglePause: () => void;
  onSpeedChange: (speed: number) => void;
  onAskThought: () => void;
  onDodge: () => void;
  onDuck: () => void;
  onReturnToTitle: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({
  gameState,
  speed,
  dayTime,
  thought,
  score,
  distance,
  lives,
  combo,
  hazardActive,
  hazardPosition,
  projectileActive,
  showDuckButton,
  history,
  lastGameDate,
  isThinking,
  isHit,
  reaction,
  onStartGame,
  onShowHistory,
  onShowRanking,
  onHideHistory,
  onTogglePause,
  onSpeedChange,
  onAskThought,
  onDodge,
  onDuck,
  onReturnToTitle
}) => {

  // Memoize sorted top scores
  const topScores = useMemo(() => {
    return [...history].sort((a, b) => b.score - a.score);
  }, [history]);

  const renderReactionIcon = (type: ReactionType, isDog: boolean) => {
    switch (type) {
      case ReactionType.HAPPY:
        return <Smile size={48} className="text-green-500 animate-bounce" />;
      case ReactionType.LAUGH:
        return <Laugh size={48} className="text-orange-500 animate-pulse" />;
      case ReactionType.PAIN:
        return <Frown size={48} className="text-red-500 animate-shake" />;
      case ReactionType.NEUTRAL:
      default:
        // Default faces
        return isDog 
          ? <div className="text-4xl">🐶</div> 
          : <div className="text-4xl">🦍</div>;
    }
  };

  // Title Screen
  if (gameState === GameState.TITLE) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-50">
        <div className="text-center text-white p-8 bg-white/10 rounded-3xl border border-white/30 shadow-2xl animate-fade-in-up max-w-lg w-full">
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
    const recent5 = history.slice(0, 5);

    // Check if current run made it to top 5
    const isNewHighScore = lastGameDate && top5.some(entry => entry.date === lastGameDate);
    // Check if it's the absolute best
    const isNumberOne = lastGameDate && top5.length > 0 && top5[0].date === lastGameDate;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/80 backdrop-blur-md z-50 p-4 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border-4 border-red-500 text-center animate-bounce-in my-8 relative">
          
          {isNumberOne && (
            <div className="absolute -top-10 left-0 right-0 flex justify-center">
              <div className="bg-yellow-400 text-red-900 px-6 py-2 rounded-full font-black text-xl shadow-lg animate-bounce flex items-center gap-2 border-4 border-white">
                 <Crown className="fill-current" /> NEW HIGH SCORE!!
              </div>
            </div>
          )}

          <Skull className="w-16 h-16 mx-auto text-red-500 mb-2" />
          <h2 className="text-4xl font-black text-gray-800 mb-1">CAUGHT!</h2>
          <p className="text-gray-500 mb-6">The gorilla got you.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-100 p-4 rounded-xl">
              <p className="text-xs text-gray-500 uppercase">Distance</p>
              <p className="text-2xl font-bold text-gray-800">{distance.toFixed(0)}m</p>
            </div>
            <div className={`p-4 rounded-xl ${isNewHighScore ? 'bg-yellow-100 ring-4 ring-yellow-400 animate-pulse' : 'bg-gray-100'}`}>
              <p className="text-xs text-gray-500 uppercase">Score</p>
              <p className="text-2xl font-bold text-blue-600">{score}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-left">
            {/* Top 5 Scores */}
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100">
              <h3 className="text-xs font-bold text-yellow-600 mb-3 uppercase tracking-wide flex items-center gap-1">
                <Trophy size={14} className="fill-yellow-600"/> Top 5 Best
              </h3>
              <ul className="space-y-2">
                {top5.map((entry, idx) => {
                  const isCurrentRun = entry.date === lastGameDate;
                  return (
                    <li key={idx} className={`flex justify-between items-center text-xs text-gray-700 p-2 rounded shadow-sm relative transition-all duration-300
                        ${isCurrentRun ? 'bg-yellow-200 border-2 border-yellow-400 scale-105 font-bold z-10' : 'bg-white'}`}>
                      {isCurrentRun && (
                        <span className="absolute -right-2 -top-2 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-ping opacity-75">
                          NEW
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className={`font-bold w-4 ${idx===0 ? 'text-yellow-600 text-sm' : 'text-yellow-500'}`}>{idx + 1}.</span>
                        <span className="text-gray-500 text-[10px]">{entry.formattedDate.split(' ')[0]}</span>
                      </div>
                      <span className={`font-mono font-black ${isCurrentRun ? 'text-red-600 text-sm' : 'text-blue-600'}`}>{entry.score}</span>
                    </li>
                  );
                })}
                {top5.length === 0 && <li className="text-xs text-gray-400 italic">No records</li>}
              </ul>
            </div>

            {/* Recent 5 Runs */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide flex items-center gap-1">
                <History size={14}/> Recent 5
              </h3>
              <ul className="space-y-2">
                {recent5.map((entry, idx) => (
                  <li key={idx} className="flex justify-between items-center text-xs text-gray-700 bg-white p-2 rounded shadow-sm">
                    <span className="text-gray-500 text-[10px]">{entry.formattedDate.split(' ')[1]}</span>
                    <span className="font-bold">{entry.distance}m</span>
                    <span className="font-mono text-gray-600">{entry.score}</span>
                  </li>
                ))}
                 {recent5.length === 0 && <li className="text-xs text-gray-400 italic">No records</li>}
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={onStartGame}
              className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-xl shadow-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw /> TRY AGAIN
            </button>
            <button 
              onClick={onReturnToTitle}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-bold text-lg shadow hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
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
      
      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto w-full">
        {/* Left: Stats */}
        <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/50 flex flex-col gap-1 min-w-[150px]">
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

        {/* Right: Reaction Faces & Combo */}
        <div className="flex flex-col items-end gap-2 pr-4"> {/* Added pr-4 to prevent cutoff */}
           
           {/* Reaction Faces (Moved to Top Right) */}
           <div className="flex gap-2 items-center justify-end bg-white/30 backdrop-blur-md p-2 rounded-xl border border-white/40 shadow-lg">
             <div className={`transition-transform duration-300 ${reaction.chihuahua !== ReactionType.NEUTRAL ? 'scale-110' : 'scale-90'}`}>
                <div className="bg-white/80 p-1 rounded-full shadow-md border-2 border-yellow-400 backdrop-blur-sm">
                  {renderReactionIcon(reaction.chihuahua, true)}
                </div>
             </div>
             <span className="font-black text-xl text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] italic">VS</span>
             <div className={`transition-transform duration-300 ${reaction.gorilla !== ReactionType.NEUTRAL ? 'scale-110' : 'scale-90'}`}>
                <div className="bg-white/80 p-1 rounded-full shadow-md border-2 border-gray-600 backdrop-blur-sm">
                  {renderReactionIcon(reaction.gorilla, false)}
                </div>
             </div>
           </div>

           {/* Combo Display (Large, Top Right) */}
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

      {/* Dodge Button (Obstacles) */}
      {hazardActive && (
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

      {/* Thought Bubble & Controls */}
      <div className="flex justify-center items-end mb-8 pointer-events-auto">
        <div className="relative max-w-md w-full">
            {/* Thought */}
            {(thought || isThinking) && (
              <div className="mb-4 transform transition-all duration-500 ease-out origin-bottom">
                <div className={`bg-white p-6 rounded-3xl rounded-bl-none shadow-2xl border-2 ${isHit ? 'border-red-400 bg-red-50' : 'border-gray-100'} relative animate-fade-in-up`}>
                  {isThinking ? (
                    <div className="flex space-x-2 items-center text-gray-400">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-medium text-gray-800 leading-snug">
                        "{thought?.text}"
                      </p>
                      {thought?.emotion && (
                        <div className="absolute -top-3 -right-3 bg-blue-500 text-white text-xs px-3 py-1 rounded-full uppercase tracking-wider font-bold shadow-md">
                          {thought.emotion}
                        </div>
                      )}
                    </>
                  )}
                  {/* Bubble tail */}
                  <div className={`absolute -bottom-3 left-0 w-6 h-6 ${isHit ? 'bg-red-50 border-red-400' : 'bg-white border-gray-100'} border-b-2 border-r-2 transform skew-x-12 rotate-45`}></div>
                </div>
              </div>
            )}

            {/* Controls Bar */}
            <div className="bg-white/90 backdrop-blur-lg p-3 rounded-2xl shadow-2xl border border-white/50 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button 
                  onClick={onTogglePause}
                  className="w-12 h-12 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                >
                  {gameState === GameState.RUNNING ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}
                </button>
                
                <div className="flex flex-col gap-1 px-2">
                   <label className="text-xs font-bold text-gray-400 uppercase">Speed</label>
                   <input 
                    type="range" 
                    min="0.5" 
                    max="5" 
                    step="0.1" 
                    value={speed}
                    onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                    className="w-24 md:w-32 accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                   />
                </div>
              </div>

              <button 
                onClick={onAskThought}
                disabled={isThinking || gameState !== GameState.RUNNING}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all shadow-lg
                  ${isThinking || gameState !== GameState.RUNNING
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-pink-500/30 active:scale-95'
                  }`}
              >
                <MessageCircle size={20} />
                <span className="hidden sm:inline">Thinking...</span>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};