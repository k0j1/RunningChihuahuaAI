import { useState, useCallback } from 'react';
import { claimTokenReward } from '../services/contracts/scoreService';
import { ClaimResult } from '../types';

export const useRewardSystem = () => {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [totalClaimed, setTotalClaimed] = useState<number>(0);

  const refreshTotalClaimed = useCallback(async (walletAddress: string) => {
    // 将来的にはここでfetchDailyClaimCountを呼ぶことも可能
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
