
import React, { useState, useMemo } from 'react';
import { X, ShoppingCart, Heart, Shield, Sparkles, Plus, Minus, Loader2, Wallet, CheckCircle2, AlertCircle, Coins, Gift } from 'lucide-react';
import { ItemType, ClaimResult } from '../../types';

interface ShopModalProps {
  onClose: () => void;
  onBuy: (purchases: Record<string, number>, totalCHH: number) => Promise<ClaimResult>;
  walletAddress: string | null;
  inventory: Record<string, number>;
}

const PRICING = {
  SINGLE: 200,
  SET_PRICE: 500, // 3種各1個で500
};

const SHOP_ITEMS = [
  {
    type: ItemType.MAX_HP,
    label: "Vitality",
    desc: "+1 Max HP",
    icon: <Heart className="text-red-500 fill-red-500" size={20} />,
  },
  {
    type: ItemType.HEAL_ON_DODGE,
    label: "Recovery",
    desc: "Heal on Dodge",
    icon: <Sparkles className="text-pink-500 fill-pink-500" size={20} />,
  },
  {
    type: ItemType.SHIELD,
    label: "Shield",
    desc: "Damage Barrier",
    icon: <Shield className="text-blue-400 fill-blue-400" size={20} />,
  }
];

export const ShopModal: React.FC<ShopModalProps> = ({ onClose, onBuy, walletAddress, inventory }) => {
  const [quantities, setQuantities] = useState<Record<string, number>>({
    [ItemType.MAX_HP]: 0,
    [ItemType.HEAL_ON_DODGE]: 0,
    [ItemType.SHIELD]: 0
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);

  const totals = useMemo(() => {
    const qValues = Object.values(quantities) as number[];
    const totalItems = qValues.reduce((a, b) => a + b, 0);
    const numSets = Math.min(...qValues);
    const totalPrice = (numSets * PRICING.SET_PRICE) + ((totalItems - (numSets * 3)) * PRICING.SINGLE);
    const normalPrice = totalItems * PRICING.SINGLE;
    const savings = normalPrice - totalPrice;
    
    return { totalCHH: totalPrice, totalItems, totalSavings: savings, numSets };
  }, [quantities]);

  const updateQuantity = (type: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [type]: Math.max(0, Math.min(30, (prev[type] || 0) + delta))
    }));
    setResult(null);
  };

  const handleBuyAll = async () => {
    if (!walletAddress || totals.totalItems === 0) return;
    setIsProcessing(true);
    setResult(null);
    
    const finalPurchases: Record<string, number> = {};
    (Object.entries(quantities) as [string, number][]).forEach(([type, q]) => {
      if (q > 0) finalPurchases[type] = q;
    });

    const res = await onBuy(finalPurchases, totals.totalCHH);
    setResult(res);
    setIsProcessing(false);
  };

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-white w-full max-w-[340px] rounded-[2rem] p-5 shadow-2xl animate-in zoom-in duration-300 border-[5px] border-yellow-400 flex flex-col max-h-[85vh] relative overflow-hidden">
        
        {/* BG Accent */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-yellow-50 rounded-full blur-3xl opacity-60 pointer-events-none" />

        {/* Header */}
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div className="flex flex-col">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter flex items-center gap-1.5 leading-none">
              <ShoppingCart className="text-yellow-600" size={22} strokeWidth={3} /> ITEM SHOP
            </h3>
            <p className="text-[9px] font-black text-blue-600 mt-1.5 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
              <Gift size={10} /> Full Set: 500 $CHH
            </p>
          </div>
          {!isProcessing && (
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-all active:scale-90">
              <X size={22} className="text-gray-400" strokeWidth={3} />
            </button>
          )}
        </div>

        {result?.success ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in py-6 relative z-10">
             <div className="bg-green-100 p-6 rounded-full mb-4 border-4 border-green-200">
                <CheckCircle2 size={60} className="text-green-500 animate-bounce" strokeWidth={3} />
             </div>
             <h4 className="text-2xl font-black text-gray-900 uppercase mb-2">COMPLETE!</h4>
             <p className="text-xs text-gray-500 mb-8 font-bold">Items added to inventory.</p>
             <button onClick={onClose} className="w-full py-3.5 bg-gray-900 text-white rounded-2xl font-black text-lg shadow-xl uppercase tracking-widest active:scale-95 border-b-4 border-gray-700">LET'S RUN!</button>
          </div>
        ) : (
          <>
            {/* Item List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 mb-4 relative z-10 custom-scrollbar">
              {SHOP_ITEMS.map((item) => {
                const q = quantities[item.type] || 0;
                return (
                  <div 
                    key={item.type}
                    className={`p-3 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                      q > 0 ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white shadow-sm border border-gray-100 shrink-0">
                      {item.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mr-2">
                        <span className="text-xs font-black text-gray-900 uppercase leading-none">{item.label}</span>
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                          200 $CHH
                        </span>
                      </div>
                      <p className="text-[8px] font-bold text-gray-400 mt-0.5 uppercase leading-none">{item.desc}</p>
                      <div className="mt-1 text-[8px] font-black text-gray-400 uppercase">
                        Own: {inventory[item.type] || 0}
                      </div>
                    </div>

                    {/* Controller */}
                    <div className="flex items-center bg-gray-900 rounded-xl p-1 shadow-md border border-gray-800">
                      <button 
                        onClick={() => updateQuantity(item.type, -1)}
                        disabled={q === 0}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                          q > 0 ? 'bg-gray-700 text-white active:scale-90' : 'text-gray-600 opacity-20'
                        }`}
                      >
                        <Minus size={18} strokeWidth={4} />
                      </button>
                      
                      <span className="w-6 text-center text-sm font-black font-mono text-white">
                        {q}
                      </span>

                      <button 
                        onClick={() => updateQuantity(item.type, 1)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-yellow-400 text-gray-900 shadow-sm active:scale-90 border-b-2 border-yellow-600"
                      >
                        <Plus size={18} strokeWidth={4} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact Summary Panel */}
            <div className="p-4 bg-gray-900 rounded-2xl text-white shadow-lg mb-4 border-b-4 border-black relative overflow-hidden">
               <div className="flex justify-between items-center mb-2">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Selected</span>
                    <span className="text-lg font-black">{totals.totalItems} <span className="text-[10px] text-gray-400">PCS</span></span>
                  </div>
                  {totals.numSets > 0 && (
                    <div className="flex flex-col items-end">
                      <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">Bonus</span>
                      <span className="text-sm font-black text-white">{totals.numSets} SETS</span>
                    </div>
                  )}
               </div>
               
               <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest">Total</span>
                    <div className="flex items-center gap-1">
                       <Coins size={14} className="text-yellow-400" strokeWidth={3} />
                       <span className="text-2xl font-black font-mono tracking-tighter text-white">
                         {totals.totalCHH.toLocaleString()}
                       </span>
                    </div>
                  </div>
                  
                  {totals.totalSavings > 0 && (
                    <div className="text-[8px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full border-b-2 border-green-700 uppercase animate-pulse">
                       Saved {totals.totalSavings}
                    </div>
                  )}
               </div>
            </div>

            {/* Error Message */}
            {result && !result.success && (
              <div className="mb-3 p-2.5 bg-red-50 rounded-xl border border-red-200 text-red-600 flex gap-2 animate-in slide-in-from-top-2">
                 <AlertCircle size={14} className="shrink-0" strokeWidth={3} />
                 <span className="text-[9px] font-black leading-tight uppercase">{result.message}</span>
              </div>
            )}

            {/* Purchase Button */}
            <button
              onClick={handleBuyAll}
              disabled={isProcessing || !walletAddress || totals.totalItems === 0}
              className={`w-full py-4 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                isProcessing || totals.totalItems === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed border-b-2 border-gray-300' 
                : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 hover:brightness-105 border-b-4 border-orange-700'
              }`}
            >
              {isProcessing ? <Loader2 className="animate-spin" size={20} strokeWidth={3} /> : <Wallet size={20} strokeWidth={3} />}
              {isProcessing ? 'SENDING...' : 'BUY NOW'}
            </button>
            {!walletAddress && <p className="text-[8px] text-red-500 font-black mt-2 text-center uppercase tracking-tighter">! Connect Wallet to Purchase !</p>}
          </>
        )}
      </div>
    </div>
  );
};
