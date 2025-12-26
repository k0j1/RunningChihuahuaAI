import { useState, useEffect, useRef } from 'react';
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

  // Logical trackers to throttle UI updates
  const distanceRef = useRef(0);
  
  // Load history & rankings on mount (Ranking only)
  useEffect(() => {
    // Only load local history if we have a Farcaster user context
    if (farcasterUser) {
      const saved = localStorage.getItem(`chihuahua_history_${farcasterUser.username}`);
      if (saved) {
        try {
          setHistory(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse history", e);
        }
      }
    }
    loadRankings();
  }, [farcasterUser]);

  const loadRankings = async () => {
    const ranking = await fetchGlobalRanking();
    setGlobalRanking(ranking);
    const totals = await fetchTotalRanking();
    setTotalRanking(totals);
  };

  const resetScore = () => {
    setScore(0);
    setDistance(0);
    distanceRef.current = 0;
    setSpeed(2.0);
    setLastGameDate(null);
  };

  const addScore = (amount: number) => {
    // Ensure integer addition to prevent float bugs
    setScore(prev => Math.floor(prev + amount));
  };

  const updateDistance = (distDelta: number) => {
    const increment = distDelta / 10;
    const oldDist = distanceRef.current;
    const newDist = oldDist + increment;
    distanceRef.current = newDist;

    // Only update React State (triggering render) when integer part changes
    if (Math.floor(newDist) > Math.floor(oldDist)) {
        setDistance(Math.floor(newDist));
        
        // Add 10 points per meter
        setScore(prev => prev + 10);
        
        // Speed check based on Ref logic
        if (Math.floor(newDist / 50) > Math.floor(oldDist / 50)) {
           setSpeed(s => Math.min(s + (0.2 * (2/3)), 5.0)); 
        }
    }
  };

  const saveRun = async (isDemoMode: boolean = false, finalScoreOverride?: number) => {
    // Strictly require Farcaster User for any saving functionality
    if (!farcasterUser) {
      console.log("Non-Farcaster User: Score registration disabled.");
      return;
    }

    if (isDemoMode) {
      console.log("Demo Mode: Score not saved.");
      return;
    }

    const currentScore = finalScoreOverride !== undefined ? finalScoreOverride : score;

    // Check for zero values to prevent saving empty runs.
    if (currentScore <= 0) {
      console.log("Score is zero. Skipping save.");
      return;
    }

    const now = new Date();
    const formattedDate = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const isoDate = now.toISOString();

    const newEntry: ScoreEntry = {
      date: isoDate,
      formattedDate: formattedDate,
      score: currentScore,
      distance: Math.floor(distanceRef.current),
      farcasterUser: {
        fid: farcasterUser.fid, 
        username: farcasterUser.username || '',
        displayName: farcasterUser.displayName || '',
        pfpUrl: farcasterUser.pfpUrl || ''
      },
      walletAddress: walletAddress || undefined
    };
    
    setLastGameDate(isoDate); 
    
    // Save locally (scoped to user)
    const newHistory = [newEntry, ...history].slice(0, 100); 
    setHistory(newHistory);
    localStorage.setItem(`chihuahua_history_${farcasterUser.username}`, JSON.stringify(newHistory));

    // Save to server
    try {
        await saveScoreToSupabase(newEntry);
        await loadRankings();
    } catch (e) {
        console.error("Failed to save score to server:", e);
    }
  };

  return {
    score, distance, speed,
    history, globalRanking, totalRanking, lastGameDate,
    resetScore, addScore, updateDistance, saveRun, loadRankings
  };
};