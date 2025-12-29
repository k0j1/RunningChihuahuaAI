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
    // Fetch a larger dataset to perform client-side deduplication
    // We assume the DB returns ordered by score DESC.
    // Query: select username, max(score) ... group by username
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(1000); 

    if (error) {
      if (!isNetworkError(error)) {
        console.error('Error fetching global ranking:', JSON.stringify(error));
      }
      return [];
    }

    if (!data) return [];

    const uniqueScores: ScoreEntry[] = [];
    const seenUsernames = new Set<string>();

    for (const row of data) {
      // Strictly group by username as requested.
      // If a record has no username, it is excluded from this specific leaderboard view.
      const username = row.username;

      if (!username) {
        continue;
      }

      if (seenUsernames.has(username)) {
        continue; // Skip if we've already seen a higher score for this user
      }
      seenUsernames.add(username);

      uniqueScores.push({
        date: row.created_at,
        formattedDate: new Date(row.created_at).toLocaleString(),
        score: row.score,
        distance: row.distance,
        farcasterUser: {
          username: row.username,
          displayName: row.display_name,
          pfpUrl: row.pfp_url
        },
        walletAddress: row.wallet_address
      });

      // Cap the displayed leaderboard to top 100 unique users
      if (uniqueScores.length >= 100) break;
    }

    return uniqueScores;
  } catch (e) {
    return [];
  }
};

/**
 * Fetches the score history for a specific user from the database.
 */
export const fetchUserHistory = async (username: string): Promise<ScoreEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (!isNetworkError(error)) {
        console.error('Error fetching user history:', JSON.stringify(error));
      }
      return [];
    }

    if (!data) return [];

    return data.map((row: any) => ({
      date: row.created_at,
      formattedDate: new Date(row.created_at).toLocaleString(),
      score: row.score,
      distance: row.distance,
      farcasterUser: {
        username: row.username,
        displayName: row.display_name,
        pfpUrl: row.pfp_url
      },
      walletAddress: row.wallet_address
    }));
  } catch (e) {
    return [];
  }
};

export const fetchTotalRanking = async (): Promise<PlayerStats[]> => {
  try {
    const { data, error } = await supabase
      .from('player_stats')
      .select('*')
      .gt('total_score', 0)
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
      stamina: data.stamina,
      lastStaminaUpdate: data.last_stamina_update
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

export const updatePlayerProfile = async (farcasterUser: any, walletAddress: string | null, notificationDetails: {token: string, url: string} | null = null) => {
  // STRICT REQUIREMENT: Only allow users with a Farcaster username.
  // No "ghost" records for anonymous wallets.
  if (!farcasterUser?.username) {
    return;
  }

  const userId = `fc:${farcasterUser.username}`;

  try {
    const { data: existing } = await supabase
      .from('player_stats')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const payload = {
      user_id: userId,
      username: farcasterUser.username,
      display_name: farcasterUser.displayName || null,
      pfp_url: farcasterUser.pfpUrl || null,
      wallet_address: walletAddress || null,
      last_active: new Date().toISOString(),
      notification_token: notificationDetails?.token || null,
      notification_url: notificationDetails?.url || null
    };

    if (existing) {
      await supabase.from('player_stats').update(payload).eq('user_id', userId);
    } else {
      await supabase.from('player_stats').insert({
        ...payload,
        total_score: 0,
        total_distance: 0,
        run_count: 0,
        stamina: 5,
        last_stamina_update: new Date().toISOString()
      });
    }
  } catch (e) {
    // Ignore errors
  }
};

export const saveScoreToSupabase = async (entry: ScoreEntry) => {
  // STRICT REQUIREMENT: Farcaster username required for saving scores and stats.
  if (!entry.farcasterUser?.username) {
    return;
  }

  const userId = `fc:${entry.farcasterUser.username}`;

  try {
    // Save to global scores table
    const payload = {
      score: entry.score,
      distance: entry.distance,
      username: entry.farcasterUser.username,
      display_name: entry.farcasterUser.displayName || null,
      pfp_url: entry.farcasterUser.pfpUrl || null,
      wallet_address: entry.walletAddress || null,
      created_at: entry.date
    };

    const { error } = await supabase.from('scores').insert([payload]);
    
    if (error && !isNetworkError(error)) {
      console.error('Error saving score to Supabase:', JSON.stringify(error));
    }

    // Update player_stats
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
      username: entry.farcasterUser.username,
      display_name: entry.farcasterUser.displayName || currentStats?.display_name || null,
      pfp_url: entry.farcasterUser.pfpUrl || currentStats?.pfp_url || null,
      wallet_address: entry.walletAddress || currentStats?.wallet_address || null,
      total_score: previousTotalScore + Number(entry.score),
      total_distance: previousTotalDistance + Number(entry.distance),
      run_count: previousRunCount + 1,
      last_active: entry.date
    };

    await supabase.from('player_stats').upsert(newStats);
  } catch (e) {
    // Ignore
  }
};