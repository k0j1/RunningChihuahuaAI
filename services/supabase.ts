
import { createClient } from '@supabase/supabase-js';
import { ScoreEntry, PlayerStats, ItemType, UserInventory } from '../types';

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
      const username = row.username;
      if (!username) continue;
      if (seenUsernames.has(username)) continue;
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
      if (uniqueScores.length >= 100) break;
    }
    return uniqueScores;
  } catch (e) {
    return [];
  }
};

export const fetchUserHistory = async (username: string): Promise<ScoreEntry[]> => {
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];
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

    if (error) return [];
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

    if (error || !data) return null;

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
      lastStaminaUpdate: data.last_stamina_update,
      notificationToken: data.notification_token,
      notificationUrl: data.notification_url,
      lastLoginBonusTime: data.last_login_bonus // Updated column mapping
    };
  } catch (e) {
    return null;
  }
};

export const updateUserStamina = async (userId: string, newStamina: number, lastUpdate: string) => {
  try {
    await supabase
      .from('player_stats')
      .update({
        stamina: newStamina,
        last_stamina_update: lastUpdate,
        is_notify: false
      })
      .eq('user_id', userId);
  } catch (e) { }
};

export const updatePlayerProfile = async (farcasterUser: any, walletAddress: string | null, notificationDetails: {token: string, url: string} | null = null) => {
  // Logic to determine userId identical to fetchUserInventory
  let userId = null;
  if (farcasterUser?.username) userId = `fc:${farcasterUser.username}`;
  
  if (!userId) return;

  try {
    const { data: existing } = await supabase
      .from('player_stats')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const payload: any = {
      user_id: userId,
      // If Farcaster user is present, use their details, otherwise fallback or null
      username: farcasterUser?.username || null,
      display_name: farcasterUser?.displayName || null,
      pfp_url: farcasterUser?.pfpUrl || null,
      wallet_address: walletAddress || null,
      last_active: new Date().toISOString()
    };
    
    if (notificationDetails) {
      payload.notification_token = notificationDetails.token;
      payload.notification_url = notificationDetails.url;
    }

    if (existing) {
      await supabase.from('player_stats').update(payload).eq('user_id', userId);
    } else {
      await supabase.from('player_stats').insert({
        ...payload,
        notification_token: notificationDetails?.token || null,
        notification_url: notificationDetails?.url || null,
        total_score: 0,
        total_distance: 0,
        run_count: 0,
        stamina: 5,
        last_stamina_update: new Date().toISOString(),
        last_login_bonus: null
      });
    }

    // Initialize player_items with 0 if not exists
    await supabase.from('player_items').upsert(
      { 
        user_id: userId, 
        max_hp: 0, 
        heal: 0, 
        shield: 0 
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    );

  } catch (e) { }
};

export const saveScoreToSupabase = async (entry: ScoreEntry) => {
  if (!entry.farcasterUser?.username) return;
  const userId = `fc:${entry.farcasterUser.username}`;

  try {
    const payload = {
      score: entry.score,
      distance: entry.distance,
      username: entry.farcasterUser.username,
      display_name: entry.farcasterUser.displayName || null,
      pfp_url: entry.farcasterUser.pfpUrl || null,
      wallet_address: entry.walletAddress || null,
      created_at: entry.date
    };

    await supabase.from('scores').insert([payload]);
    
    const { data: currentStats } = await supabase
      .from('player_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
      
    const previousTotalScore = currentStats?.total_score ? Number(currentStats.total_score) : 0;
    const previousTotalDistance = currentStats?.total_distance ? Number(currentStats.total_distance) : 0;
    const previousRunCount = currentStats?.run_count ? Number(currentStats.run_count) : 0;

    await supabase.from('player_stats').upsert({
      user_id: userId,
      username: entry.farcasterUser.username,
      display_name: entry.farcasterUser.displayName || currentStats?.display_name || null,
      pfp_url: entry.farcasterUser.pfpUrl || currentStats?.pfp_url || null,
      wallet_address: entry.walletAddress || currentStats?.wallet_address || null,
      total_score: previousTotalScore + Number(entry.score),
      total_distance: previousTotalDistance + Number(entry.distance),
      run_count: previousRunCount + 1,
      last_active: entry.date
    });
  } catch (e) { }
};

// --- Inventory Systems ---

export const fetchUserInventory = async (farcasterUser: any, walletAddress: string | null): Promise<UserInventory> => {
  const inventory: UserInventory = {
    [ItemType.MAX_HP]: 0,
    [ItemType.HEAL_ON_DODGE]: 0,
    [ItemType.SHIELD]: 0,
    [ItemType.NONE]: 0,
  };

  let userId: string | null = null;
  if (farcasterUser?.username) {
    userId = `fc:${farcasterUser.username}`;
  }

  if (!userId) return inventory;

  try {
    const { data, error } = await supabase
      .from('player_items')
      .select('max_hp, heal, shield')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data) return inventory;

    inventory[ItemType.MAX_HP] = data.max_hp || 0;
    inventory[ItemType.HEAL_ON_DODGE] = data.heal || 0;
    inventory[ItemType.SHIELD] = data.shield || 0;

    return inventory;
  } catch (e) {
    return inventory;
  }
};

export const grantUserItem = async (farcasterUser: any, walletAddress: string | null, itemType: ItemType): Promise<boolean> => {
  if (itemType === ItemType.NONE) return false;
  
  let userId: string | null = null;
  if (farcasterUser?.username) {
    userId = `fc:${farcasterUser.username}`;
  }
  if (!userId) return false;

  let columnName = '';
  if (itemType === ItemType.MAX_HP) columnName = 'max_hp';
  else if (itemType === ItemType.HEAL_ON_DODGE) columnName = 'heal';
  else if (itemType === ItemType.SHIELD) columnName = 'shield';
  else return false;

  try {
    // 1. Fetch current quantity
    const { data, error: fetchError } = await supabase
      .from('player_items')
      .select(columnName)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) return false;
    
    // Default to 0 if not exists
    const currentQty = data ? (data as any)[columnName] : 0;

    // 2. Increment (Upsert)
    const { error: updateError } = await supabase
      .from('player_items')
      .upsert({ 
        user_id: userId, 
        [columnName]: currentQty + 1 
      }, { onConflict: 'user_id' });

    return !updateError;
  } catch (e) {
    console.error("Error granting item:", e);
    return false;
  }
};

