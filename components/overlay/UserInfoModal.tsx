
import React from 'react';
import { X, LogOut, Wallet, User, Link } from 'lucide-react';

interface UserInfoModalProps {
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string; fid?: number } | null;
  walletAddress: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const UserInfoModal: React.FC<UserInfoModalProps> = ({
  farcasterUser,
  walletAddress,
  onConnect,
  onDisconnect,
  onClose,
}) => {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Player Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col items-center mb-6">
          {farcasterUser?.pfpUrl ? (
            <img src={farcasterUser.pfpUrl} className="w-24 h-24 rounded-full border-4 border-yellow-400 shadow-lg mb-3" alt="pfp" />
          ) : (
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-lg mb-3">
              <User size={40} className="text-white" />
            </div>
          )}
          <h4 className="text-2xl font-bold text-gray-900">
            {farcasterUser?.displayName || "Guest Runner"}
          </h4>
          <span className="text-gray-500 font-medium">@{farcasterUser?.username || "guest"}</span>
        </div>

        <div className="space-y-3 mb-8">
          {farcasterUser?.fid && (
             <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100">
               <span className="text-xs font-bold text-gray-400 uppercase">Farcaster FID</span>
               <span className="font-mono text-sm font-bold text-gray-700">{farcasterUser.fid}</span>
             </div>
          )}

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
             <div className="flex items-center justify-between mb-1">
               <div className="flex items-center gap-2">
                 <Wallet size={14} className="text-gray-400" />
                 <span className="text-xs font-bold text-gray-400 uppercase">Wallet Address</span>
               </div>
               {!walletAddress && (
                 <button 
                   onClick={onConnect}
                   className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold hover:bg-blue-200 transition-colors flex items-center gap-1"
                 >
                   <Link size={10} /> Link
                 </button>
               )}
             </div>
             {walletAddress ? (
               <div className="break-all font-mono text-xs text-gray-600 leading-tight">
                 {walletAddress}
               </div>
             ) : (
               <span className="text-xs text-gray-400 italic">No wallet connected</span>
             )}
          </div>
        </div>

        <button
          onClick={() => {
            onDisconnect();
            onClose();
          }}
          className="w-full py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={18} /> Disconnect
        </button>
      </div>
    </div>
  );
};
