
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

    try {
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
    } catch (e) {
        console.warn("Stamina load failed:", e);
        // On error, fallback to current state (don't reset) or max if undefined
    }
  }, [userId]);

  // Save Stamina helper
  const saveStamina = async (newStamina: number, updateTime: number) => {
    try {
        if (userId) {
          await updateUserStamina(userId, newStamina, new Date(updateTime).toISOString());
        } else {
          localStorage.setItem('guest_stamina', JSON.stringify({
            stamina: newStamina,
            lastUpdate: updateTime
          }));
        }
    } catch (e) {
        console.error("Stamina save failed:", e);
    }
  };

  // Consume Stamina
  const consumeStamina = async (): Promise<boolean> => {
    try {
        await loadStamina(); // Refresh first to ensure valid data
        
        let currentStamina = stamina;
        
        if (currentStamina > 0) {
          const newStamina = currentStamina - 1;
          let newUpdateTime = Date.now(); // Default if we were at MAX

          if (nextRecoveryTime) {
             newUpdateTime = nextRecoveryTime - RECOVERY_MS;
          }
          
          setStamina(newStamina);
          setNextRecoveryTime(newUpdateTime + RECOVERY_MS);
          saveStamina(newStamina, newUpdateTime);
          return true;
        }
        return false;
    } catch (e) {
        console.error("Consume stamina failed:", e);
        return false;
    }
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
