import { supabase } from './supabase';
import { ClaimResult } from '../types';

export const claimTokenReward = async (walletAddress: string, score: number): Promise<ClaimResult> => {
  try {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('claim-reward', {
      body: { walletAddress, score }
    });

    if (error) {
      throw new Error(error.message || 'Failed to invoke function');
    }

    if (!data.success) {
      throw new Error(data.message || 'Claim failed');
    }

    return data as ClaimResult;

  } catch (error: any) {
    console.error("Token Claim Error:", error);
    return {
      success: false,
      message: error.message || "Unknown error occurred during claim."
    };
  }
};