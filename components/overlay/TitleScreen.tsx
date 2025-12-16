
import React, { useState, useRef, useEffect } from 'react';
import { History, Trophy, FileText, PlayCircle } from 'lucide-react';
import { TitleBackground } from '../TitleBackground';
import { WalletWidget } from './WalletWidget';

interface TitleScreenProps {
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
  walletAddress: string | null;
  onStartGame: (isDemo?: boolean) => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onConnectWallet: () => void;
  onShowProfile: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  farcasterUser,
  walletAddress,
  onStartGame,
  onShowHistory,
  onShowRanking,
  onConnectWallet,
  onShowProfile,
}) => {
  const [isDemoReady, setIsDemoReady] = useState(false);
  const pressTimer = useRef<number | null>(null);

  // Check if guest (no Farcaster and no Wallet)
  const isGuest = !farcasterUser && !walletAddress;

  const handlePressStart = () => {
    if (!isGuest) return;
    
    // Start 15s timer
    pressTimer.current = window.setTimeout(() => {
      setIsDemoReady(true);
    }, 15000);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (pressTimer.current) clearTimeout(pressTimer.current);
    };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 overflow-hidden">
      {/* Generative Background */}
      <TitleBackground />

      {/* Wallet Widget (Top Right) */}
      <WalletWidget
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onConnect={onConnectWallet}
        onShowProfile={onShowProfile}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl animate-fade-in-up max-w-lg w-full mx-4">
        <h1 className="text-6xl font-black mb-4 tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          RUNNING<br />CHIHUAHUA
        </h1>
        <p className="text-xl mb-4 font-light text-gray-100">Escape the Bosses!</p>

        <div className="flex flex-col gap-4">
          {isDemoReady ? (
            <button
              onClick={() => onStartGame(true)}
              className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full text-2xl font-black shadow-lg hover:scale-105 hover:shadow-purple-500/50 transition-all active:scale-95 flex items-center justify-center gap-2 animate-pulse"
            >
              <PlayCircle /> DEMO PLAY
            </button>
          ) : (
            <button
              onClick={() => onStartGame(false)}
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full text-2xl font-bold shadow-lg hover:scale-105 hover:shadow-blue-500/50 transition-all active:scale-95 select-none"
            >
              START RUNNING
            </button>
          )}

          <div className="flex gap-4">
            <button
              onClick={onShowHistory}
              className="flex-1 px-4 py-3 bg-white/20 rounded-full text-lg font-bold shadow-lg hover:bg-white/30 transition-all flex items-center justify-center gap-2"
            >
              <History size={20} /> HISTORY
            </button>
            <button
              onClick={onShowRanking}
              className="flex-1 px-4 py-3 bg-yellow-500/80 rounded-full text-lg font-bold shadow-lg hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
            >
              <Trophy size={20} /> RANKING
            </button>
          </div>

          <a 
            href="https://k0j1.github.io/Running-Chihuahua---Light-Paper/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center gap-2 text-sm text-blue-300 hover:text-blue-100 transition-colors"
          >
            <FileText size={16} />
            <span>Read Whitepaper</span>
          </a>
        </div>
      </div>
    </div>
  );
};
