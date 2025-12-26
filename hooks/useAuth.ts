import { useState, useEffect, useCallback } from 'react';
import sdk from '@farcaster/frame-sdk';
import { updatePlayerProfile } from '../services/supabase';

export const useAuth = () => {
  const [farcasterUser, setFarcasterUser] = useState<{username?: string, displayName?: string, pfpUrl?: string, fid?: number} | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState<boolean>(true); // Default true to avoid flash
  const [notificationDetails, setNotificationDetails] = useState<{token: string, url: string} | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);

  // Initialize Farcaster SDK
  useEffect(() => {
    const load = async () => {
      setFarcasterUser(null);
      try {
        // First ensure the SDK is ready before any context or provider calls
        await sdk.actions.ready();
        
        const context = await sdk.context;
        if (context?.user) {
          const user = context.user;
          
          setFarcasterUser({
            username: user.username,
            displayName: user.displayName,
            pfpUrl: user.pfpUrl,
            fid: user.fid
          });
          
          // Check if app is added to user's launcher/sidebar
          setIsAdded(!!context.client?.added);
          
          // Capture notification details if available
          if (context.client?.notificationDetails) {
            setNotificationDetails({
              token: context.client.notificationDetails.token,
              url: context.client.notificationDetails.url
            });
          }
        }
      } catch (error) {
        console.warn("Farcaster SDK load warning:", error);
      }
    };
    
    if (sdk && !isSDKLoaded) {
      setIsSDKLoaded(true);
      load();
    }
  }, [isSDKLoaded]);

  // Check for connected wallet (Farcaster Provider Only)
  useEffect(() => {
    if (!isSDKLoaded) return;

    const checkWallet = async () => {
      try {
        const provider = sdk.wallet.ethProvider;
        if (provider) {
           try {
             const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
             if (Array.isArray(accounts) && accounts.length > 0) {
               setWalletAddress(accounts[0]);
             }
           } catch (reqErr) {
             console.log("eth_accounts silent failure:", reqErr);
           }
        }
      } catch (e) {
        console.warn("Error checking Farcaster wallet status:", e);
      }
    };

    checkWallet();
  }, [isSDKLoaded]);

  // Sync profile data to Supabase when user/wallet/notification info changes
  useEffect(() => {
    if (farcasterUser) {
      updatePlayerProfile(farcasterUser, walletAddress, notificationDetails);
    }
  }, [farcasterUser, walletAddress, notificationDetails]);

  const connectWallet = useCallback(async () => {
    try {
      const provider = sdk.wallet.ethProvider;
      if (provider) {
        try {
          const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
          if (Array.isArray(accounts) && accounts.length > 0) {
            setWalletAddress(accounts[0]);
            return;
          }
        } catch (sdkReqErr: any) {
          console.warn("SDK eth_requestAccounts failed:", sdkReqErr);
        }
      }
    } catch (e) {
      console.warn("Farcaster Wallet Provider failed:", e);
    }
    // MetaMask/window.ethereum fallback removed as requested.
  }, []);

  const addMiniApp = useCallback(async () => {
    try {
      const result = await (sdk.actions as any).addFrame();
      if (result) {
        setIsAdded(true);
        if (result.notificationDetails) {
          setNotificationDetails({
            token: result.notificationDetails.token,
            url: result.notificationDetails.url
          });
        }
      }
    } catch (error) {
      console.error("Error adding mini app:", error);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWalletAddress(null);
  }, []);

  return {
    farcasterUser,
    walletAddress,
    isAdded,
    notificationDetails,
    connectWallet,
    disconnectWallet,
    addMiniApp
  };
};