export const consumeUserItem = async (farcasterUser: any, walletAddress: string | null, itemType: ItemType): Promise<boolean> => {
  if (itemType === ItemType.NONE) return true;

  let userId: string | null = null;
  if (farcasterUser?.username) {
    userId = `fc:${farcasterUser.username}`;
  }

  if (!userId) return false;

  let columnName = '';
  if (itemType === ItemType.MAX_HP) columnName = 'max_hp';
  else if (itemType === ItemType.HEAL_ON_DODGE) columnName = 'heal';
  else if (itemType === ItemType.SHIELD) columnName = 'shield';
  else return false; // Invalid item type

  try {
    // 1. Fetch current quantity
    const { data, error: fetchError } = await supabase
      .from('player_items')
      .select(columnName)
      .eq('user_id', userId)
      .single();

    if (fetchError || !data) return false;

    // Use keyof assertions to handle dynamic column access safely
    const currentQty = (data as any)[columnName];
    
    if (currentQty <= 0) {
      return false; // Not enough items
    }

    // 2. Decrement
    const { error: updateError } = await supabase
      .from('player_items')
      .update({ [columnName]: currentQty - 1 })
      .eq('user_id', userId);

    return !updateError;
  } catch (e) {
    console.error("Error consuming item:", e);
    return false;
  }
};

export const claimLoginBonus = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('player_stats')
      .update({ last_login_bonus: new Date().toISOString() })
      .eq('user_id', userId);

    return !error;
  } catch (e) {
    console.error("Error claiming login bonus:", e);
    return false;
  }
};
