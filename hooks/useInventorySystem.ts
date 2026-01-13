import { useState, useEffect, useCallback } from 'react';
import { ItemType, UserInventory, ClaimResult } from '../types';
import { fetchUserInventory, consumeUserItem, grantUserItem, fetchUserStats, claimLoginBonus as dbClaimLoginBonus } from '../services/supabase';
import { claimDailyBonus } from '../services/contracts/bonusService';
import { purchaseItemsWithTokens, fetchCHHBalance } from '../services/contracts/shopService';

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
  const [isClaimingBonus, setIsClaimingBonus] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [bonusClaimResult, setBonusClaimResult] = useState<ClaimResult | null>(null);
  const [pendingBonusItem, setPendingBonusItemState] = useState<ItemType | null>(null);

  useEffect(() => {
    setIsGuest(!farcasterUser?.username);
  }, [farcasterUser, walletAddress]);

  const isBonusAvailable = useCallback((lastClaimIso: string | null): boolean => {
    if (!lastClaimIso) return true;
    const lastClaimDate = new Date(lastClaimIso);
    const now = new Date();
    const lastDateStr = lastClaimDate.toISOString().split('T')[0];
    const nowDateStr = now.toISOString().split('T')[0];
    return lastDateStr !== nowDateStr;
  }, []);

  const setPendingBonusItem = useCallback((item: ItemType | null) => {
    setPendingBonusItemState(item);
    if (item) localStorage.setItem(THEME.PENDING_ITEM_KEY, item);
    else localStorage.removeItem(THEME.PENDING_ITEM_KEY);
  }, []);

  const loadInventory = useCallback(async () => {
    const savedPending = localStorage.getItem(THEME.PENDING_ITEM_KEY);
    if (savedPending && Object.values(ItemType).includes(savedPending as ItemType)) {
      setPendingBonusItemState(savedPending as ItemType);
    }

    if (!isGuest && farcasterUser?.username) {
      const dbInventory = await fetchUserInventory(farcasterUser, walletAddress);
      setInventory(dbInventory);

      const userId = `fc:${farcasterUser.username}`;
      const stats = await fetchUserStats(userId);
      if (stats) {
        const available = isBonusAvailable(stats.lastLoginBonusTime || null);
        const claimed = !available;
        setLoginBonusClaimed(claimed);
        if (claimed && !savedPending) setPendingBonusItem(null);
      } else {
        setLoginBonusClaimed(false);
      }
    } else {
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
      if (lastClaim) {
        const now = new Date().toISOString().split('T')[0];
        const isClaimed = lastClaim === now;
        setLoginBonusClaimed(isClaimed);
        if (isClaimed && !savedPending) setPendingBonusItem(null);
      } else {
        setLoginBonusClaimed(false);
      }
    }
  }, [farcasterUser, walletAddress, isGuest, isBonusAvailable, setPendingBonusItem]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const consumeItem = async (itemType: ItemType): Promise<boolean> => {
    if (itemType === ItemType.NONE) return true;
    if (inventory[itemType] <= 0) return false;

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
  };

  const consumeItems = async (items: ItemType[]): Promise<boolean> => {
    if (items.length === 0) return true;
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
  };

  const grantItem = async (itemType: ItemType, quantity: number = 1): Promise<boolean> => {
    if (itemType === ItemType.NONE) return false;
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
      } finally {
          setIsPurchasing(false);
      }
  };

  const claimBonus = async (itemType: ItemType, userWallet: string | null): Promise<ClaimResult> => {
    setIsClaimingBonus(true);
    if (isGuest || !userWallet) {
      await grantItem(itemType);
      localStorage.setItem(THEME.GUEST_BONUS_KEY, new Date().toISOString().split('T')[0]);
      setLoginBonusClaimed(true);
      setIsClaimingBonus(false);
      return { success: true, message: "Bonus claimed locally." };
    }
    try {
      const result = await claimDailyBonus(userWallet, itemType);
      if (result.success) {
        if (farcasterUser?.username) await dbClaimLoginBonus(`fc:${farcasterUser.username}`);
        await grantItem(itemType);
        setLoginBonusClaimed(true);
      }
      return result;
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
