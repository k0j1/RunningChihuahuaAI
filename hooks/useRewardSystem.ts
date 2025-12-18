import { useState, useCallback } from 'react';
import { claimTokenReward, fetchTotalClaimed } from '../services/tokenService';
import { ClaimResult } from '../types';

export const useRewardSystem = () => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [totalClaimed, setTotalClaimed] = useState<number>(0);

  const refreshTotalClaimed = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    const amount = await fetchTotalClaimed(walletAddress);
    setTotalClaimed(amount);
  }, []);

  const handleClaimReward = useCallback(async (walletAddress: string | null, score: number) => {
    if (!walletAddress) {
        setClaimResult({ success: false, message: "No wallet connected." });
        return;
    }

    setIsClaiming(true);
    setClaimResult(null);

    try {
      const result = await claimTokenReward(walletAddress, score);
      setClaimResult(result);
      if (result.success) {
          // Refresh after success
          setTimeout(() => refreshTotalClaimed(walletAddress), 5000);
      }
    } catch (e) {
      setClaimResult({ success: false, message: "Network error occurred." });
    } finally {
      setIsClaiming(false);
    }
  }, [refreshTotalClaimed]);

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