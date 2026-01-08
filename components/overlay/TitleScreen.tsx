
import React, { useState, useRef, useEffect } from 'react';
import { History, Trophy, FileText, PlayCircle, Zap, Clock, Volume2, VolumeX, Heart, Shield, ArrowUp, Sparkles, PlusCircle } from 'lucide-react';
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
  onConnectWallet: () => void;
  onShowProfile: () => void;
  stamina: number;
  maxStamina: number;
  nextRecoveryTime: number | null;
  selectedItems: ItemType[];
  toggleItem: (item: ItemType) => void;
  inventory: UserInventory;
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
  onConnectWallet,
  onShowProfile,
  stamina,
  maxStamina,
  nextRecoveryTime,
  selectedItems,
  toggleItem,
  inventory,
  isMuted,
  onToggleMute
}) => {
  const [isDemoReady, setIsDemoReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const pressTimer = useRef<number | null>(null);

  // Check if guest (no Farcaster)
  const isGuest = !farcasterUser;

  const handlePressStart = () => {
    if (!isGuest) return;
    
    // Start 15s timer for guest hidden features
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

  // Update countdown
  useEffect(() => {
    if (!nextRecoveryTime) {
      setTimeLeft("");
      return;
    }
    const updateTimer = () => {
      const diff = nextRecoveryTime - Date.now();
      if (diff <= 0) {
        setTimeLeft("");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [nextRecoveryTime]);

  const hasStamina = stamina > 0;

  const items = [
    {
      type: ItemType.MAX_HP,
      // Icon: Heart with Up Arrow overlaid
      icon: (
        <div className="relative">
          <Heart fill="currentColor" size={24} />
          <ArrowUp size={14} className="absolute -top-1 -right-1 text-white bg-red-600 rounded-full p-0.5 border border-white" strokeWidth={3} />
        </div>
      ),
      label: "Vitality",
      desc: "Start with 4 Lives",
      color: "text-red-500",
      bgColor: "bg-red-500/20",
      borderColor: "border-red-500",
      selectable: true
    },
    {
      type: ItemType.HEAL_ON_DODGE,
      // Icon: Heart with Sparkles overlaid
      icon: (
        <div className="relative">
          <Heart className="text-pink-500 fill-pink-500" size={24} />
          <Sparkles size={14} className="absolute -top-1 -right-2 text-yellow-300 fill-yellow-300 animate-pulse" />
        </div>
      ),
      label: "Recovery",
      desc: "Heal +0.2 HP per Dodge",
      color: "text-pink-500",
      bgColor: "bg-pink-500/20",
      borderColor: "border-pink-500",
      selectable: true
    },
    {
      type: ItemType.SHIELD,
      // Icon: Shield
      icon: (
        <div className="relative">
          <Shield className="text-blue-400 fill-blue-400" size={24} />
          <div className="absolute inset-0 bg-blue-400/20 blur-md rounded-full"></div>
        </div>
      ),
      label: "Shield",
      desc: "Active In-Game Item",
      color: "text-blue-400",
      bgColor: "bg-blue-500/20",
      borderColor: "border-blue-500",
      selectable: false
    }
  ];

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
      
      {/* Mute Widget (Top Left) */}
      <div 
        className="absolute top-4 left-4 z-50"
      >
        <button
          onClick={onToggleMute}
          className="bg-gray-800/80 p-3 rounded-full backdrop-blur-md shadow-lg border border-gray-600 text-white hover:bg-gray-700 transition-transform active:scale-95"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center text-white p-6 bg-black/40 backdrop-blur-md rounded-3xl border border-white/20 shadow-2xl animate-fade-in-up max-w-lg w-full mx-4">
        <h1 className="text-6xl font-black mb-1 tracking-tighter drop-shadow-lg text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          RUNNING<br />CHIHUAHUA
        </h1>
        <p className="text-xl mb-4 font-light text-gray-100">Escape the Bosses!</p>

        {/* Item Selection */}
        <div className="mb-6">
           <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">Select Items</h3>
           <div className="flex gap-2 justify-center">
             {items.map((item) => {
                // Defensive check for inventory presence
                const count = (inventory && inventory[item.type]) || 0;
                const hasItem = count > 0;
                const isSelected = item.selectable && selectedItems.includes(item.type);
                
                return (
                  <button
                    key={item.type || 'unknown'}
                    onClick={() => {
                        if (hasItem && item.selectable) {
                            toggleItem(item.type);
                        }
                    }}
                    disabled={!hasItem || !item.selectable}
                    className={`relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all w-24 h-24 ${
                      isSelected 
                      ? `${item.bgColor} ${item.borderColor} scale-105 shadow-[0_0_15px_rgba(255,255,255,0.3)]` 
                      : hasItem 
                        ? (item.selectable 
                            ? 'bg-gray-800/60 border-gray-600 hover:bg-gray-700' 
                            : 'bg-gray-800/40 border-gray-700 opacity-80 cursor-default')
                        : 'bg-gray-900/40 border-gray-800 opacity-50 cursor-not-allowed grayscale'
                    }`}
                  >
                     <div className={`${item.color} mb-1`}>{item.icon}</div>
                     <span className="text-xs font-bold leading-tight">{item.label}</span>
                     
                     {/* Count Badge */}
                     <div className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-[10px] font-black leading-none ${hasItem ? 'bg-white text-black' : 'bg-gray-700 text-gray-400'}`}>
                        x{count}
                     </div>
                     
                     {/* Selected Indicator */}
                     {isSelected && (
                        <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]"></div>
                     )}

                     {/* In-Game Tag for non-selectable items that are owned */}
                     {!item.selectable && hasItem && (
                        <div className="absolute bottom-1 text-[8px] text-blue-300 font-bold uppercase tracking-wider">IN-GAME</div>
                     )}
                  </button>
                );
             })}
           </div>
        </div>

        {/* Stamina Display - ONLY shown for Farcaster Users */}
        {farcasterUser && (
          <div className="flex flex-col items-center mb-6 bg-gray-800/80 rounded-xl p-3 border border-gray-600">
             <div className="flex items-center gap-2 mb-2">
               <Zap size={18} className="text-yellow-400 fill-yellow-400" />
               {timeLeft && (
                 <div className="flex items-center gap-1 text-xs text-yellow-400 font-mono bg-black/50 px-2 py-0.5 rounded">
                   <Clock size={10} /> +1 in {timeLeft}
                 </div>
               )}
             </div>
             <div className="flex gap-1">
                {[...Array(maxStamina)].map((_, i) => (
                  <div key={i} className={`w-8 h-2 rounded-full transition-all ${i < stamina ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]' : 'bg-gray-600'}`} />
                ))}
             </div>
          </div>
        )}

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
              disabled={farcasterUser ? !hasStamina : false}
              className={`px-8 py-4 rounded-full text-2xl font-bold shadow-lg transition-all select-none flex items-center justify-center gap-2 ${
                (farcasterUser ? hasStamina : true)
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:scale-105 hover:shadow-blue-500/50 active:scale-95 cursor-pointer' 
                : 'bg-gray-600 cursor-not-allowed opacity-80'
              }`}
            >
               {(farcasterUser ? hasStamina : true) ? (
                 <>
                   START RUNNING {farcasterUser && <span className="text-sm font-normal opacity-80 flex items-center bg-black/20 px-2 rounded ml-2"><Zap size={14} fill="white"/> -1</span>}
                 </>
               ) : (
                 <span className="flex items-center gap-2"><Clock size={20}/> RECOVERING...</span>
               )}
            </button>
          )}

          {/* Farcaster Add Button - Title Screen */}
          {farcasterUser && !isAdded && onAddMiniApp && (
            <button
              onClick={onAddMiniApp}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 animate-bounce"
            >
              <PlusCircle size={20} /> Add to Farcaster
            </button>
          )}

          {/* History/Ranking buttons: Visible for everyone */}
          <div className="flex gap-4 animate-in fade-in duration-500">
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
