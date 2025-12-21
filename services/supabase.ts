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
    .gt('total_score', 0) // Filter out users with 0 score
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

export const fetchUserStats = async (userId: string): Promise<PlayerStats | null> => {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.user_id,
    farcasterUser: data.username ? {
      username: data.username,
      displayName: data.display_name,
      pfpUrl: data.pfp_url
    } : undefined,
    walletAddress: data.wallet_address,
    totalScore: data.total_score || 0,
    totalDistance: data.total_distance || 0,
    runCount: data.run_count || 0,
    lastActive: data.last_active,
    stamina: data.stamina, // Assumes column exists, undefined otherwise
    lastStaminaUpdate: data.last_stamina_update // Assumes column exists
  };
};

export const updateUserStamina = async (userId: string, newStamina: number, lastUpdate: string) => {
  const { error } = await supabase
    .from('player_stats')
    .update({
      stamina: newStamina,
      last_stamina_update: lastUpdate
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating stamina:', error);
  }
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

  try {
    // --- DUPLICATE CHECK & CLEANUP ---
    // If identifying as a Farcaster User (fc:...) AND a wallet is present,
    // check if a 'wa:...' record already exists for this wallet.
    // If so, merge stats into the 'fc:...' record and delete the 'wa:...' record.
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
            last_active: new Date(main.last_active) > new Date(ghost.last_active) ? main.last_active : ghost.last_active,
            // Prefer the main record stamina unless ghost has better logic, but simpler to just keep main
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
            last_active: ghost.last_active,
            stamina: ghost.stamina,
            last_stamina_update: ghost.last_stamina_update
          });
        }

        // Delete the duplicate wallet record
        await supabase.from('player_stats').delete().eq('user_id', ghostId);
      }
    }
    // ---------------------------------

    // --- Prevent wallet address duplication on different users ---
    let finalWalletAddress = walletAddress;
    if (finalWalletAddress) {
       const { data: conflict } = await supabase
         .from('player_stats')
         .select('user_id')
         .eq('wallet_address', finalWalletAddress)
         .neq('user_id', userId) // Check if owned by someone else
         .maybeSingle();
       
       if (conflict) {
         console.warn(`Wallet ${finalWalletAddress} is already registered to ${conflict.user_id}. Preventing duplicate.`);
         if (userId.startsWith('wa:')) {
           // If we are trying to register as a wallet-only user, but the wallet is taken, abort.
           return; 
         }
         // If Farcaster user, we allow profile update but DO NOT link the duplicate wallet.
         finalWalletAddress = null;
       }
    }

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
      wallet_address: finalWalletAddress || null,
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
      // Default stamina is 5
      const { error: insertError } = await supabase
        .from('player_stats')
        .insert({
          ...payload,
          total_score: 0,
          total_distance: 0,
          run_count: 0,
          stamina: 5,
          last_stamina_update: new Date().toISOString()
        });
        
      if (insertError) {
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
  try {
    // --- Prevent duplicate wallet address in stats ---
    let walletForStats = entry.walletAddress || null;
    if (walletForStats) {
       const { data: conflict } = await supabase
         .from('player_stats')
         .select('user_id')
         .eq('wallet_address', walletForStats)
         .neq('user_id', userId)
         .maybeSingle();

       if (conflict) {
          // Wallet belongs to someone else, don't write it to this user's stats
          walletForStats = null;
       }
    }

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
      wallet_address: walletForStats || currentStats?.wallet_address || null,
      
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