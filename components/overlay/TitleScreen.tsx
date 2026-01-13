import React, { useState, useRef, useEffect } from 'react';
import { History, Trophy, PlayCircle, Zap, Volume2, VolumeX, Heart, Shield, ArrowUp, Sparkles, Gift, ShoppingCart, CheckCircle2, Info, HandMetal } from 'lucide-react';
import { TitleBackground } from '../TitleBackground';
import { WalletWidget } from './WalletWidget';
import { ItemType, UserInventory } from '../../types';

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
  
  // Long press logic refs
  const pressTimer = useRef<number | null>(null);
  const isGuest = !farcasterUser?.username;

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

  // Long press handlers for Guest Demo Mode
  const handlePressStart = () => {
    if (!isGuest) return;
    // 15 seconds long press to unlock demo
    pressTimer.current = window.setTimeout(() => {
      setIsDemoReady(true);
      // Optional: Vibrate to indicate unlock
      if (navigator.vibrate) navigator.vibrate(200);
    }, 15000);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const items = [
    { type: ItemType.MAX_HP, icon: <div className="relative"><Heart fill="currentColor" size={24} /><ArrowUp size={14} className="absolute -top-1 -right-1 text-white bg-red-600 rounded-full p-0.5 border border-white" strokeWidth={3} /></div>, label: "Vitality", color: "text-red-500", glow: "shadow-red-500/50", bgColor: "bg-red-500/20", borderColor: "border-red-500", selectable: true, description: "+1 Max Life", mode: "PASSIVE" },
    { type: ItemType.HEAL_ON_DODGE, icon: <div className="relative"><Heart className="text-pink-500 fill-pink-500" size={24} /><Sparkles size={14} className="absolute -top-1 -right-2 text-yellow-300 fill-yellow-300 animate-pulse" /></div>, label: "Recovery", color: "text-pink-500", glow: "shadow-pink-500/50", bgColor: "bg-pink-500/20", borderColor: "border-pink-500", selectable: true, description: "Heal on Dodge", mode: "PASSIVE" },
    // Shield is NOT selectable via toggle, logic is handled by inventory check in GameHUD
    { type: ItemType.SHIELD, icon: <div className="relative"><Shield className="text-blue-400 fill-blue-400" size={24} /></div>, label: "Shield", color: "text-blue-400", glow: "shadow-blue-500/50", bgColor: "bg-blue-500/20", borderColor: "border-blue-500", selectable: false, description: "Manual Guard", mode: "ACTION" }
  ];

  const equippedPassiveItems = items.filter(item => item.selectable && selectedItems.includes(item.type));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-50 overflow-hidden">
      <TitleBackground />
      <WalletWidget farcasterUser={farcasterUser} walletAddress={walletAddress} onConnect={onConnectWallet} onShowProfile={onShowProfile} />
      
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button onClick={onToggleMute} className="bg-gray-800/80 p-3 rounded-full backdrop-blur-md border border-gray-600 text-white hover:bg-gray-700 transition-all active:scale-95">
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      <div className="relative z-10 text-center text-white p-6 bg-black/60 backdrop-blur-md rounded-[2.5rem] border border-white/10 shadow-2xl animate-fade-in-up max-w-lg w-full mx-4 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        <h1 className="text-5xl md:text-6xl font-black mb-4 tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 leading-none">
          RUNNING<br />CHIHUAHUA
        </h1>

        <div className="mb-6">
           <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
             <div className="h-[1px] w-8 bg-gray-700" />
             Preparation
             <div className="h-[1px] w-8 bg-gray-700" />
           </div>
           <div className="flex gap-3 justify-center">
             {items.map((item) => {
                const count = (inventory && inventory[item.type]) || 0;
                // Shield is never "selected" in the toggle sense, but we show it as active if owned
                const isPassiveSelected = item.selectable && selectedItems.includes(item.type);
                const isShieldAvailable = !item.selectable && item.type === ItemType.SHIELD && count > 0;
                
                return (
                  <button 
                    key={item.type} 
                    onClick={() => { if (count > 0 && item.selectable) toggleItem(item.type); }} 
                    disabled={count <= 0 || !item.selectable} 
                    className={`relative flex flex-col items-center justify-center p-2 rounded-2xl border-2 transition-all w-24 h-24 group ${
                      isPassiveSelected 
                        ? `${item.bgColor} ${item.borderColor} scale-105 shadow-2xl ${item.glow} z-20` 
                        : isShieldAvailable
                          ? 'bg-gray-800/60 border-blue-500/50 hover:border-blue-400'
                          : count > 0 
                            ? 'bg-gray-800/40 border-gray-700 hover:border-gray-500' 
                            : 'bg-gray-900/40 border-gray-800 opacity-40 grayscale cursor-not-allowed'
                    }`}
                  >
                     <div className={`${item.color} mb-1 transition-transform group-hover:scale-110 duration-300`}>{item.icon}</div>
                     <span className={`text-[10px] font-black uppercase tracking-tight ${isPassiveSelected || isShieldAvailable ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                     
                     <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-black shadow-md border border-gray-100">
                       x{count}
                     </div>

                     {/* Status Badge */}
                     {isPassiveSelected && (
                       <div className="absolute -bottom-2 px-2 py-0.5 rounded-md bg-white text-[8px] font-black text-black shadow-lg animate-in zoom-in">
                         ACTIVE
                       </div>
                     )}
                     {isShieldAvailable && (
                       <div className="absolute -bottom-3 px-1 py-0.5 rounded-md bg-blue-500 text-[7px] font-black text-white shadow-lg leading-none w-full text-center">
                         IN-GAME USE
                       </div>
                     )}
                     
                     {isPassiveSelected && (
                       <div className="absolute inset-0 rounded-2xl border-2 border-white/40 animate-pulse pointer-events-none" />
                     )}
                  </button>
                );
             })}
           </div>
        </div>

        {/* Loadout Summary */}
        {equippedPassiveItems.length > 0 && (
          <div className="mb-6 bg-white/5 rounded-2xl p-3 border border-white/10 animate-in slide-in-from-bottom-2">
             <div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-2 flex items-center justify-center gap-1">
               <CheckCircle2 size={12} /> Boosts Active
             </div>
             <div className="flex flex-wrap justify-center gap-2">
                {equippedPassiveItems.map(item => (
                  <div key={item.type} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm bg-gray-900 border-gray-600`}>
                    <div className={item.color}>{React.cloneElement(item.icon as React.ReactElement, { size: 14 })}</div>
                    <span className="text-[9px] font-bold text-white uppercase">{item.description}</span>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* Bonus & Shop Buttons */}
        <div className="flex gap-3 mb-6 w-full">
            <button onClick={onOpenLoginBonus} disabled={loginBonusClaimed} className={`flex-1 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${loginBonusClaimed ? 'bg-gray-800/50 text-gray-500 border border-gray-700' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse'}`}>
               <Gift size={18} />{loginBonusClaimed ? bonusResetTimeLeft : "DAILY BONUS"}
            </button>
            <button onClick={onOpenShop} className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md hover:brightness-110 transition-all text-white active:scale-95 border-b-4 border-indigo-800">
               <ShoppingCart size={18} /> SHOP
            </button>
        </div>

        {!isGuest && (
          <div className="flex flex-col items-center mb-6 bg-gray-800/60 rounded-2xl p-3 border border-gray-700 w-full">
             <div className="flex items-center gap-2 mb-2">
               <Zap size={18} className="text-yellow-400 fill-yellow-400" />
               {timeLeft && <div className="text-[9px] text-yellow-400 font-black tracking-widest bg-black/50 px-2 py-1 rounded-md">REFUELING IN {timeLeft}</div>}
             </div>
             <div className="flex gap-1.5">
                {[...Array(maxStamina)].map((_, i) => <div key={i} className={`w-10 h-2.5 rounded-full transition-all duration-500 ${i < stamina ? 'bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-gray-700'}`} />)}
             </div>
          </div>
        )}

        <div className="flex flex-col gap-3 w-full">
          <div className="relative group">
            {selectedItems.length > 0 && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                READY WITH {selectedItems.length} PASSIVE BOOSTS!
              </div>
            )}
            <button 
              onMouseDown={handlePressStart}
              onMouseUp={handlePressEnd}
              onMouseLeave={handlePressEnd}
              onTouchStart={handlePressStart}
              onTouchEnd={handlePressEnd}
              onClick={() => onStartGame(isDemoReady)} 
              disabled={stamina <= 0 && !isGuest && !isDemoReady}
              className={`w-full px-8 py-5 rounded-[1.5rem] text-2xl font-black shadow-xl transition-all flex flex-col items-center justify-center gap-0 group active:scale-95 select-none ${
                stamina > 0 || isGuest || isDemoReady
                ? isDemoReady ? 'bg-purple-600 border-b-4 border-purple-800' : 'bg-gradient-to-b from-green-400 to-emerald-600 hover:brightness-110 border-b-4 border-emerald-800' 
                : 'bg-gray-700 border-b-4 border-gray-800 opacity-80 cursor-not-allowed'
              }`}
            >
               <div className="flex items-center gap-2">
                 {isDemoReady ? <PlayCircle size={28} className="animate-spin" /> : <Zap size={28} className="fill-current" />}
                 <span className="italic tracking-tighter uppercase">{isDemoReady ? 'DEMO START' : 'START RUNNING'}</span>
               </div>
               {!isGuest && !isDemoReady && (
                 <span className="text-[10px] opacity-80 font-bold uppercase tracking-widest mt-0.5">Consume 1 Stamina</span>
               )}
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={onShowHistory} className="flex-1 px-4 py-3 bg-white/5 rounded-2xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors border border-white/10"><History size={16}/> HISTORY</button>
            <button onClick={onShowRanking} className="flex-1 px-4 py-3 bg-white/5 rounded-2xl text-[10px] font-black tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-colors border border-white/10"><Trophy size={16}/> RANKING</button>
          </div>
        </div>
      </div>
      
      {/* Background decoration text */}
      <div className="absolute bottom-4 text-white/10 text-[10px] font-black tracking-[0.5em] uppercase pointer-events-none">
        Ready to Dash?
      </div>
    </div>
  );
};