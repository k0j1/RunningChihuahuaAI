
import { useState, useEffect } from 'react';
import sdk from '@farcaster/frame-sdk';
import { ScoreEntry, PlayerStats } from '../types';
import { fetchGlobalRanking, fetchTotalRanking, saveScoreToSupabase } from '../services/supabase';

export const useScoreSystem = (farcasterUser: any, walletAddress: string | null) => {
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [speed, setSpeed] = useState(2.0);
  const [history, setHistory] = useState<ScoreEntry[]>([]);
  const [globalRanking, setGlobalRanking] = useState<ScoreEntry[]>([]);
  const [totalRanking, setTotalRanking] = useState<PlayerStats[]>([]);
  const [lastGameDate, setLastGameDate] = useState<string | null>(null);

  // Load history & rankings on mount
  useEffect(() => {
    const saved = localStorage.getItem('chihuahua_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    loadRankings();
  }, []);

  const loadRankings = async () => {
    const ranking = await fetchGlobalRanking();
    setGlobalRanking(ranking);
    const totals = await fetchTotalRanking();
    setTotalRanking(totals);
  };

  const resetScore = () => {
    setScore(0);
    setDistance(0);
    setSpeed(2.0);
    setLastGameDate(null);
  };

  const addScore = (amount: number) => {
    setScore(prev => prev + amount);
  };

  const updateDistance = (distDelta: number) => {
    const increment = distDelta / 10;
    setDistance(prev => {
      const newDist = prev + increment;
      // Increase speed every 50m
      if (Math.floor(newDist / 50) > Math.floor(prev / 50)) {
         setSpeed(s => Math.min(s + (0.2 * (2/3)), 5.0)); 
      }
      return newDist;
    }); 
    setScore(prev => prev + 1);
  };

  const saveRun = async () => {
    let currentWalletAddress = walletAddress;

    // Try to fetch wallet address if missing, specifically for Farcaster context
    if (!currentWalletAddress) {
       try {
         const provider = sdk.wallet.ethProvider;
         if (provider) {
            const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
             if (Array.isArray(accounts) && accounts.length > 0) {
                 currentWalletAddress = accounts[0];
             }
         }
       } catch (e) {
         console.warn("Could not fetch wallet address on save:", e);
       }
    }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const isoDate = now.toISOString();

    const newEntry: ScoreEntry = {
      date: isoDate,
      formattedDate: formattedDate,
      score: score,
      distance: Math.floor(distance),
      farcasterUser: farcasterUser ? {
        fid: farcasterUser.fid, 
        username: farcasterUser.username || '',
        displayName: farcasterUser.displayName || '',
        pfpUrl: farcasterUser.pfpUrl || ''
      } : undefined,
      walletAddress: currentWalletAddress || undefined
    };
    
    setLastGameDate(isoDate); 
    
    // Save locally
    const newHistory = [newEntry, ...history].slice(0, 100); 
    setHistory(newHistory);
    localStorage.setItem('chihuahua_history', JSON.stringify(newHistory));

    // Save to server
    saveScoreToSupabase(newEntry).then(() => {
       loadRankings();
    });
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all game history?")) {
      setHistory([]);
      localStorage.removeItem('chihuahua_history');
    }
  };

  return {
    score, distance, speed,
    history, globalRanking, totalRanking, lastGameDate,
    resetScore, addScore, updateDistance, saveRun, clearHistory, loadRankings
  };
};
