
import React, { useState, useEffect, useRef } from 'react';
import { X, Gift, Shield, Heart, Sparkles, CheckCircle2, Loader2, Wallet, AlertCircle } from 'lucide-react';
import { ItemType, ClaimResult } from '../../types';

interface LoginBonusModalProps {
  onClose: () => void;
  onClaim: (item: ItemType) => Promise<ClaimResult>;
  walletAddress: string | null;
  pendingBonusItem: ItemType | null;
  onRegisterPending: (item: ItemType) => void;
}

const ITEMS_LIST = [
  ItemType.MAX_HP,
  ItemType.HEAL_ON_DODGE,
  ItemType.SHIELD,
];

const ITEM_CONFIG = {
  [ItemType.MAX_HP]: {
    icon: <Heart fill="currentColor" size={32} className="text-red-500" />,
    label: "Vitality",
    desc: "Start with 4 Lives",
    color: "bg-red-500/20",
    border: "border-red-500"
  },
  [ItemType.HEAL_ON_DODGE]: {
    icon: <Sparkles size={32} className="text-pink-500 fill-pink-500" />,
    label: "Recovery",
    desc: "Heal on Dodge",
    color: "bg-pink-500/20",
    border: "border-pink-500"
  },
  [ItemType.SHIELD]: {
    icon: <Shield size={32} className="text-blue-400 fill-blue-400" />,
    label: "Shield",
    desc: "Active Shield",
    color: "bg-blue-500/20",
    border: "border-blue-500"
  },
  [ItemType.NONE]: {
    icon: <Gift size={32} className="text-gray-400" />,
    label: "Nothing",
    desc: "Bad luck",
    color: "bg-gray-700",
    border: "border-gray-500"
  }
};

