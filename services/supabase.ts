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

// Fetch aggregated total stats directly from the 'player_stats' table
export const fetchTotalRanking = async (): Promise<PlayerStats[]> => {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .order('total_score', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching player_stats:', JSON.stringify(error));
    return [];
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

// Sync user profile data (username, pfp, wallet) to player_stats without changing scores
export const updatePlayerProfile = async (farcasterUser: any, walletAddress: string | null) => {
  let userId = null;
  if (farcasterUser?.username) {
    userId = `fc:${farcasterUser.username}`;
  } else if (walletAddress) {
    userId = `wa:${walletAddress}`;
  }

  if (!userId) return;

  // We want to update metadata if the user exists, or insert new if not.
  // We should NOT overwrite score data if it exists.
  
  try {
    // --- DUPLICATE CHECK & CLEANUP ---
    // If identifying as a Farcaster User (fc:...) AND a wallet is present,
    // check if a 'wa:...' record already exists for this wallet.
    // If so, merge stats into the 'fc:...' record and delete the 'wa:...' record
    // to ensure only the Farcaster Username ID remains.
    if (userId.startsWith('fc:') && walletAddress) {
      const ghostId = `wa:${walletAddress}`;
      const { data: ghost } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', ghostId)
        .maybeSingle();

      if (ghost) {
        console.log(`Found duplicate wallet record (${ghostId}). Merging into ${userId}...`);
        
        // Check if main FC record exists
        const { data: main } = await supabase
          .from('player_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (main) {
          // Both exist: Merge stats to FC record
          await supabase.from('player_stats').update({
            total_score: (main.total_score || 0) + (ghost.total_score || 0),
            total_distance: (main.total_distance || 0) + (ghost.total_distance || 0),
            run_count: (main.run_count || 0) + (ghost.run_count || 0),
            // Use the most recent activity date
            last_active: new Date(main.last_active) > new Date(ghost.last_active) ? main.last_active : ghost.last_active
          }).eq('user_id', userId);
        } else {
          // FC record doesn't exist yet: Create it using Ghost's stats
          await supabase.from('player_stats').insert({
            user_id: userId,
            username: farcasterUser?.username || null,
            display_name: farcasterUser?.displayName || null,
            pfp_url: farcasterUser?.pfpUrl || null,
            wallet_address: walletAddress,
            total_score: ghost.total_score || 0,
            total_distance: ghost.total_distance || 0,
            run_count: ghost.run_count || 0,
            last_active: ghost.last_active
          });
        }

        // Delete the duplicate wallet record
        await supabase.from('player_stats').delete().eq('user_id', ghostId);
      }
    }
    // ---------------------------------

    // 1. Check if user exists (after potential migration above)
    const { data: existing, error: fetchError } = await supabase
      .from('player_stats')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) console.warn("Error fetching profile stats:", fetchError);

    const payload = {
      user_id: userId,
      username: farcasterUser?.username || null,
      display_name: farcasterUser?.displayName || null,
      pfp_url: farcasterUser?.pfpUrl || null,
      wallet_address: walletAddress || null,
      last_active: new Date().toISOString()
    };

    if (existing) {
      // Update only metadata fields
      await supabase
        .from('player_stats')
        .update(payload)
        .eq('user_id', userId);
    } else {
      // Insert new record with initialized stats
      // Note: If we did a migration insert above, 'existing' would be found (or concurrent insert would fail safely)
      // This handles the case where it's a completely new user.
      const { error: insertError } = await supabase
        .from('player_stats')
        .insert({
          ...payload,
          total_score: 0,
          total_distance: 0,
          run_count: 0
        });
        
      if (insertError) {
         // Ignore duplicate key error if migration just created it
         if (!insertError.message.includes('duplicate key')) {
             console.warn("Error inserting new player profile:", insertError);
         }
      }
    }
  } catch (e) {
    console.error("Error updating player profile:", e);
  }
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
  // This requires RLS policies to be set to allow INSERT/UPDATE on 'player_stats'
  try {
    // Fetch existing stats
    const { data: currentStats, error: fetchError } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
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
       console.error('Error updating player stats:', JSON.stringify(statsError));
    } else {
      console.log('Player stats updated successfully');
    }
  } catch (e) {
    console.error("Exception in saveScoreToSupabase stats update:", e);
  }
};