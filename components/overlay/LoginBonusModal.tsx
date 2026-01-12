
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Gift, Shield, Heart, Sparkles, CheckCircle2, Loader2, Wallet, AlertCircle } from 'lucide-react';
import { ItemType, ClaimResult } from '../../types';

interface LoginBonusModalProps {
  onClose: () => void;
  onClaim: (item: ItemType) => Promise<ClaimResult>;
  walletAddress: string | null;
  pendingBonusItem: ItemType | null;
  onRegisterPending: (item: ItemType) => void;
}

const ITEMS_LIST = [ItemType.MAX_HP, ItemType.HEAL_ON_DODGE, ItemType.SHIELD];

const THEME = {
  ITEM_WIDTH: 100,
  VISIBLE_ITEMS: 3,
  SPIN_DURATION: 4000,
  TOTAL_STRIP: 50,
  COLORS: {
    [ItemType.MAX_HP]: { icon: <Heart fill="currentColor" size={32} className="text-red-500" />, label: "Vitality", desc: "+1 Max HP", bg: "bg-red-500/20", border: "border-red-500" },
    [ItemType.HEAL_ON_DODGE]: { icon: <Sparkles size={32} className="text-pink-500 fill-pink-500" />, label: "Recovery", desc: "Heal on Dodge", bg: "bg-pink-500/20", border: "border-pink-500" },
    [ItemType.SHIELD]: { icon: <Shield size={32} className="text-blue-400 fill-blue-400" />, label: "Shield", desc: "Damage Barrier", bg: "bg-blue-500/20", border: "border-blue-500" },
    [ItemType.NONE]: { icon: <Gift size={32} className="text-gray-400" />, label: "Empty", desc: "No Item", bg: "bg-gray-800", border: "border-gray-700" }
  }
};

