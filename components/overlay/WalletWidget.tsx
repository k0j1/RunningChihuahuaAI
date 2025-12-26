import React from 'react';
import { Wallet } from 'lucide-react';

interface WalletWidgetProps {
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
  walletAddress: string | null;
  onConnect: () => void;
  onShowProfile: () => void;
}

export const WalletWidget: React.FC<WalletWidgetProps> = ({
  farcasterUser,
  walletAddress,
  onConnect,
  onShowProfile,
}) => {
  // If Farcaster user exists, show Farcaster info (Primary UI)
  if (farcasterUser) {
    return (
      <div 
        onClick={onShowProfile}
        className="absolute top-4 right-4 flex items-center gap-2 bg-purple-600/80 p-2 rounded-full backdrop-blur-md shadow-lg border border-purple-400 z-50 cursor-pointer hover:bg-purple-500 transition-transform active:scale-95"
      >
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

  // Fallback for non-FC users: Show nothing (Connect button removed as requested)
  return null;
};