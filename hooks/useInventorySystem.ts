
import { useState, useEffect, useCallback } from 'react';
import { ItemType, UserInventory } from '../types';
import { fetchUserInventory, consumeUserItem } from '../services/supabase';

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

  // Determine if Guest or User
  useEffect(() => {
    if (farcasterUser?.username) {
      setIsGuest(false);
    } else {
      setIsGuest(true);
    }
  }, [farcasterUser, walletAddress]);

  // Fetch Inventory
  const loadInventory = useCallback(async () => {
    if (!isGuest) {
      // Logged in: Fetch from DB using user objects
      const dbInventory = await fetchUserInventory(farcasterUser, walletAddress);
      setInventory(dbInventory);
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
        // Give new guests some items to try
        setInventory(GUEST_INVENTORY);
        localStorage.setItem('guest_player_items', JSON.stringify(GUEST_INVENTORY));
      }
    }
  }, [farcasterUser, walletAddress, isGuest]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Consume Single Item
  const consumeItem = async (itemType: ItemType): Promise<boolean> => {
    if (itemType === ItemType.NONE) return true;

    // Optimistic Check
    if (inventory[itemType] <= 0) return false;

    if (!isGuest) {
      // Logged In: DB Transaction
      const success = await consumeUserItem(farcasterUser, walletAddress, itemType);
      if (success) {
        // Sync local state on success
        setInventory(prev => ({
          ...prev,
          [itemType]: Math.max(0, prev[itemType] - 1)
        }));
      }
      return success;
    } else {
      // Guest: LocalStorage
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

    // Check availability first
    for (const item of items) {
      if (item === ItemType.NONE) continue;
      if ((inventory[item] || 0) <= 0) return false;
    }

    // Attempt to consume all. 
    let allSuccess = true;
    
    if (!isGuest) {
       // Parallel consumption for speed, but handle failures
       const results = await Promise.all(items.map(item => consumeUserItem(farcasterUser, walletAddress, item)));
       allSuccess = results.every(r => r === true);
       
       if (allSuccess) {
           // Update local state by decrementing all
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
           // Reload to ensure consistency if something failed
           await loadInventory();
       }
    } else {
       // Guest
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

  return {
    inventory,
    loadInventory,
    consumeItem,
    consumeItems
  };
};
