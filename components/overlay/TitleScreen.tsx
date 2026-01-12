
import React, { useState, useRef, useEffect } from 'react';
import { History, Trophy, FileText, PlayCircle, Zap, Clock, Volume2, VolumeX, Heart, Shield, ArrowUp, Sparkles, PlusCircle, Gift, ShoppingCart } from 'lucide-react';
import { TitleBackground } from '../TitleBackground';
import { WalletWidget } from './WalletWidget';
import { ItemType, UserInventory, ClaimResult } from '../../types';

interface TitleScreenProps {
  farcasterUser: { username?: string; displayName?: string; pfpUrl?: string } | null;
  walletAddress: string | null;
  isAdded?: boolean;
  onAddMiniApp?: () => void;
  onStartGame: (isDemo?: boolean) => void;
  onShowHistory: () => void;
  onShowRanking: () => void;
  onOpenShop: () => void;
  onConnectWallet: () => void;
  onShowProfile: () => void;
  stamina: number;
  maxStamina: number;
  nextRecoveryTime: number | null;
  selectedItems: ItemType[];
  toggleItem: (item: ItemType) => void;
  inventory: UserInventory;
  onOpenLoginBonus: () => void;
  loginBonusClaimed: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  farcasterUser,
  walletAddress,
  isAdded,
  onAddMiniApp,
  onStartGame,
  onShowHistory,
  onShowRanking,
  onOpenShop,
  onConnectWallet,
  onShowProfile,
  stamina,
  maxStamina,
  nextRecoveryTime,
  selectedItems,
  toggleItem,
  inventory,
  onOpenLoginBonus,
  loginBonusClaimed,
  isMuted,
  onToggleMute
}) => {
  const [isDemoReady, setIsDemoReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [bonusResetTimeLeft, setBonusResetTimeLeft] = useState("");
  const pressTimer = useRef<number | null>(null);
  const isGuest = !farcasterUser;

  const handlePressStart = () => {
    if (!isGuest) return;
    pressTimer.current = window.setTimeout(() => setIsDemoReady(true), 15000);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null; }
  };

  useEffect(() => {
    if (!nextRecoveryTime) { setTimeLeft(""); return; }
    const interval = setInterval(() => {
      const diff = nextRecoveryTime - Date.now();
      if (diff <= 0) setTimeLeft("");
      else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [nextRecoveryTime]);

  useEffect(() => {
    if (!loginBonusClaimed) { setBonusResetTimeLeft(""); return; }
    const interval = setInterval(() => {
        const now = new Date();
        const nextReset = new Date(now);
        nextReset.setUTCHours(24, 0, 0, 0);
        const diff = nextReset.getTime() - now.getTime();
        if (diff <= 0) setBonusResetTimeLeft("00:00:00");
        else {
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setBonusResetTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [loginBonusClaimed]);

  const items = [
    { type: ItemType.MAX_HP, icon: <div className="relative"><Heart fill="currentColor" size={24} /><ArrowUp size={14} className="absolute -top-1 -right-1 text-white bg-red-600 rounded-full p-0.5 border border-white" strokeWidth={3} /></div>, label: "Vitality", color: "text-red-500", bgColor: "bg-red-500/20", borderColor: "border-red-500", selectable: true },
    { type: ItemType.HEAL_ON_DODGE, icon: <div className="relative"><Heart className="text-pink-500 fill-pink-500" size={24} /><Sparkles size={14} className="absolute -top-1 -right-2 text-yellow-300 fill-yellow-300 animate-pulse" /></div>, label: "Recovery", color: "text-pink-500", bgColor: "bg-pink-500/20", borderColor: "border-pink-500", selectable: true },
    { type: ItemType.SHIELD, icon: <div className="relative"><Shield className="text-blue-400 fill-blue-400" size={24} /><div className="absolute inset-0 bg-blue-400/20 blur-md rounded-full"></div></div>, label: "Shield", color: "text-blue-400", bgColor: "bg-blue-500/20", borderColor: "border-blue-500", selectable: false }
  ];

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 overflow-hidden">
      <TitleBackground />
      <WalletWidget farcasterUser={farcasterUser} walletAddress={walletAddress} onConnect={onConnectWallet} onShowProfile={onShowProfile} />
      
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button onClick={onToggleMute} className="bg-gray-800/80 p-3 rounded-full backdrop-blur-md border border-gray-600 text-white hover:bg-gray-700 transition-all active:scale-95">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      <div className="relative z-10 text-center text-white p-6 bg-black/40 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl animate-fade-in-up max-w-lg w-full mx-4">
        <h1 className="text-6xl font-black mb-1 tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          RUNNING<br />CHIHUAHUA
        </h1>
        
        <div className="mb-6">
           <div className="flex gap-2 justify-center">
             {items.map((item) => {
                const count = (inventory && inventory[item.type]) || 0;
                const isSelected = item.selectable && selectedItems.includes(item.type);
                return (
                  <button key={item.type} onClick={() => { if (count > 0 && item.selectable) toggleItem(item.type); }} disabled={count <= 0 || !item.selectable} className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all w-24 h-24 ${isSelected ? `${item.bgColor} ${item.borderColor} scale-105 shadow-xl` : count > 0 ? 'bg-gray-800/60 border-gray-600' : 'bg-gray-900/40 border-gray-800 opacity-50 grayscale cursor-not-allowed'}`}>
                     <div className={`${item.color} mb-1`}>{item.icon}</div>
                     <span className="text-xs font-bold">{item.label}</span>
                     <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-white text-black">x{count}</div>
                  </button>
                );
             })}
           </div>
        </div>

        {farcasterUser && (
          <div className="flex flex-col items-center mb-6 bg-gray-800/80 rounded-xl p-3 border border-gray-600">
             <div className="flex items-center gap-2 mb-2">
               <Zap size={18} className="text-yellow-400 fill-yellow-400" />
               {timeLeft && <div className="text-xs text-yellow-400 font-mono bg-black/50 px-2 py-0.5 rounded">Recovering in {timeLeft}</div>}
             </div>
             <div className="flex gap-1">
                {[...Array(maxStamina)].map((_, i) => <div key={i} className={`w-8 h-2 rounded-full ${i < stamina ? 'bg-yellow-400 shadow-xl' : 'bg-gray-600'}`} />)}
             </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <button onClick={onOpenLoginBonus} disabled={loginBonusClaimed} className={`flex-1 py-3 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-md ${loginBonusClaimed ? 'bg-gray-800/50 text-gray-500 border border-gray-700' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse'}`}>
               <Gift size={20} />{loginBonusClaimed ? bonusResetTimeLeft : "LOGIN BONUS"}
            </button>
            <button onClick={onOpenShop} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full font-bold flex items-center justify-center gap-2 shadow-md hover:scale-105 transition-all text-white">
               <ShoppingCart size={20} /> SHOP
            </button>
          </div>

          <button onClick={() => onStartGame(isDemoReady)} className={`px-8 py-4 rounded-full text-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 ${stamina > 0 || !farcasterUser ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105' : 'bg-gray-600 opacity-80'}`}>
             {isDemoReady ? 'DEMO PLAY' : 'START RUNNING'}
          </button>

          <div className="flex gap-3">
            <button onClick={onShowHistory} className="flex-1 px-4 py-3 bg-white/10 rounded-full text-sm font-bold flex items-center justify-center gap-2"><History size={16}/> HISTORY</button>
            <button onClick={onShowRanking} className="flex-1 px-4 py-3 bg-white/10 rounded-full text-sm font-bold flex items-center justify-center gap-2"><Trophy size={16}/> RANKING</button>
          </div>
        </div>
      </div>
    </div>
  );
};
