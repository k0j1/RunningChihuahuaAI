
import React from 'react';
import { Wallet } from 'lucide-react';

interface WalletWidgetProps {
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletWidget: React.FC<WalletWidgetProps> = ({
  farcasterUser,
  walletAddress,
  onConnect,
  onDisconnect,
}) => {
  // If Farcaster user exists, show Farcaster info (Priority 1)
  if (farcasterUser) {
    return (
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-purple-600/80 p-2 rounded-full backdrop-blur-md shadow-lg border border-purple-400 z-50">
        {farcasterUser.pfpUrl ? (
          <img src={farcasterUser.pfpUrl} className="w-8 h-8 rounded-full border border-white" alt="pfp" />
        ) : (
          <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center text-xs font-bold text-purple-700">
            {farcasterUser.username?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col pr-2">
          <span className="text-xs font-bold text-white leading-none">@{farcasterUser.username}</span>
        </div>
      </div>
    );
  }

  // If Wallet connected, show address (Priority 2)
  if (walletAddress) {
    const shortAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    return (
      <div
        onClick={onDisconnect}
        className="absolute top-4 right-4 flex items-center gap-2 bg-blue-600/80 p-1 pr-3 rounded-full backdrop-blur-md shadow-lg border border-blue-400 z-50 cursor-pointer hover:bg-blue-500 transition-colors"
        title="Click to disconnect"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center border border-white/20">
          <Wallet size={14} className="text-white" />
        </div>
        <span className="text-xs font-bold text-white font-mono">{shortAddr}</span>
      </div>
    );
  }

  // Not connected, show Connect Button (Priority 3)
  return (
    <button
      onClick={onConnect}
      className="absolute top-4 right-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full font-bold shadow-lg border border-orange-400 z-50 transition-all active:scale-95 flex items-center gap-2 text-sm"
    >
      <Wallet size={18} /> Connect
    </button>
  );
};