export const LoginBonusModal: React.FC<LoginBonusModalProps> = ({ 
  onClose, 
  onClaim, 
  walletAddress,
  pendingBonusItem,
  onRegisterPending
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteState, setRouletteState] = useState<'IDLE' | 'SPINNING' | 'RESULT' | 'CLAIMING' | 'SUCCESS'>('IDLE');
  const [resultItem, setResultItem] = useState<ItemType | null>(null);
  const [rouletteItems, setRouletteItems] = useState<ItemType[]>([]);
  const [claimError, setClaimError] = useState<string | null>(null);
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Settings for the roulette
  const ITEM_WIDTH = 100; // px
  const VISIBLE_ITEMS = 3;
  const SPIN_DURATION = 4000; // ms
  const TOTAL_ITEMS = 50; // Total items in the strip

  // Check for pending item on mount
  useEffect(() => {
      if (pendingBonusItem && rouletteState === 'IDLE') {
          setResultItem(pendingBonusItem);
          setRouletteState('RESULT');
      }
  }, [pendingBonusItem, rouletteState]);

  useEffect(() => {
    // Generate random strip
    const generated: ItemType[] = [];
    for (let i = 0; i < TOTAL_ITEMS; i++) {
        const randomItem = ITEMS_LIST[Math.floor(Math.random() * ITEMS_LIST.length)];
        generated.push(randomItem);
    }
    setRouletteItems(generated);
  }, []);

  const handleSpin = async () => {
    if (isSpinning || rouletteState !== 'IDLE') return;
    setIsSpinning(true);
    setRouletteState('SPINNING');

    // Decide result deterministically
    const targetIndex = 30 + Math.floor(Math.random() * 10);
    const wonItem = rouletteItems[targetIndex];

    const containerCenter = (VISIBLE_ITEMS * ITEM_WIDTH) / 2;
    const targetOffset = (targetIndex * ITEM_WIDTH) + (ITEM_WIDTH / 2) - containerCenter;

    // Animate
    if (scrollContainerRef.current) {
        scrollContainerRef.current.style.transition = 'none';
        scrollContainerRef.current.style.transform = `translateX(0px)`;
        scrollContainerRef.current.getBoundingClientRect(); // Force reflow
        scrollContainerRef.current.style.transition = `transform ${SPIN_DURATION}ms cubic-bezier(0.1, 0.9, 0.2, 1.0)`;
        scrollContainerRef.current.style.transform = `translateX(-${targetOffset}px)`;
    }

    // Wait for animation
    setTimeout(() => {
        setResultItem(wonItem);
        onRegisterPending(wonItem); // Persist pending state
        setRouletteState('RESULT');
        setIsSpinning(false);
    }, SPIN_DURATION + 500);
  };

  const handleClaim = async () => {
      if (!resultItem) return;
      if (!walletAddress) {
          // If no wallet, assume guest mode or error
          setClaimError("No wallet connected.");
          return;
      }
      
      setRouletteState('CLAIMING');
      setClaimError(null);
      
      const result = await onClaim(resultItem);
      
      if (result.success) {
          setRouletteState('SUCCESS');
      } else {
          setClaimError(result.message);
          setRouletteState('RESULT'); // Go back to result to retry
      }
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl border-2 border-yellow-500/50 flex flex-col items-center animate-in zoom-in duration-300">
        
        <div className="flex justify-between items-center w-full mb-6">
           <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 uppercase tracking-tighter flex items-center gap-2">
             <Gift size={24} className="text-yellow-400" /> Daily Bonus
           </h3>
           {rouletteState !== 'SPINNING' && rouletteState !== 'CLAIMING' && (
             <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-white">
               <X size={24} />
             </button>
           )}
        </div>

        {/* --- STATE: SUCCESS --- */}
        {rouletteState === 'SUCCESS' && resultItem && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 w-full">
                <CheckCircle2 size={64} className="text-green-500 mb-4 animate-bounce" />
                <h2 className="text-2xl font-black text-white mb-2 uppercase">Claimed!</h2>
                <div className={`w-20 h-20 rounded-xl ${ITEM_CONFIG[resultItem].color} border-2 ${ITEM_CONFIG[resultItem].border} flex items-center justify-center mb-2 shadow-lg`}>
                   {ITEM_CONFIG[resultItem].icon}
                </div>
                <div className="text-xl font-bold text-gray-200 mb-6">{ITEM_CONFIG[resultItem].label}</div>
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                    CLOSE
                </button>
            </div>
        )}

        {/* --- STATE: IDLE, SPINNING, RESULT, CLAIMING --- */}
        {rouletteState !== 'SUCCESS' && (
            <>
                {/* Result Display (Shown in Result or Claiming state) */}
                {resultItem ? (
                   <div className="flex flex-col items-center animate-in zoom-in duration-500 mb-6">
                       <div className="text-yellow-400 text-sm font-bold uppercase mb-2">You Won</div>
                       <div className={`w-24 h-24 rounded-2xl ${ITEM_CONFIG[resultItem].color} ${ITEM_CONFIG[resultItem].border} border-2 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]`}>
                           {ITEM_CONFIG[resultItem].icon}
                       </div>
                       <div className="text-2xl font-black text-white">{ITEM_CONFIG[resultItem].label}</div>
                       <div className="text-gray-400 text-xs">{ITEM_CONFIG[resultItem].desc}</div>
                   </div>
                ) : (
                   /* Roulette Window */
                   <div className="relative w-[300px] h-[120px] bg-black/50 rounded-xl border-2 border-gray-600 overflow-hidden mb-8 shadow-inner">
                       <div className="absolute top-0 bottom-0 left-1/2 w-[4px] bg-red-500 z-20 transform -translate-x-1/2 shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
                       <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                           <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[15px] border-t-red-500"></div>
                       </div>
                       <div 
                         ref={scrollContainerRef}
                         className="absolute top-0 left-0 h-full flex items-center"
                         style={{ willChange: 'transform' }}
                       >
                           {rouletteItems.map((item, idx) => (
                               <div key={idx} className="flex-shrink-0 flex items-center justify-center" style={{ width: `${ITEM_WIDTH}px`, height: '100%' }}>
                                   <div className={`w-[80px] h-[80px] rounded-lg border border-gray-600 bg-gray-800 flex items-center justify-center opacity-80`}>
                                       {ITEM_CONFIG[item].icon}
                                   </div>
                               </div>
                           ))}
                       </div>
                       <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-black/80 to-transparent z-10 pointer-events-none"></div>
                       <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-black/80 to-transparent z-10 pointer-events-none"></div>
                   </div>
                )}
                
                {/* Error Message */}
                {claimError && (
                    <div className="w-full bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4 flex gap-2 text-red-200 text-xs overflow-hidden">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span className="break-words max-h-24 overflow-y-auto w-full">{claimError}</span>
                    </div>
                )}

                {/* Actions */}
                {!resultItem ? (
                    <button
                        onClick={handleSpin}
                        disabled={isSpinning}
                        className={`px-8 py-3 rounded-full font-black text-xl shadow-lg transition-all transform ${
                            isSpinning 
                            ? 'bg-gray-600 text-gray-400 cursor-not-allowed scale-95' 
                            : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:scale-105 active:scale-95 hover:shadow-orange-500/50'
                        }`}
                    >
                        {isSpinning ? 'SPINNING...' : 'SPIN ROULETTE'}
                    </button>
                ) : (
                    <button
                        onClick={handleClaim}
                        disabled={rouletteState === 'CLAIMING'}
                        className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${
                            rouletteState === 'CLAIMING'
                            ? 'bg-blue-800 text-blue-200 cursor-wait'
                            : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-400 hover:to-indigo-500 hover:scale-[1.02]'
                        }`}
                    >
                        {rouletteState === 'CLAIMING' ? (
                            <>
                                <Loader2 size={24} className="animate-spin" />
                                CONFIRM IN WALLET...
                            </>
                        ) : (
                            <>
                                <Wallet size={24} />
                                CLAIM
                            </>
                        )}
                    </button>
                )}
                
                {rouletteState === 'RESULT' && (
                     <div className="text-[10px] text-gray-400 mt-2 text-center">
                        Resets daily at 9:00 AM JST.
                     </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};
