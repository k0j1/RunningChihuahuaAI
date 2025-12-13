import { createClient } from '@supabase/supabase-js';
import { ScoreEntry, PlayerStats } from '../types';

// Use environment variables if available, otherwise fallback to the provided hardcoded values
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dgnjpvrzxmmargbkypgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbmpwdnJ6eG1tYXJnYmt5cGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzM5NTAsImV4cCI6MjA4MDk0OTk1MH0.Vjq0nRnrVFYwtbKO5921qgA7ndA3hWRNwZSsnt2fHX0';

export const supabase = createClient(supabaseUrl, supabaseKey);

export const fetchGlobalRanking = async (): Promise<ScoreEntry[]> => {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching global ranking:', JSON.stringify(error));
    return [];
  }

  // Map Supabase DB rows to ScoreEntry format
  return data.map((row: any) => ({
    date: row.created_at,
    formattedDate: new Date(row.created_at).toLocaleString(),
    score: row.score,
    distance: row.distance,
    farcasterUser: row.username ? {
      username: row.username,
      displayName: row.display_name,
      pfpUrl: row.pfp_url
    } : undefined,
    walletAddress: row.wallet_address
  }));
};

const aggregateStatsFromScores = async (): Promise<PlayerStats[]> => {
  // Fallback: Fetch a batch of scores to aggregate client-side if dedicated table is missing
  // We fetch up to 2000 records to get a decent representation without killing bandwidth
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .order('created_at', { ascending: false }) 
    .limit(2000);

  if (error) {
     console.error('Error fetching scores for aggregation:', JSON.stringify(error));
     return [];
  }

  const statsMap = new Map<string, PlayerStats>();

  data.forEach((row: any) => {
    let userId = null;
    if (row.username) userId = `fc:${row.username}`;
    else if (row.wallet_address) userId = `wa:${row.wallet_address}`;
    
    if (userId) {
       const existing = statsMap.get(userId) || {
         id: userId,
         farcasterUser: row.username ? { username: row.username, displayName: row.display_name, pfpUrl: row.pfp_url } : undefined,
         walletAddress: row.wallet_address,
         totalScore: 0,
         totalDistance: 0,
         runCount: 0,
         lastActive: row.created_at
       };
       
       existing.totalScore += (row.score || 0);
       existing.totalDistance += (row.distance || 0);
       existing.runCount += 1;
       
       // Update lastActive if this row is newer
       if (new Date(row.created_at).getTime() > new Date(existing.lastActive).getTime()) {
         existing.lastActive = row.created_at;
       }
       
       statsMap.set(userId, existing);
    }
  });

  return Array.from(statsMap.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 100);
};

// Fetch aggregated total stats from the 'player_stats' table
export const fetchTotalRanking = async (): Promise<PlayerStats[]> => {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .order('total_score', { ascending: false })
    .limit(100);

  if (error) {
    console.warn('Error fetching player_stats (falling back to aggregation):', JSON.stringify(error));
    return aggregateStatsFromScores();
  }

  return data.map((row: any) => ({
    id: row.user_id,
    farcasterUser: row.username ? {
      username: row.username,
      displayName: row.display_name,
      pfpUrl: row.pfp_url
    } : undefined,
    walletAddress: row.wallet_address,
    totalScore: row.total_score || 0,
    totalDistance: row.total_distance || 0,
    runCount: row.run_count || 0,
    lastActive: row.last_active
  }));
};

export const saveScoreToSupabase = async (entry: ScoreEntry) => {
  // Identify user key to see if they are logged in
  let userId = null;
  if (entry.farcasterUser?.username) {
    userId = `fc:${entry.farcasterUser.username}`;
  } else if (entry.walletAddress) {
    userId = `wa:${entry.walletAddress}`;
  }

  // If no user ID (Guest), do not save to database
  if (!userId) {
    console.log('Guest score not saved to Supabase (Ranking is for logged-in users only).');
    return;
  }

  // 1. Insert the single run score
  const payload = {
    score: entry.score,
    distance: entry.distance,
    username: entry.farcasterUser?.username || null,
    display_name: entry.farcasterUser?.displayName || null,
    pfp_url: entry.farcasterUser?.pfpUrl || null,
    wallet_address: entry.walletAddress || null,
    created_at: entry.date
  };

  const { error } = await supabase.from('scores').insert([payload]);
  
  if (error) {
    console.error('Error saving score to Supabase:', JSON.stringify(error));
  } else {
    console.log('Score saved to Supabase successfully');
  }

  // 2. Update player stats (totals)
  // Ensure we add the new score to the previous total
  try {
    // Fetch existing stats using maybeSingle to handle case where user doesn't exist yet gracefully
    const { data: currentStats, error: fetchError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    // If fetch failed for network reasons (not just "row not found"), we might want to log it
    if (fetchError) {
       console.warn('Error checking existing stats:', fetchError);
    }

    // Determine new totals
    const previousTotalScore = currentStats?.total_score ? Number(currentStats.total_score) : 0;
    const previousTotalDistance = currentStats?.total_distance ? Number(currentStats.total_distance) : 0;
    const previousRunCount = currentStats?.run_count ? Number(currentStats.run_count) : 0;

    const newStats = {
      user_id: userId,
      username: entry.farcasterUser?.username || currentStats?.username || null,
      display_name: entry.farcasterUser?.displayName || currentStats?.display_name || null,
      pfp_url: entry.farcasterUser?.pfpUrl || currentStats?.pfp_url || null,
      wallet_address: entry.walletAddress || currentStats?.wallet_address || null,
      
      // Accumulate: Add new entry values to previous totals
      total_score: previousTotalScore + Number(entry.score),
      total_distance: previousTotalDistance + Number(entry.distance),
      run_count: previousRunCount + 1,
      
      last_active: entry.date
    };

    const { error: statsError } = await supabase
      .from('player_stats')
      .upsert(newStats);

    if (statsError) {
       // Only warn if it's not a missing table error (42P01)
       if (statsError.code !== '42P01') {
         console.warn('Error updating player stats:', JSON.stringify(statsError));
       }
    } else {
      console.log('Player stats updated (accumulated) successfully');
    }
  } catch (e) {
    console.error("Exception in saveScoreToSupabase stats update:", e);
  }
};