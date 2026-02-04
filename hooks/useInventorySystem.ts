
import { useState, useEffect, useCallback } from 'react';
import { ItemType, UserInventory, ClaimResult } from '../types';
import { fetchUserInventory, consumeUserItem, grantUserItem, fetchUserStats, claimLoginBonus as dbClaimLoginBonus } from '../services/supabase';
import { claimDailyBonus } from '../services/contracts/bonusService';
import { purchaseItemsWithTokens } from '../services/contracts/shopService';

const THEME = {
  RESET_HOUR_UTC: 0,
  GUEST_KEY: 'guest_player_items',
  GUEST_BONUS_KEY: 'guest_last_login_bonus',
  PENDING_ITEM_KEY: 'pending_bonus_item'
};

const DEFAULT_INVENTORY: UserInventory = {
  [ItemType.MAX_HP]: 0,
  [ItemType.HEAL_ON_DODGE]: 0,
  [ItemType.SHIELD]: 0,
  [ItemType.NONE]: 0,
};

const GUEST_INVENTORY: UserInventory = {
  [ItemType.MAX_HP]: 1,
  [ItemType.HEAL_ON_DODGE]: 1,
  [ItemType.SHIELD]: 1,
  [ItemType.NONE]: 0,
};

export const useInventorySystem = (farcasterUser: any, walletAddress: string | null) => {
  const [inventory, setInventory] = useState<UserInventory>(DEFAULT_INVENTORY);
  const [isGuest, setIsGuest] = useState(true);
  const [loginBonusClaimed, setLoginBonusClaimed] = useState<boolean>(true);
  const [lastClaimDateStr, setLastClaimDateStr] = useState<string | null>(null); // Store last claim date YYYY-MM-DD
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [bonusClaimResult, setBonusClaimResult] = useState<ClaimResult | null>(null);
  const [pendingBonusItem, setPendingBonusItemState] = useState<ItemType | null>(null);

  useEffect(() => {
    setIsGuest(!farcasterUser?.username);
  }, [farcasterUser, walletAddress]);

  // Periodic check for day reset
  useEffect(() => {
    const checkReset = () => {
      if (lastClaimDateStr) {
        const nowStr = new Date().toISOString().split('T')[0];
        // If current date is different from last claim date, reset flag
        if (lastClaimDateStr !== nowStr) {
           setLoginBonusClaimed(false);
        } else {
           setLoginBonusClaimed(true);
        }
      }
    };

    const interval = setInterval(checkReset, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [lastClaimDateStr]);

  const setPendingBonusItem = useCallback((item: ItemType | null) => {
    setPendingBonusItemState(item);
    if (item) localStorage.setItem(THEME.PENDING_ITEM_KEY, item);
    else localStorage.removeItem(THEME.PENDING_ITEM_KEY);
  }, []);

  const loadInventory = useCallback(async () => {
    try {
        const savedPending = localStorage.getItem(THEME.PENDING_ITEM_KEY);
        if (savedPending && Object.values(ItemType).includes(savedPending as ItemType)) {
          setPendingBonusItemState(savedPending as ItemType);
        }

        if (!isGuest && farcasterUser?.username) {
          const dbInventory = await fetchUserInventory(farcasterUser, walletAddress);
          setInventory(dbInventory);

          const userId = `fc:${farcasterUser.username}`;
          const stats = await fetchUserStats(userId);
          const nowStr = new Date().toISOString().split('T')[0];

          if (stats) {
            const lastTime = stats.lastLoginBonusTime;
            if (lastTime) {
                const dateStr = new Date(lastTime).toISOString().split('T')[0];
                setLastClaimDateStr(dateStr);
                setLoginBonusClaimed(dateStr === nowStr);
                // If claimed today and no pending item, clear pending state logic
                if (dateStr === nowStr && !savedPending) setPendingBonusItem(null);
            } else {
                setLastClaimDateStr(null);
                setLoginBonusClaimed(false);
            }
          } else {
            setLastClaimDateStr(null);
            setLoginBonusClaimed(false);
          }
        } else {
          // GUEST LOGIC
          const saved = localStorage.getItem(THEME.GUEST_KEY);
          if (saved) {
            try {
              setInventory({ ...DEFAULT_INVENTORY, ...JSON.parse(saved) });
            } catch {
              setInventory(GUEST_INVENTORY);
            }
          } else {
            setInventory(GUEST_INVENTORY);
            localStorage.setItem(THEME.GUEST_KEY, JSON.stringify(GUEST_INVENTORY));
          }
          
          const lastClaim = localStorage.getItem(THEME.GUEST_BONUS_KEY);
          const nowStr = new Date().toISOString().split('T')[0];
          setLastClaimDateStr(lastClaim);

          if (lastClaim) {
            const isClaimed = lastClaim === nowStr;
            setLoginBonusClaimed(isClaimed);
            if (isClaimed && !savedPending) setPendingBonusItem(null);
          } else {
            setLoginBonusClaimed(false);
          }
        }
    } catch (e) {
        console.warn("Failed to load inventory:", e);
        // Fallback to minimal safe state
        setInventory(DEFAULT_INVENTORY);
    }
  }, [farcasterUser, walletAddress, isGuest, setPendingBonusItem]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const consumeItem = async (itemType: ItemType): Promise<boolean> => {
    if (itemType === ItemType.NONE) return true;
    if (inventory[itemType] <= 0) return false;

    try {
        if (!isGuest) {
          const success = await consumeUserItem(farcasterUser, walletAddress, itemType);
          if (success) setInventory(prev => ({ ...prev, [itemType]: Math.max(0, prev[itemType] - 1) }));
          return success;
        } else {
          const newCount = Math.max(0, inventory[itemType] - 1);
          const nextInv = { ...inventory, [itemType]: newCount };
          setInventory(nextInv);
          localStorage.setItem(THEME.GUEST_KEY, JSON.stringify(nextInv));
          return true;
        }
    } catch (e) {
        console.error("Item consumption failed:", e);
        return false;
    }
  };

  const consumeItems = async (items: ItemType[]): Promise<boolean> => {
    if (items.length === 0) return true;
    try {
        for (const item of items) {
          if (item !== ItemType.NONE && (inventory[item] || 0) <= 0) return false;
        }
        if (!isGuest) {
          const results = await Promise.all(items.map(item => consumeUserItem(farcasterUser, walletAddress, item)));
          const success = results.every(r => r === true);
          if (success) {
            setInventory(prev => {
              const next = { ...prev };
              items.forEach(item => { if (item !== ItemType.NONE) next[item] = Math.max(0, (next[item] || 0) - 1); });
              return next;
            });
          }
          return success;
        } else {
          const nextInv = { ...inventory };
          items.forEach(item => { if (item !== ItemType.NONE) nextInv[item] = Math.max(0, (nextInv[item] || 0) - 1); });
          setInventory(nextInv);
          localStorage.setItem(THEME.GUEST_KEY, JSON.stringify(nextInv));
          return true;
        }
    } catch (e) {
        console.error("Batch item consumption failed:", e);
        return false;
    }
  };

  const grantItem = async (itemType: ItemType, quantity: number = 1): Promise<boolean> => {
    if (itemType === ItemType.NONE) return false;
    try {
        if (!isGuest) {
          for (let i = 0; i < quantity; i++) {
            await grantUserItem(farcasterUser, walletAddress, itemType);
          }
          setInventory(prev => ({ ...prev, [itemType]: (prev[itemType] || 0) + quantity }));
          return true;
        } else {
          const nextInv = { ...inventory, [itemType]: (inventory[itemType] || 0) + quantity };
          setInventory(nextInv);
          localStorage.setItem(THEME.GUEST_KEY, JSON.stringify(nextInv));
          return true;
        }
    } catch (e) {
        console.error("Grant item failed:", e);
        return false;
    }
  };

  const buyItems = async (purchases: Record<string, number>, totalCHH: number): Promise<ClaimResult> => {
      if (!walletAddress) return { success: false, message: "Wallet not connected." };
      if (totalCHH <= 0) return { success: false, message: "No items selected." };

      setIsPurchasing(true);
      try {
          const totalItems = Object.values(purchases).reduce((a, b) => a + b, 0);
          const res = await purchaseItemsWithTokens(walletAddress, totalItems, totalCHH);
          if (res.success) {
              for (const [type, quantity] of Object.entries(purchases)) {
                  await grantItem(type as ItemType, quantity);
              }
          }
          return res;
      } catch (e: any) {
          return { success: false, message: e.message || "Purchase failed." };
      } finally {
          setIsPurchasing(false);
      }
  };

  const claimBonus = async (itemType: ItemType, userWallet: string | null): Promise<ClaimResult> => {
    setIsClaimingBonus(true);
    
    const updateLocalState = () => {
        const nowStr = new Date().toISOString().split('T')[0];
        setLastClaimDateStr(nowStr);
        setLoginBonusClaimed(true);
    };

    try {
        if (isGuest || !userWallet) {
          await grantItem(itemType);
          localStorage.setItem(THEME.GUEST_BONUS_KEY, new Date().toISOString().split('T')[0]);
          updateLocalState();
          setPendingBonusItem(null); 
          setIsClaimingBonus(false);
          return { success: true, message: "Bonus claimed locally." };
        }
        
        // Contract claim (Token only)
        const result = await claimDailyBonus(userWallet);
        
        if (result.success) {
            // DB claim (Timestamp) & Item Grant (Local Item)
            if (farcasterUser?.username) await dbClaimLoginBonus(`fc:${farcasterUser.username}`);
            await grantItem(itemType);
            updateLocalState();
            setPendingBonusItem(null);
        }
        return result;
    } catch (e: any) {
        return { success: false, message: e.message || "Claim failed." };
    } finally {
      setIsClaimingBonus(false);
    }
  };

  return {
    inventory,
    loginBonusClaimed,
    isClaimingBonus,
    isPurchasing,
    bonusClaimResult,
    pendingBonusItem,
    setPendingBonusItem,
    loadInventory,
    consumeItem,
    consumeItems,
    grantItem,
    buyItems,
    claimBonus
  };
};
