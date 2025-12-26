import React, { useState } from 'react';
import { X, LogOut, Wallet, User, Link, Copy, Check, PlusCircle, Bell, BellOff } from 'lucide-react';

interface UserInfoModalProps {
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string; fid?: number } | null;
  walletAddress: string | null;
  isAdded?: boolean;
  notificationDetails?: { token: string; url: string } | null;
  onAddMiniApp?: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onClose: () => void;
}

export const UserInfoModal: React.FC<UserInfoModalProps> = ({
  farcasterUser,
  walletAddress,
  isAdded,
  notificationDetails,
  onAddMiniApp,
  onConnect,
  onDisconnect,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const notificationsEnabled = !!notificationDetails;

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

        {/* Farcaster Add to Home & Notifications Actions */}
        <div className="flex flex-col gap-2 mb-4">
          {farcasterUser && !isAdded && onAddMiniApp && (
            <button
              onClick={onAddMiniApp}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <PlusCircle size={18} /> Add to Farcaster
            </button>
          )}

          {farcasterUser && isAdded && !notificationsEnabled && onAddMiniApp && (
            <button
              onClick={onAddMiniApp}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
            >
              <Bell size={18} /> Enable Notifications
            </button>
          )}
        </div>

        <div className="space-y-3 mb-8">
          {farcasterUser?.fid && (
             <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100">
               <span className="text-xs font-bold text-gray-400 uppercase">Farcaster FID</span>
               <span className="font-mono text-sm font-bold text-gray-700">{farcasterUser.fid}</span>
             </div>
          )}

          {farcasterUser && (
            <div className="bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-100">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase">Notifications</span>
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold uppercase ${notificationsEnabled ? 'text-green-600' : 'text-gray-400'}`}>
                {notificationsEnabled ? (
                  <>
                    <Check size={12} /> Enabled
                  </>
                ) : (
                  <>
                    <BellOff size={12} /> Disabled
                  </>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
             <div className="flex items-center justify-between mb-1">
               <div className="flex items-center gap-2">
                 <Wallet size={14} className="text-gray-400" />
                 <span className="text-xs font-bold text-gray-400 uppercase">Farcaster Wallet</span>
               </div>
               {walletAddress && (
                 <span className={`text-[10px] font-bold uppercase transition-colors ${copied ? 'text-green-500' : 'text-gray-300'}`}>
                   {copied ? 'Copied' : 'Click to copy'}
                 </span>
               )}
             </div>
             {walletAddress ? (
               <div 
                 onClick={handleCopy}
                 className="group cursor-pointer relative"
                 title="Click to copy"
               >
                 <div className="break-all font-mono text-xs text-gray-600 leading-tight group-hover:text-blue-600 transition-colors">
                   {walletAddress}
                 </div>
                 <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                   {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-blue-400" />}
                 </div>
               </div>
             ) : (
               <span className="text-xs text-gray-400 italic">No wallet detected from Farcaster</span>
             )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};