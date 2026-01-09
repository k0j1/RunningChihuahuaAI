
import { useState, useEffect, useCallback } from 'react';
import { ItemType, UserInventory, ClaimResult } from '../types';
import { fetchUserInventory, consumeUserItem, grantUserItem, fetchUserStats, claimLoginBonus as dbClaimLoginBonus } from '../services/supabase';
import { claimDailyBonus as chainClaimDailyBonus } from '../services/tokenService';

// Default empty inventory
const DEFAULT_INVENTORY: UserInventory = {
  [ItemType.MAX_HP]: 0,
  [ItemType.HEAL_ON_DODGE]: 0,
  [ItemType.SHIELD]: 0,
  [ItemType.NONE]: 0,
};

// Mock inventory for guests (Demo purposes)
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
  const [bonusClaimResult, setBonusClaimResult] = useState<ClaimResult | null>(null);
  
  // Persist pending item if user spun but didn't claim yet
  const [pendingBonusItem, setPendingBonusItemState] = useState<ItemType | null>(null);

  // Determine if Guest or User
  useEffect(() => {
    if (farcasterUser?.username) {
      setIsGuest(false);
    } else {
      setIsGuest(true);
    }
  }, [farcasterUser, walletAddress]);

  // Check if bonus is available based on 9 AM JST Reset
  // 9:00 AM JST is 00:00 UTC. So we can just compare UTC Date strings.
  const isBonusAvailable = (lastClaimIso: string | null): boolean => {
      if (!lastClaimIso) return true;
      
      const lastClaimDate = new Date(lastClaimIso);
      const now = new Date();
      
      // Compare UTC dates (YYYY-MM-DD)
      // Since 9AM JST = 00:00 UTC, a new UTC day means a new JST reward cycle.
      const lastDateStr = lastClaimDate.toISOString().split('T')[0];
      const nowDateStr = now.toISOString().split('T')[0];
      
      return lastDateStr !== nowDateStr;
  };

  // Helper to persist pending item
  const setPendingBonusItem = (item: ItemType | null) => {
      setPendingBonusItemState(item);
      if (item) {
          localStorage.setItem('pending_bonus_item', item);
      } else {
          localStorage.removeItem('pending_bonus_item');
      }
  };

  // Fetch Inventory and Login Bonus Status
  const loadInventory = useCallback(async () => {
    // 1. Check local storage for pending bonus first
    const savedPending = localStorage.getItem('pending_bonus_item');
    if (savedPending && Object.values(ItemType).includes(savedPending as ItemType)) {
        setPendingBonusItemState(savedPending as ItemType);
    }

    if (!isGuest && farcasterUser?.username) {
      // Logged in: Fetch from DB using user objects
      const dbInventory = await fetchUserInventory(farcasterUser, walletAddress);
      setInventory(dbInventory);

      // Fetch Login Bonus Status
      const userId = `fc:${farcasterUser.username}`;
      const stats = await fetchUserStats(userId);
      if (stats) {
          // Check bonus availability based on last_login_bonus timestamp
          const available = isBonusAvailable(stats.lastLoginBonusTime || null);
          const claimed = !available;

          setLoginBonusClaimed(claimed);
          // Safety: If claimed is true, ensure pending is cleared (edge case correction)
          if (claimed) {
             setPendingBonusItem(null);
          }
      } else {
          setLoginBonusClaimed(false); // No record = available
      }
    } else {
      // Guest: Use LocalStorage to persist guest items
      const saved = localStorage.getItem('guest_player_items');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setInventory({
             ...DEFAULT_INVENTORY,
             ...parsed
          });
        } catch {
          setInventory(GUEST_INVENTORY);
        }
      } else {
        setInventory(GUEST_INVENTORY);
        localStorage.setItem('guest_player_items', JSON.stringify(GUEST_INVENTORY));
      }
      
      // Guest Login Bonus Logic (Daily reset local storage check)
      const lastClaim = localStorage.getItem('guest_last_login_bonus');
      if (lastClaim) {
          // Check if last claim was "today" in UTC
          const now = new Date().toISOString().split('T')[0];
          const isClaimed = lastClaim === now;
          setLoginBonusClaimed(isClaimed);
          if (isClaimed) setPendingBonusItem(null);
      } else {
          setLoginBonusClaimed(false);
      }
    }
  }, [farcasterUser, walletAddress, isGuest]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Consume Single Item
  const consumeItem = async (itemType: ItemType): Promise<boolean> => {
    if (itemType === ItemType.NONE) return true;

    if (inventory[itemType] <= 0) return false;

    if (!isGuest) {
      const success = await consumeUserItem(farcasterUser, walletAddress, itemType);
      if (success) {
        setInventory(prev => ({
          ...prev,
          [itemType]: Math.max(0, prev[itemType] - 1)
        }));
      }
      return success;
    } else {
      const newCount = Math.max(0, inventory[itemType] - 1);
      const newInventory = { ...inventory, [itemType]: newCount };
      setInventory(newInventory);
      localStorage.setItem('guest_player_items', JSON.stringify(newInventory));
      return true;
    }
  };

  // Consume Multiple Items
  const consumeItems = async (items: ItemType[]): Promise<boolean> => {
    if (items.length === 0) return true;
    for (const item of items) {
      if (item === ItemType.NONE) continue;
      if ((inventory[item] || 0) <= 0) return false;
    }

    let allSuccess = true;
    
    if (!isGuest) {
       const results = await Promise.all(items.map(item => consumeUserItem(farcasterUser, walletAddress, item)));
       allSuccess = results.every(r => r === true);
       
       if (allSuccess) {
           setInventory(prev => {
               const next = { ...prev };
               items.forEach(item => {
                   if (item !== ItemType.NONE) {
                       next[item] = Math.max(0, (next[item] || 0) - 1);
                   }
               });
               return next;
           });
       } else {
           await loadInventory();
       }
    } else {
       const newInventory = { ...inventory };
       items.forEach(item => {
           if (item !== ItemType.NONE) {
               newInventory[item] = Math.max(0, (newInventory[item] || 0) - 1);
           }
       });
       setInventory(newInventory);
       localStorage.setItem('guest_player_items', JSON.stringify(newInventory));
    }
    return allSuccess;
  };

  const grantItem = async (itemType: ItemType): Promise<boolean> => {
     if (itemType === ItemType.NONE) return false;

     if (!isGuest) {
        const success = await grantUserItem(farcasterUser, walletAddress, itemType);
        if (success) {
             setInventory(prev => ({
                ...prev,
                [itemType]: (prev[itemType] || 0) + 1
             }));
        }
        return success;
     } else {
        const newInventory = { ...inventory, [itemType]: (inventory[itemType] || 0) + 1 };
        setInventory(newInventory);
        localStorage.setItem('guest_player_items', JSON.stringify(newInventory));
        return true;
     }
  };

  const claimBonus = async (itemType: ItemType, userWallet: string | null): Promise<ClaimResult> => {
      setIsClaimingBonus(true);
      setBonusClaimResult(null);

      // Guest Mode (No wallet needed)
      if (isGuest || !userWallet) {
          // Just grant locally
          await grantItem(itemType);
          const today = new Date().toISOString().split('T')[0];
          localStorage.setItem('guest_last_login_bonus', today);
          
          setLoginBonusClaimed(true);
          setPendingBonusItem(null); // Clear pending
          
          setIsClaimingBonus(false);
          const result = { success: true, message: "Claimed (Guest Mode)" };
          setBonusClaimResult(result);
          return result;
      }

      // User Mode (Requires Signature + Gas)
      try {
          // 1. Transaction
          const result = await chainClaimDailyBonus(userWallet, itemType);
          
          if (result.success) {
               // 2. Update DB & Grant Item locally after success
               if (farcasterUser?.username) {
                   const userId = `fc:${farcasterUser.username}`;
                   await dbClaimLoginBonus(userId);
               }
               await grantItem(itemType);
               setLoginBonusClaimed(true);
               setPendingBonusItem(null); // Clear pending
          }
          
          setBonusClaimResult(result);
          setIsClaimingBonus(false);
          return result;

      } catch (e: any) {
          console.error("Bonus Claim Error:", e);
          const failResult = { success: false, message: e.message || "Claim failed" };
          setBonusClaimResult(failResult);
          setIsClaimingBonus(false);
          return failResult;
      }
  };

  return {
    inventory,
    loginBonusClaimed,
    isClaimingBonus,
    bonusClaimResult,
    pendingBonusItem,
    setPendingBonusItem,
    loadInventory,
    consumeItem,
    consumeItems,
    grantItem,
    claimBonus
  };
};
