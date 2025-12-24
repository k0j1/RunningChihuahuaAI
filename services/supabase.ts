import { createClient } from '@supabase/supabase-js';
import { ScoreEntry, PlayerStats } from '../types';

// Use environment variables if available, otherwise fallback to the provided hardcoded values
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dgnjpvrzxmmargbkypgh.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnbmpwdnJ6eG1tYXJnYmt5cGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzM5NTAsImV4cCI6MjA4MDk0OTk1MH0.Vjq0nRnrVFYwtbKO5921qgA7ndA3hWRNwZSsnt2fHX0';

export const supabase = createClient(supabaseUrl, supabaseKey);

const isNetworkError = (error: any) => {
  return error && (
    (error.message && error.message.includes('Failed to fetch')) ||
    (error.details && error.details.includes('Failed to fetch'))
  );
};

export const fetchGlobalRanking = async (): Promise<ScoreEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(100);

    if (error) {
      if (!isNetworkError(error)) {
        console.error('Error fetching global ranking:', JSON.stringify(error));
      }
      return [];
    }

    if (!data) return [];

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
  } catch (e) {
    // Silent catch for network issues
    return [];
  }
};

// Fetch aggregated total stats directly from the 'player_stats' table
export const fetchTotalRanking = async (): Promise<PlayerStats[]> => {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .gt('total_score', 0) // Filter out users with 0 score
      .order('total_score', { ascending: false })
      .limit(100);

    if (error) {
      if (!isNetworkError(error)) {
        console.error('Error fetching player_stats:', JSON.stringify(error));
      }
      return [];
    }

    if (!data) return [];

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
  } catch (e) {
    return [];
  }
};

export const fetchUserStats = async (userId: string): Promise<PlayerStats | null> => {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (!isNetworkError(error)) {
        console.error('Error fetching user stats:', error);
      }
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
  } catch (e) {
    return null;
  }
};

export const updateUserStamina = async (userId: string, newStamina: number, lastUpdate: string) => {
  try {
    const { error } = await supabase
      .from('player_stats')
      .update({
        stamina: newStamina,
        last_stamina_update: lastUpdate
      })
      .eq('user_id', userId);

    if (error && !isNetworkError(error)) {
      console.error('Error updating stamina:', error);
    }
  } catch (e) {
    // Ignore
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
    if (userId.startsWith('fc:') && walletAddress) {
      const ghostId = `wa:${walletAddress}`;
      const { data: ghost, error: ghostError } = await supabase
        .from('player_stats')
        .select('*')
        .eq('user_id', ghostId)
        .maybeSingle();

      if (!ghostError && ghost) {
        console.log(`Found duplicate wallet record (${ghostId}). Merging into ${userId}...`);
        
        const { data: main, error: mainError } = await supabase
          .from('player_stats')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!mainError) {
          if (main) {
            await supabase.from('player_stats').update({
              total_score: (main.total_score || 0) + (ghost.total_score || 0),
              total_distance: (main.total_distance || 0) + (ghost.total_distance || 0),
              run_count: (main.run_count || 0) + (ghost.run_count || 0),
              last_active: new Date(main.last_active) > new Date(ghost.last_active) ? main.last_active : ghost.last_active,
            }).eq('user_id', userId);
          } else {
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
          await supabase.from('player_stats').delete().eq('user_id', ghostId);
        }
      }
    }

    let finalWalletAddress = walletAddress;
    if (finalWalletAddress) {
       const { data: conflict, error: conflictError } = await supabase
         .from('player_stats')
         .select('user_id')
         .eq('wallet_address', finalWalletAddress)
         .neq('user_id', userId)
         .maybeSingle();
       
       if (!conflictError && conflict) {
         console.warn(`Wallet ${finalWalletAddress} is already registered to ${conflict.user_id}. Preventing duplicate.`);
         if (userId.startsWith('wa:')) {
           return; 
         }
         finalWalletAddress = null;
       }
    }

    const { data: existing, error: fetchError } = await supabase
      .from('player_stats')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError && !isNetworkError(fetchError)) {
       console.warn("Error fetching profile stats:", fetchError);
    }

    const payload = {
      user_id: userId,
      username: farcasterUser?.username || null,
      display_name: farcasterUser?.displayName || null,
      pfp_url: farcasterUser?.pfpUrl || null,
      wallet_address: finalWalletAddress || null,
      last_active: new Date().toISOString()
    };

    if (existing) {
      await supabase
        .from('player_stats')
        .update(payload)
        .eq('user_id', userId);
    } else {
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
         if (!insertError.message.includes('duplicate key') && !isNetworkError(insertError)) {
             console.warn("Error inserting new player profile:", insertError);
         }
      }
    }
  } catch (e) {
    // Ignore errors
  }
};

export const saveScoreToSupabase = async (entry: ScoreEntry) => {
  let userId = null;
  if (entry.farcasterUser?.username) {
    userId = `fc:${entry.farcasterUser.username}`;
  } else if (entry.walletAddress) {
    userId = `wa:${entry.walletAddress}`;
  }

  if (!userId) {
    console.log('Guest score not saved to Supabase (Ranking is for logged-in users only).');
    return;
  }

  const payload = {
    score: entry.score,
    distance: entry.distance,
    username: entry.farcasterUser?.username || null,
    display_name: entry.farcasterUser?.displayName || null,
    pfp_url: entry.farcasterUser?.pfpUrl || null,
    wallet_address: entry.walletAddress || null,
    created_at: entry.date
  };

  try {
    const { error } = await supabase.from('scores').insert([payload]);
    
    if (error) {
      if (!isNetworkError(error)) {
        console.error('Error saving score to Supabase:', JSON.stringify(error));
      }
    } else {
      console.log('Score saved to Supabase successfully');
    }

    let walletForStats = entry.walletAddress || null;
    if (walletForStats) {
       const { data: conflict } = await supabase
         .from('player_stats')
         .select('user_id')
         .eq('wallet_address', walletForStats)
         .neq('user_id', userId)
         .maybeSingle();

       if (conflict) {
          walletForStats = null;
       }
    }

    const { data: currentStats } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    const previousTotalScore = currentStats?.total_score ? Number(currentStats.total_score) : 0;
    const previousTotalDistance = currentStats?.total_distance ? Number(currentStats.total_distance) : 0;
    const previousRunCount = currentStats?.run_count ? Number(currentStats.run_count) : 0;

    const newStats = {
      user_id: userId,
      username: entry.farcasterUser?.username || currentStats?.username || null,
      display_name: entry.farcasterUser?.displayName || currentStats?.display_name || null,
      pfp_url: entry.farcasterUser?.pfpUrl || currentStats?.pfp_url || null,
      wallet_address: walletForStats || currentStats?.wallet_address || null,
      
      total_score: previousTotalScore + Number(entry.score),
      total_distance: previousTotalDistance + Number(entry.distance),
      run_count: previousRunCount + 1,
      
      last_active: entry.date
    };

    const { error: statsError } = await supabase
      .from('player_stats')
      .upsert(newStats);

    if (statsError && !isNetworkError(statsError)) {
       console.error('Error updating player stats:', JSON.stringify(statsError));
    }
  } catch (e) {
    // Ignore
  }
};
