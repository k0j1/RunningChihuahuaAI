
import { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';

export const useAuth = () => {
  const [farcasterUser, setFarcasterUser] = useState<{username?: string, displayName?: string, pfpUrl?: string, fid?: number} | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  // Initialize Farcaster SDK
  useEffect(() => {
    const load = async () => {
      setFarcasterUser(null);
      try {
        const context = await sdk.context;
        if (context?.user) {
          const user = context.user;
          
          setFarcasterUser({
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl,
            fid: user.fid
          });
        }
      } catch (error) {
        console.warn("Farcaster SDK load warning:", error);
      } finally {
        sdk.actions.ready();
      }
    };
    
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Check for connected wallet (Farcaster Provider)
  useEffect(() => {
    if (!isSDKLoaded) return;

    const checkWallet = async () => {
      try {
        const provider = sdk.wallet.ethProvider;
        if (provider) {
           const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
           if (Array.isArray(accounts) && accounts.length > 0) {
             setWalletAddress(accounts[0]);
           }
        }
      } catch (e) {
        console.warn("Error checking wallet status:", e);
      }
    };

    checkWallet();
  }, [isSDKLoaded]);

  const connectWallet = useCallback(async () => {
    try {
      // 1. Try Farcaster Frame SDK Provider
      const provider = sdk.wallet.ethProvider;
      if (provider) {
        const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
        if (Array.isArray(accounts) && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          return;
        }
      }
    } catch (e) {
      console.warn("Farcaster Wallet Provider failed:", e);
    }

    // 2. Fallback to window.ethereum
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error("User denied account access or error", error);
      }
    } else {
      alert("No wallet provider found. Please use Warpcast or a Web3 browser.");
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return {
    farcasterUser,
    walletAddress,
    connectWallet,
    disconnectWallet
  };
};
