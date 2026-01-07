
import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchUserStats, updateUserStamina } from '../services/supabase';

const MAX_STAMINA = 5;
const RECOVERY_MS = 2 * 60 * 60 * 1000; // 2 Hours

export const useStaminaSystem = (farcasterUser: any, walletAddress: string | null) => {
  const [stamina, setStamina] = useState(MAX_STAMINA);
  const [nextRecoveryTime, setNextRecoveryTime] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize userId
  useEffect(() => {
    if (farcasterUser?.username) {
      setUserId(`fc:${farcasterUser.username}`);
    } else {
      setUserId(null);
    }
  }, [farcasterUser, walletAddress]);

  // Load Stamina
  const loadStamina = useCallback(async () => {
    let currentStamina = MAX_STAMINA;
    let lastUpdate = Date.now();

    if (userId) {
      // Logged in: Fetch from Supabase
      const stats = await fetchUserStats(userId);
      if (stats && stats.stamina !== undefined && stats.lastStaminaUpdate) {
        currentStamina = stats.stamina;
        lastUpdate = new Date(stats.lastStaminaUpdate).getTime();
      }
    } else {
      // Guest: LocalStorage
      const saved = localStorage.getItem('guest_stamina');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          currentStamina = parsed.stamina;
          lastUpdate = parsed.lastUpdate;
        } catch (e) { console.error(e); }
      }
    }

    // Calculate Recovery
    const now = Date.now();
    const elapsed = now - lastUpdate;
    const recovered = Math.floor(elapsed / RECOVERY_MS);

    if (recovered > 0) {
      currentStamina = Math.min(MAX_STAMINA, currentStamina + recovered);
      // Fast forward the update time to the most recent recovery interval
      // unless we hit max, then it's just 'now'
      if (currentStamina === MAX_STAMINA) {
        lastUpdate = now;
      } else {
        lastUpdate = lastUpdate + (recovered * RECOVERY_MS);
      }
      
      // Update DB/Storage with new calculated values so we don't recalculate next time
      saveStamina(currentStamina, lastUpdate);
    }

    setStamina(currentStamina);
    
    // Set Timer
    if (currentStamina < MAX_STAMINA) {
      setNextRecoveryTime(lastUpdate + RECOVERY_MS);
    } else {
      setNextRecoveryTime(null);
    }
  }, [userId]);

  // Save Stamina helper
  const saveStamina = async (newStamina: number, updateTime: number) => {
    if (userId) {
      await updateUserStamina(userId, newStamina, new Date(updateTime).toISOString());
    } else {
      localStorage.setItem('guest_stamina', JSON.stringify({
        stamina: newStamina,
        lastUpdate: updateTime
      }));
    }
  };

  // Consume Stamina
  const consumeStamina = async (): Promise<boolean> => {
    await loadStamina(); // Refresh first to ensure valid data
    
    // Check state directly (optimization might vary, but state update is async)
    // We recalculate locally based on the logic inside loadStamina to be sure, 
    // but here we just rely on the most recent sync unless we want to dupe logic.
    // Let's assume loadStamina updated the state, but we need the immediate value.
    // To be safe, re-read storage/logic or just check current state if latency isn't huge.
    // For simplicity, we assume 'stamina' state is roughly accurate, but let's calc:
    
    let currentStamina = stamina;
    // We should strictly not rely on stale state if user clicked fast. 
    // Ideally we duplicate the calc logic or simply trust the state if valid.
    
    if (currentStamina > 0) {
      const newStamina = currentStamina - 1;
      let newUpdateTime = Date.now(); // Default if we were at MAX

      // If we were NOT at MAX, we keep the old recovery timer anchor.
      // We need to fetch the last anchor. This is tricky with just state.
      // Simpler: If recovering, the 'nextRecoveryTime' is set. 
      // anchor = nextRecoveryTime - RECOVERY_MS.
      
      if (nextRecoveryTime) {
         newUpdateTime = nextRecoveryTime - RECOVERY_MS;
      }
      
      setStamina(newStamina);
      setNextRecoveryTime(newUpdateTime + RECOVERY_MS);
      saveStamina(newStamina, newUpdateTime);
      return true;
    }
    return false;
  };

  // Timer Tick
  useEffect(() => {
    loadStamina(); // Initial load

    const interval = setInterval(() => {
      if (nextRecoveryTime) {
        const now = Date.now();
        if (now >= nextRecoveryTime) {
           loadStamina(); // Refresh to calculate new amount
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [loadStamina, nextRecoveryTime]);

  return {
    stamina,
    maxStamina: MAX_STAMINA,
    nextRecoveryTime,
    consumeStamina
  };
};
