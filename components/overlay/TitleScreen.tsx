
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { History, Trophy, PlayCircle, Zap, Volume2, VolumeX, Heart, Shield, ArrowUp, Sparkles, Gift, ShoppingCart, CheckCircle2, Info, HandMetal, ScrollText, Database, Clock } from 'lucide-react';
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
  onShowAdmin: () => void;
}

const ADMIN_WALLETS = [
  '0x9eB566Cc59e3e9D42209Dd2d832740a6A74f5F23',
  '0x7b9200739d77aB2C44c76ba1992882a8850ADCa9'
];

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
  onToggleMute,
  onShowAdmin
}) => {
  const [isDemoReady, setIsDemoReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [bonusResetTimeLeft, setBonusResetTimeLeft] = useState("");
  
  // Long press logic refs
  const pressTimer = useRef<number | null>(null);
  const isGuest = !farcasterUser?.username;

  // Admin Check Logic
  const isAdmin = useMemo(() => {
    // 0. Manual Override via URL (?admin=1)
    if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('admin') === '1') return true;
    }

    // 1. Check Wallet Allowlist
    if (walletAddress && ADMIN_WALLETS.some(addr => addr.toLowerCase() === walletAddress.toLowerCase())) {
        return true;
    }
    
    // 2. Check Environment
    try {
        // @ts-ignore
        if (import.meta && import.meta.env && import.meta.env.DEV) return true;
    } catch (e) { }

    if (typeof window !== 'undefined') {
        const h = window.location.hostname;
        return (
            h.includes('googleusercontent.com') || 
            h.includes('localhost') || 
            h.includes('127.0.0.1') ||
            h.includes('aistudio') || 
            h.includes('web.app')
        );
    }
    return false;
  }, [walletAddress]);

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

  const handlePressStart = () => {
    if (!isGuest) return;
    pressTimer.current = window.setTimeout(() => {
      setIsDemoReady(true);
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

      {/* Main Card Container - Fixed size frame with clipping for decorations */}
      <div className="relative z-10 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col bg-black/60 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] border border-white/10 shadow-2xl animate-fade-in-up overflow-hidden">
        
        {/* Decorative elements (Clipped by parent overflow-hidden) */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto overflow-x-hidden p-4 md:p-6 w-full h-full scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
          
          <h1 className="text-4xl md:text-6xl font-black mb-3 md:mb-4 tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 leading-none text-center">
            RUNNING<br />CHIHUAHUA
          </h1>

          <div className="mb-4 md:mb-6">
             <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 md:mb-3 flex items-center justify-center gap-2">
               <div className="h-[1px] w-8 bg-gray-700" />
               Preparation
               <div className="h-[1px] w-8 bg-gray-700" />
             </div>
             {/* Added flex-wrap to prevent horizontal overflow on very small screens */}
             <div className="flex gap-2 md:gap-3 justify-center flex-wrap">
               {items.map((item) => {
                  const count = (inventory && inventory[item.type]) || 0;
                  const isPassiveSelected = item.selectable && selectedItems.includes(item.type);
                  const isShieldAvailable = !item.selectable && item.type === ItemType.SHIELD && count > 0;
                  
                  return (
                    <button 
                      key={item.type} 
                      onClick={() => { if (count > 0 && item.selectable) toggleItem(item.type); }} 
                      disabled={count <= 0 || !item.selectable} 
                      className={`relative flex flex-col items-center justify-center p-1.5 md:p-2 rounded-2xl border-2 transition-all w-20 h-20 md:w-24 md:h-24 group ${
                        isPassiveSelected 
                          ? `${item.bgColor} ${item.borderColor} scale-105 shadow-2xl ${item.glow} z-20` 
                          : isShieldAvailable
                            ? 'bg-gray-800/60 border-blue-500/50 hover:border-blue-400'
                            : count > 0 
                              ? 'bg-gray-800/40 border-gray-700 hover:border-gray-500' 
                              : 'bg-gray-900/40 border-gray-800 opacity-40 grayscale cursor-not-allowed'
                      }`}
                    >
                       <div className={`${item.color} mb-1 transition-transform group-hover:scale-110 duration-300 transform scale-75 md:scale-100`}>{item.icon}</div>
                       <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-tight ${isPassiveSelected || isShieldAvailable ? 'text-white' : 'text-gray-400'}`}>{item.label}</span>
                       
                       <div className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-black bg-white text-black shadow-md border border-gray-100">
                         x{count}
                       </div>

                       {isPassiveSelected && (
                         <div className="absolute -bottom-2 px-1.5 py-0.5 rounded-md bg-white text-[7px] md:text-[8px] font-black text-black shadow-lg animate-in zoom-in whitespace-nowrap">
                           ACTIVE
                         </div>
                       )}
                       {isShieldAvailable && (
                         <div className="absolute -bottom-3 px-1 py-0.5 rounded-md bg-blue-500 text-[6px] md:text-[7px] font-black text-white shadow-lg leading-none w-full text-center whitespace-nowrap">
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

          {equippedPassiveItems.length > 0 && (
            <div className="mb-4 md:mb-6 bg-white/5 rounded-2xl p-2 md:p-3 border border-white/10 animate-in slide-in-from-bottom-2">
               <div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-1 md:mb-2 flex items-center justify-center gap-1">
                 <CheckCircle2 size={12} /> Boosts Active
               </div>
               <div className="flex flex-wrap justify-center gap-2">
                  {equippedPassiveItems.map(item => (
                    <div key={item.type} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border shadow-sm bg-gray-900 border-gray-600`}>
                      <div className={item.color}><div className="transform scale-75">{item.icon}</div></div>
                      <span className="text-[8px] md:text-[9px] font-bold text-white uppercase">{item.description}</span>
                    </div>
                  ))}
               </div>
            </div>
          )}

          <div className="flex gap-2 md:gap-3 mb-4 md:mb-6 w-full items-stretch">
              <button 
                onClick={onOpenLoginBonus} 
                disabled={loginBonusClaimed} 
                className={`flex-1 py-2 rounded-2xl font-black flex flex-col items-center justify-center gap-0.5 md:gap-1 transition-all shadow-md active:scale-95 border-b-4 ${
                  loginBonusClaimed 
                    ? 'bg-gray-800/50 text-gray-500 border-gray-700 cursor-default' 
                    : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white animate-pulse border-orange-700'
                }`}
              >
                 {loginBonusClaimed ? (
                   <>
                     <div className="flex items-center gap-1 text-[9px] md:text-[10px] uppercase">
                        <Clock size={10} className="md:w-3 md:h-3" /> Next Bonus
                     </div>
                     <span className="text-[10px] md:text-xs font-mono">{bonusResetTimeLeft || "--:--:--"}</span>
                   </>
                 ) : (
                   <>
                     <div className="flex items-center gap-1 text-[10px] md:text-xs uppercase tracking-tight">
                        <Gift size={14} className="md:w-4 md:h-4" /> DAILY BONUS
                     </div>
                     <div className="text-[8px] md:text-[9px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                        100 $CHH & Item
                     </div>
                   </>
                 )}
              </button>
              <button onClick={onOpenShop} className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-0.5 md:gap-1 shadow-md hover:brightness-110 transition-all text-white active:scale-95 border-b-4 border-indigo-800">
                 <div className="flex items-center gap-1">
                   <ShoppingCart size={16} className="md:w-[18px] md:h-[18px]" /> SHOP
                 </div>
                 <div className="text-[8px] md:text-[9px] opacity-70 font-bold uppercase">
                   Buy Items
                 </div>
              </button>
          </div>

          {!isGuest && (
            <div className="flex flex-col items-center mb-4 md:mb-6 bg-gray-800/60 rounded-2xl p-2 md:p-3 border border-gray-700 w-full">
               <div className="flex items-center gap-2 mb-1 md:mb-2">
                 <Zap size={16} className="text-yellow-400 fill-yellow-400 md:w-[18px] md:h-[18px]" />
                 {timeLeft && <div className="text-[8px] md:text-[9px] text-yellow-400 font-black tracking-widest bg-black/50 px-2 py-0.5 md:py-1 rounded-md">REFUELING IN {timeLeft}</div>}
               </div>
               <div className="flex gap-1">
                  {[...Array(maxStamina)].map((_, i) => <div key={i} className={`w-8 md:w-10 h-2 md:h-2.5 rounded-full transition-all duration-500 ${i < stamina ? 'bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'bg-gray-700'}`} />)}
               </div>
            </div>
          )}

          <div className="flex flex-col gap-2 md:gap-3 w-full pb-2">
            <div className="relative group">
              {selectedItems.length > 0 && (
                <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 z-30 bg-yellow-400 text-black text-[8px] md:text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-bounce whitespace-nowrap">
                  READY WITH {selectedItems.length} BOOSTS!
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
                className={`w-full px-6 py-4 md:px-8 md:py-5 rounded-[1.5rem] text-xl md:text-2xl font-black shadow-xl transition-all flex flex-col items-center justify-center gap-0 group active:scale-95 select-none ${
                  stamina > 0 || isGuest || isDemoReady
                  ? isDemoReady ? 'bg-purple-600 border-b-4 border-purple-800' : 'bg-gradient-to-b from-green-400 to-emerald-600 hover:brightness-110 border-b-4 border-emerald-800' 
                  : 'bg-gray-700 border-b-4 border-gray-800 opacity-80 cursor-not-allowed'
                }`}
              >
                 <div className="flex items-center gap-2">
                   {isDemoReady ? <PlayCircle size={24} className="animate-spin md:w-7 md:h-7" /> : <Zap size={24} className="fill-current md:w-7 md:h-7" />}
                   <span className="italic tracking-tighter uppercase">{isDemoReady ? 'DEMO START' : 'START RUNNING'}</span>
                 </div>
                 {!isGuest && !isDemoReady && (
                   <span className="text-[9px] md:text-[10px] opacity-80 font-bold uppercase tracking-widest mt-0.5">Consume 1 Stamina</span>
                 )}
              </button>
            </div>

            <div className="flex gap-2 md:gap-3">
              <button onClick={onShowHistory} className="flex-1 px-3 py-3 md:px-4 md:py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-[10px] md:text-xs font-black tracking-widest flex items-center justify-center gap-1.5 md:gap-2 transition-all shadow-lg border border-gray-600 active:scale-95">
                <History size={16} className="md:w-5 md:h-5 text-blue-400"/> HISTORY
              </button>
              <button onClick={onShowRanking} className="flex-1 px-3 py-3 md:px-4 md:py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl text-[10px] md:text-xs font-black tracking-widest flex items-center justify-center gap-1.5 md:gap-2 transition-all shadow-lg border border-gray-600 active:scale-95">
                <Trophy size={16} className="md:w-5 md:h-5 text-yellow-400"/> RANKING
              </button>
            </div>

            <div className="mt-2 md:mt-4 flex justify-center">
              <a 
                href="https://k0j1.github.io/Running-Chihuahua---Light-Paper/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all text-[9px] md:text-[10px] font-bold uppercase tracking-widest"
              >
                <ScrollText size={12} className="group-hover:text-yellow-400 transition-colors md:w-[14px] md:h-[14px]" />
                <span>Litepaper</span>
              </a>
            </div>
            
            {/* Admin Button */}
            {isAdmin && (
               <div className="mt-1 md:mt-2 flex justify-center animate-in slide-in-from-bottom-2">
                  <button 
                    onClick={onShowAdmin}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-red-900/50 hover:bg-red-800 text-red-300 rounded-lg text-[10px] md:text-xs font-bold font-mono flex items-center gap-2 border border-red-800 transition-colors"
                  >
                    <Database size={12} className="md:w-[14px] md:h-[14px]" /> ADMIN
                  </button>
               </div>
            )}

          </div>
        </div>
      </div>
      
      {/* Background decoration text */}
      <div className="absolute bottom-2 md:bottom-4 text-white/10 text-[9px] md:text-[10px] font-black tracking-[0.5em] uppercase pointer-events-none">
        Ready to Dash?
      </div>
    </div>
  );
};
