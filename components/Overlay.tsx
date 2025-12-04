import React from 'react';
import { DogThought, GameState } from '../types';
import { Play, Pause, FastForward, MessageCircle, Sun, Moon } from 'lucide-react';

interface OverlayProps {
  gameState: GameState;
  speed: number;
  dayTime: boolean;
  thought: DogThought | null;
  onTogglePause: () => void;
  onSpeedChange: (speed: number) => void;
  onToggleDayTime: () => void;
  onAskThought: () => void;
  isThinking: boolean;
}

export const Overlay: React.FC<OverlayProps> = ({
  gameState,
  speed,
  dayTime,
  thought,
  onTogglePause,
  onSpeedChange,
  onToggleDayTime,
  onAskThought,
  isThinking
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
      
      {/* Header / Stats */}
      <div className="flex justify-between items-start pointer-events-auto">
        <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/50">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Running Chihuahua</h1>
          <p className="text-sm text-gray-600">Speed: {(speed * 10).toFixed(1)} km/h</p>
        </div>
        
        <button 
          onClick={onToggleDayTime}
          className={`p-3 rounded-full shadow-lg transition-colors duration-300 ${dayTime ? 'bg-yellow-100 text-orange-500 hover:bg-yellow-200' : 'bg-indigo-900 text-yellow-300 hover:bg-indigo-800'}`}
        >
          {dayTime ? <Sun size={24} /> : <Moon size={24} />}
        </button>
      </div>

      {/* Thought Bubble */}
      <div className="flex justify-center items-end mb-8 pointer-events-auto">
        <div className="relative max-w-md w-full">
            {/* The Dog's thought display */}
            {(thought || isThinking) && (
              <div className="mb-4 transform transition-all duration-500 ease-out origin-bottom">
                <div className="bg-white p-6 rounded-3xl rounded-bl-none shadow-2xl border-2 border-gray-100 relative animate-fade-in-up">
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
                  <div className="absolute -bottom-3 left-0 w-6 h-6 bg-white border-b-2 border-r-2 border-gray-100 transform skew-x-12 rotate-45"></div>
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
                    className="w-32 accent-blue-600 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                   />
                </div>
              </div>

              <button 
                onClick={onAskThought}
                disabled={isThinking || gameState !== GameState.RUNNING}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all shadow-lg
                  ${isThinking || gameState !== GameState.RUNNING
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:shadow-pink-500/30 active:scale-95'
                  }`}
              >
                <MessageCircle size={20} />
                <span>What's on your mind?</span>
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};