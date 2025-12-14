
import { useState, useEffect } from 'react';
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
          
          // Wallet Extraction Logic
          // We prioritize:
          // 1. First Verified Address (Linked identity)
          // 2. Custody Address (FID owner)
          let extractedAddress: string | null = null;
          
          // Cast to any to access properties that might not be in the type definition
          const userAny = user as any;

          if (userAny.verifications && Array.isArray(userAny.verifications) && userAny.verifications.length > 0) {
             extractedAddress = userAny.verifications[0];
          } else if (userAny.custodyAddress) {
             extractedAddress = userAny.custodyAddress;
          }

          if (extractedAddress) {
             console.log("Farcaster Wallet Extracted:", extractedAddress);
             setWalletAddress(extractedAddress);
          }
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

  const connectWallet = async () => {
    try {
      // 1. Try Farcaster Frame SDK Provider
      // Access the provider directly as a property
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
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
  };

  return {
    farcasterUser,
    walletAddress,
    connectWallet,
    disconnectWallet
  };
};
