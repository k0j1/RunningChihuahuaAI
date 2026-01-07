
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
  const [userId, setUserId] = useState<string | null>(null);

  // Determine User ID
  useEffect(() => {
    if (farcasterUser?.username) {
      setUserId(`fc:${farcasterUser.username}`);
    } else if (walletAddress) {
      setUserId(`wa:${walletAddress}`);
    } else {
      setUserId(null);
    }
  }, [farcasterUser, walletAddress]);

  // Fetch Inventory
  const loadInventory = useCallback(async () => {
    if (userId) {
      // Logged in: Fetch from DB
      const dbInventory = await fetchUserInventory(userId);
      setInventory(dbInventory);
    } else {
      // Guest: Use LocalStorage to persist guest items
      const saved = localStorage.getItem('guest_player_items');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Convert stored keys back to UserInventory map if needed, 
          // or assume structure matches UserInventory
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
  }, [userId]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Consume Single Item
  const consumeItem = async (itemType: ItemType): Promise<boolean> => {
    if (itemType === ItemType.NONE) return true;

    // Optimistic Check
    if (inventory[itemType] <= 0) return false;

    if (userId) {
      // Logged In: DB Transaction
      const success = await consumeUserItem(userId, itemType);
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
    // Note: Since we don't have a batch transaction API yet, we do sequential.
    // If one fails mid-way, it's a partial state issue, but acceptable for this scale.
    // Ideally update DB logic to handle batch.
    
    let allSuccess = true;
    
    if (userId) {
       // Parallel consumption for speed, but handle failures
       const results = await Promise.all(items.map(item => consumeUserItem(userId, item)));
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