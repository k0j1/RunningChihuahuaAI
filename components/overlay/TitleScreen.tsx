
import React from 'react';
import { History, Trophy } from 'lucide-react';
import { TitleBackground } from '../TitleBackground';
import { WalletWidget } from './WalletWidget';

interface TitleScreenProps {
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
  walletAddress: string | null;
  onStartGame: () => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  farcasterUser,
  walletAddress,
  onStartGame,
  onShowHistory,
  onShowRanking,
  onConnectWallet,
  onDisconnectWallet,
}) => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 overflow-hidden">
      {/* Generative Background */}
      <TitleBackground />

      {/* Wallet Widget (Top Right) */}
      <WalletWidget
        farcasterUser={farcasterUser}
        walletAddress={walletAddress}
        onConnect={onConnectWallet}
        onDisconnect={onDisconnectWallet}
      />

      {/* Content */}
      <div className="relative z-10 text-center text-white p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl animate-fade-in-up max-w-lg w-full mx-4">
        <h1 className="text-6xl font-black mb-4 tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          RUNNING<br />CHIHUAHUA
        </h1>
        <p className="text-xl mb-4 font-light text-gray-100">Escape the Bosses!</p>

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
              <History size={20} /> HISTORY
            </button>
            <button
              onClick={onShowRanking}
              className="flex-1 px-4 py-3 bg-yellow-500/80 rounded-full text-lg font-bold shadow-lg hover:bg-yellow-500 transition-all flex items-center justify-center gap-2"
            >
              <Trophy size={20} /> RANKING
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
