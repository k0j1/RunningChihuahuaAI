
import React from 'react';
import { Pause, Play, Heart, Zap, Gauge, Volume2, VolumeX, MapPin, Trophy, Shield } from 'lucide-react';
import { GameState, ItemType } from '../../types';

interface GameHUDProps {
  distance: number;
  score: number;
  lives: number;
  shield: number;
  isHit: boolean;
  gameState: GameState;
  onTogglePause: () => void;
  combo: number;
  speed: number;
  dodgeCutIn: { id: number; text: string; x: number; y: number } | null;
  showDodgeButton: boolean;
  hazardPosition: { top: string; left: string };
  onDodge: (e: any) => void;
  showDuckButton: boolean;
  onDuck: (e: any) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  // New props for shield activation
  hasUsedShield: boolean;
  onUseShield: () => void;
  shieldInventoryCount: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  distance,
  score,
  lives,
  shield,
  isHit,
  gameState,
  onTogglePause,
  combo,
  speed,
  dodgeCutIn,
  showDodgeButton,
  hazardPosition,
  onDodge,
  showDuckButton,
  onDuck,
  isMuted,
  onToggleMute,
  hasUsedShield,
  onUseShield,
  shieldInventoryCount
}) => {
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
            <div
              className="absolute inset-0 bg-black scale-110"
              style={{
                clipPath:
                  'polygon(100% 50%, 85% 60%, 100% 85%, 75% 85%, 65% 100%, 50% 85%, 35% 100%, 25% 85%, 0% 85%, 15% 60%, 0% 50%, 15% 40%, 0% 15%, 25% 15%, 35% 0%, 50% 15%, 65% 0%, 75% 15%, 100% 15%, 85% 40%)',
              }}
            ></div>

            {/* Foreground Layer (Yellow Body) */}
            <div
              className="absolute inset-0 bg-yellow-400"
              style={{
                clipPath:
                  'polygon(100% 50%, 85% 60%, 100% 85%, 75% 85%, 65% 100%, 50% 85%, 35% 100%, 25% 85%, 0% 85%, 15% 60%, 0% 50%, 15% 40%, 0% 15%, 25% 15%, 35% 0%, 50% 15%, 65% 0%, 75% 15%, 100% 15%, 85% 40%)',
              }}
            ></div>

            {/* Text */}
            <span
              className="relative z-10 text-3xl md:text-5xl font-black italic text-black tracking-tighter rotate-[-6deg] drop-shadow-md"
              style={{ fontFamily: 'sans-serif' }}
            >
              {dodgeCutIn.text}
            </span>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex justify-between items-start pointer-events-auto w-full relative">
        {/* Left: Buttons & Stats (Vertical Layout) */}
        <div className="flex flex-col gap-2 items-start">
          
          {/* Buttons Row (Now on Top) */}
          <div className="flex gap-2">
            {/* Pause Button */}
            <button
              onClick={onTogglePause}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/90 backdrop-blur-md shadow-xl border border-white/50 text-gray-700 hover:bg-white transition-colors active:scale-95"
            >
              {gameState === GameState.RUNNING ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} />}
            </button>
            
            {/* Mute Button */}
            <button
              onClick={onToggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/90 backdrop-blur-md shadow-xl border border-white/50 text-gray-700 hover:bg-white transition-colors active:scale-95"
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>

          {/* Stats Panel - Compact Version (Now Below Buttons) */}
          <div className="bg-white/90 backdrop-blur-md px-2 py-2 rounded-xl shadow-xl border border-white/50 flex flex-col gap-1 min-w-[80px]">
            {/* Distance */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-0.5 gap-2">
              <MapPin size={14} className="text-gray-400 shrink-0" />
              <span className="font-mono font-bold text-gray-700 text-sm leading-none">{distance.toFixed(0)}m</span>
            </div>
            
            {/* Score */}
            <div className="flex items-center justify-between gap-2">
              <Trophy size={14} className="text-yellow-500 shrink-0" />
              <span className="font-mono font-bold text-blue-600 text-sm leading-none">{score}</span>
            </div>

            {/* Hearts */}
            <div className="flex gap-0.5 mt-1 items-center justify-center bg-gray-50 rounded-md p-1">
              {[0, 1, 2, 3].map((i) => {
                // Don't render the 4th heart slot unless we have 4 max lives (item)
                if (i === 3 && lives <= 3 && Math.ceil(lives) < 4) return null;
                
                const fillPct = Math.min(Math.max((lives - i) * 100, 0), 100);
                return (
                  <div
                    key={i}
                    className={`relative w-4 h-4 transition-transform duration-300 ${
                      isHit && Math.ceil(lives) === i + 1 ? 'scale-125' : ''
                    }`}
                  >
                    <Heart size={16} className="text-gray-300 fill-gray-300 absolute top-0 left-0" />
                    <div
                      className="absolute top-0 left-0 h-full overflow-hidden transition-all duration-300"
                      style={{ width: `${fillPct}%` }}
                    >
                      <Heart size={16} className="text-red-500 fill-red-500 min-w-[16px]" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Shield Indicator (Only if active) */}
            {shield > 0 && (
               <div className="flex items-center justify-center gap-1 mt-1 bg-blue-100/80 rounded px-1 py-0.5 animate-in slide-in-from-left">
                  <Shield size={12} className="text-blue-600 fill-blue-600" />
                  <span className="text-[10px] font-bold text-blue-800">ACTIVE</span>
               </div>
            )}
          </div>

          {/* Shield Activation Button */}
          {shieldInventoryCount > 0 && !hasUsedShield && shield === 0 && (
            <button
                onClick={onUseShield}
                className="mt-2 flex items-center justify-center gap-1 bg-blue-500/90 text-white rounded-xl p-2 shadow-lg border border-blue-400 backdrop-blur-md active:scale-95 transition-transform hover:bg-blue-600"
            >
                <Shield size={20} fill="currentColor" />
                <div className="flex flex-col leading-none items-start">
                    <span className="text-[9px] font-bold uppercase opacity-80">Use</span>
                    <span className="text-xs font-black">Shield</span>
                </div>
                <div className="bg-white text-blue-600 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center ml-1">
                    {shieldInventoryCount}
                </div>
            </button>
          )}

        </div>

        {/* Right: Combo */}
        <div className="flex flex-col items-end gap-2 pr-4">
          {/* Combo Display */}
          {combo > 1 && (
            <div className="flex flex-col items-end animate-bounce">
              <span
                className="text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-red-500 via-orange-500 to-yellow-500 drop-shadow-[4px_4px_0px_rgba(0,0,0,0.5)] transform -skew-x-12 stroke-white"
                style={{ WebkitTextStroke: '2px white' }}
              >
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

      {/* Dodge Button (Obstacles) */}
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