export const LoginBonusModal: React.FC<LoginBonusModalProps> = ({ 
  onClose, onClaim, walletAddress, pendingBonusItem, onRegisterPending 
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rouletteState, setRouletteState] = useState<'IDLE' | 'SPINNING' | 'RESULT' | 'CLAIMING' | 'SUCCESS'>('IDLE');
  
  // 当選したアイテムをモーダルの生存期間中確実に保持する
  const [wonItem, setWonItem] = useState<ItemType | null>(null);
  const [rouletteItems, setRouletteItems] = useState<ItemType[]>([]);
  const [claimError, setClaimError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 初期化時にpending（未受け取り）がある場合は結果画面から開始
  useEffect(() => {
    if (pendingBonusItem && rouletteState === 'IDLE') {
      setWonItem(pendingBonusItem);
      setRouletteState('RESULT');
    }
  }, [pendingBonusItem, rouletteState]);

  // ルーレットのアイテム列を生成
  useEffect(() => {
    const generated = Array.from({ length: THEME.TOTAL_STRIP }, () => ITEMS_LIST[Math.floor(Math.random() * ITEMS_LIST.length)]);
    setRouletteItems(generated);
  }, []);

  const handleSpin = useCallback(() => {
    if (isSpinning || rouletteState !== 'IDLE') return;
    setIsSpinning(true);
    setRouletteState('SPINNING');

    const targetIndex = 35 + Math.floor(Math.random() * 5); // 35〜40番目のアイテムで止める
    const selectedItem = rouletteItems[targetIndex];
    const containerCenter = (THEME.VISIBLE_ITEMS * THEME.ITEM_WIDTH) / 2;
    const targetOffset = (targetIndex * THEME.ITEM_WIDTH) + (THEME.ITEM_WIDTH / 2) - containerCenter;

    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.transition = 'none';
      scrollContainerRef.current.style.transform = `translateX(0px)`;
      scrollContainerRef.current.getBoundingClientRect(); // reflow
      scrollContainerRef.current.style.transition = `transform ${THEME.SPIN_DURATION}ms cubic-bezier(0.1, 0.9, 0.2, 1.0)`;
      scrollContainerRef.current.style.transform = `translateX(-${targetOffset}px)`;
    }

    setTimeout(() => {
      setWonItem(selectedItem);
      onRegisterPending(selectedItem); // 親の状態を更新（万が一閉じても保持されるように）
      setRouletteState('RESULT');
      setIsSpinning(false);
    }, THEME.SPIN_DURATION + 500);
  }, [isSpinning, rouletteState, rouletteItems, onRegisterPending]);

  const handleClaim = useCallback(async () => {
    if (!wonItem) return;
    if (!walletAddress) { setClaimError("Connect wallet to claim bonus!"); return; }
    
    setRouletteState('CLAIMING');
    setClaimError(null);
    const result = await onClaim(wonItem);
    
    if (result.success) {
      setRouletteState('SUCCESS');
    } else {
      setClaimError(result.message);
      setRouletteState('RESULT');
    }
  }, [wonItem, walletAddress, onClaim]);

  // 当選アイテムの表示設定をメモ化
  const itemConfig = useMemo(() => {
    const type = wonItem || ItemType.NONE;
    return THEME.COLORS[type];
  }, [wonItem]);

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-gradient-to-b from-gray-900 to-gray-800 w-full max-w-[320px] rounded-[2.5rem] p-6 shadow-2xl border-2 border-yellow-500/30 flex flex-col items-center relative overflow-hidden">
        
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />

        <div className="flex justify-between items-center w-full mb-6 relative z-10">
           <h3 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 uppercase tracking-tighter flex items-center gap-2">
             <Gift size={20} className="text-yellow-400" /> DAILY BONUS
           </h3>
           {['IDLE', 'RESULT', 'SUCCESS'].includes(rouletteState) && (
             <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400"><X size={20} /></button>
           )}
        </div>

        {rouletteState === 'SUCCESS' ? (
          <div className="flex flex-col items-center animate-in zoom-in duration-300 w-full relative z-10 py-4">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                <CheckCircle2 size={64} className="text-green-500 relative z-10" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight">BONUS CLAIMED!</h2>
            
            {/* Display Won Item explicitly in success screen */}
            <div className={`w-24 h-24 rounded-2xl ${itemConfig.bg} border-2 ${itemConfig.border} flex items-center justify-center mb-3 shadow-lg relative`}>
               {itemConfig.icon}
               <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1 border-2 border-gray-900">
                  <CheckCircle2 size={12} strokeWidth={4} />
               </div>
            </div>
            <div className="text-xl font-black text-white mb-1 uppercase tracking-tight">{itemConfig.label}</div>
            <div className="text-[10px] font-bold text-gray-400 mb-8 uppercase tracking-widest">{itemConfig.desc}</div>
            
            <button onClick={onClose} className="w-full py-4 bg-white text-gray-900 rounded-2xl font-black text-lg hover:bg-gray-100 active:scale-95 transition-all shadow-xl border-b-4 border-gray-300">GREAT!</button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center relative z-10">
            {wonItem && rouletteState !== 'SPINNING' ? (
              <div className="flex flex-col items-center animate-in zoom-in duration-500 mb-8 w-full">
                <div className="text-yellow-400 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                   <Sparkles size={12} /> YOU WON! <Sparkles size={12} />
                </div>
                <div className={`w-28 h-28 rounded-3xl ${itemConfig.bg} ${itemConfig.border} border-2 flex items-center justify-center mb-4 shadow-2xl relative group`}>
                   <div className="absolute inset-0 bg-white/5 rounded-3xl group-hover:bg-white/10 transition-colors" />
                   {React.cloneElement(itemConfig.icon as React.ReactElement<{ size: number }>, { size: 48 })}
                </div>
                <div className="text-2xl font-black text-white uppercase tracking-tighter">{itemConfig.label}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{itemConfig.desc}</div>
              </div>
            ) : (
              <div className="relative w-full h-[100px] bg-black/40 rounded-2xl border-2 border-gray-700 overflow-hidden mb-8 shadow-inner">
                {/* Center Indicator */}
                <div className="absolute top-0 bottom-0 left-1/2 w-[2px] bg-yellow-400 z-20 transform -translate-x-1/2 shadow-[0_0_10px_rgba(250,204,21,0.5)]"></div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-yellow-400" />
                </div>

                <div ref={scrollContainerRef} className="absolute top-0 left-0 h-full flex items-center" style={{ willChange: 'transform' }}>
                  {rouletteItems.map((item, idx) => (
                    <div key={idx} className="flex-shrink-0 flex items-center justify-center" style={{ width: `${THEME.ITEM_WIDTH}px`, height: '100%' }}>
                      <div className="w-16 h-16 rounded-xl border border-gray-700 bg-gray-800/50 flex items-center justify-center">
                         {React.cloneElement(THEME.COLORS[item].icon as React.ReactElement<{ size: number }>, { size: 24 })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {claimError && (
              <div className="w-full bg-red-900/40 border border-red-500/50 rounded-xl p-3 mb-4 flex gap-2 text-red-200 text-[10px] font-bold uppercase animate-in slide-in-from-top-2">
                <AlertCircle size={14} className="shrink-0 text-red-400" />
                <span className="leading-tight">{claimError}</span>
              </div>
            )}

            {!wonItem ? (
              <button 
                onClick={handleSpin} 
                disabled={isSpinning} 
                className={`w-full py-4 rounded-2xl font-black text-xl shadow-xl transition-all relative overflow-hidden active:scale-95 ${
                  isSpinning 
                  ? 'bg-gray-800 text-gray-500 border border-gray-700 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 border-b-4 border-orange-700 hover:brightness-110'
                }`}
              >
                {isSpinning ? 'SPINNING...' : 'SPIN ROULETTE'}
              </button>
            ) : (
              <button 
                onClick={handleClaim} 
                disabled={rouletteState === 'CLAIMING'} 
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${
                  rouletteState === 'CLAIMING' 
                  ? 'bg-blue-900/50 text-blue-300 border border-blue-800 cursor-wait' 
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-b-4 border-indigo-800 hover:brightness-110'
                }`}
              >
                {rouletteState === 'CLAIMING' ? <><Loader2 size={20} className="animate-spin" />SENDING...</> : <><Wallet size={20} />CLAIM BONUS</>}
              </button>
            )}
            
            {(rouletteState === 'RESULT' || rouletteState === 'IDLE') && (
               <div className="text-[8px] text-gray-500 mt-4 font-black uppercase tracking-widest text-center">
                  Daily reset at 00:00 UTC
               </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
