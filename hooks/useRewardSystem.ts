import { useState, useCallback } from 'react';
import { claimTokenReward } from '../services/tokenService';
import { ClaimResult } from '../types';

export const useRewardSystem = () => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [totalClaimed, setTotalClaimed] = useState<number>(0);

  // New contract tracks daily counts, not total amounts exposed easily.
  // We remove the fetchTotalClaimed call to avoid errors with new ABI.
  const refreshTotalClaimed = useCallback(async (walletAddress: string) => {
    // Placeholder: In future, we could fetch daily claim count here
    setTotalClaimed(0); 
  }, []);

  const handleClaimReward = useCallback(async (walletAddress: string | null, score: number) => {
    if (!walletAddress) {
        setClaimResult({ success: false, message: "No wallet connected." });
        return;
    }

    setIsClaiming(true);
    setClaimResult(null);

    try {
      // Pass the current run score directly
      const result = await claimTokenReward(walletAddress, score);
      setClaimResult(result);
    } catch (e) {
      setClaimResult({ success: false, message: "Network error occurred." });
    } finally {
      setIsClaiming(false);
    }
  }, []);

  const resetClaimStatus = useCallback(() => {
    setClaimResult(null);
    setIsClaiming(false);
  }, []);

  return {
    isClaiming,
    claimResult,
    totalClaimed,
    handleClaimReward,
    resetClaimStatus,
    refreshTotalClaimed
  };
};