
import React from 'react';
import { Crown, Star } from 'lucide-react';

interface GameClearScreenProps {
  score: number;
}

export const GameClearScreen: React.FC<GameClearScreenProps> = ({ score }) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-50">
      <div className="animate-in zoom-in spin-in-1 duration-1000 flex flex-col items-center justify-center">
        
        {/* Main Text */}
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-orange-400 to-yellow-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] stroke-white tracking-tighter text-center mb-4">
          GAME<br/>CLEAR!!
        </h1>

        {/* Bonus Info */}
        <div className="bg-black/60 backdrop-blur-md p-6 rounded-3xl border-4 border-yellow-400 flex flex-col items-center animate-bounce-in delay-500 shadow-2xl">
          <Crown className="w-16 h-16 text-yellow-400 animate-bounce mb-2 drop-shadow-lg" />
          <div className="text-2xl text-yellow-200 font-bold uppercase tracking-widest mb-1">
             Bonus Score
          </div>
          <div className="text-5xl font-black text-white font-mono drop-shadow-md">
             +20,000
          </div>
        </div>

        {/* Confetti / Stars */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
             {[...Array(12)].map((_, i) => (
                 <Star 
                   key={i}
                   className={`absolute text-yellow-300 animate-ping`}
                   style={{
                       top: `${50 + (Math.random() - 0.5) * 60}%`,
                       left: `${50 + (Math.random() - 0.5) * 60}%`,
                       animationDuration: `${0.5 + Math.random()}s`,
                       animationDelay: `${Math.random()}s`,
                       width: `${20 + Math.random() * 40}px`,
                       height: `${20 + Math.random() * 40}px`
                   }}
                 />
             ))}
        </div>
      </div>
    </div>
  );
};
