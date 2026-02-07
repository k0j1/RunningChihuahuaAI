
import { createClient } from '@supabase/supabase-js';
import { ScoreEntry, PlayerStats, ItemType, UserInventory } from '../types';

// 環境変数の取得と検証
const envUrl = process.env.VITE_SUPABASE_URL;
const envKey = process.env.VITE_SUPABASE_KEY;

// 文字列かつ空でないことを確認
const hasValidUrl = typeof envUrl === 'string' && envUrl.trim().length > 0;
const hasValidKey = typeof envKey === 'string' && envKey.trim().length > 0;
const isConfigured = hasValidUrl && hasValidKey;

// createClientがクラッシュしないよう、未設定時は安全なプレースホルダーを使用
// 注: isConfiguredがfalseの場合、各関数で即座にreturnするため、このプレースホルダーURLにリクエストが飛ぶことはありません
const supabaseUrl = isConfigured ? envUrl! : 'https://placeholder.supabase.co';
const supabaseKey = isConfigured ? envKey! : 'placeholder-key';

if (!isConfigured) {
  console.warn("Supabase credentials are not set or invalid. Database features will be disabled (Guest Mode).");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const isNetworkError = (error: any) => {
  return error && (
    (error.message && error.message.includes('Failed to fetch')) ||
    (error.details && error.details.includes('Failed to fetch'))
  );
};

// --- Security / Maintenance Functions ---

export const checkIfUserIsBlocked = async (fid: number): Promise<boolean> => {
  if (!isConfigured) return false;
  try {
    const { data, error } = await supabase
      .from('blocked_users')
      .select('fid')
      .eq('fid', fid)
      .maybeSingle();

    if (error) {
      console.warn("Block check failed:", error);
      return false;
    }
    
    // データが存在すればブロック対象
    return !!data;
  } catch (e) {
    console.error("Exception checking blocked status:", e);
    return false;
  }
};

// --- Admin Functions ---

export const fetchAdminTableData = async (tableName: string): Promise<any[]> => {
  if (!isConfigured) return [];
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: false }) 
      .limit(100);

    if (error) {
      // created_atがないテーブルのためのリトライ
      const { data: retryData, error: retryError } = await supabase
        .from(tableName)
        .select('*')
        .limit(100);
        
      if (retryError) throw retryError;
      return retryData || [];
    }

    return data || [];
  } catch (e) {
    console.error(`Fetch admin data error for ${tableName}:`, e);
    return [];
  }
};

export const fetchGlobalRanking = async (): Promise<ScoreEntry[]> => {
  if (!isConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(1000); 

    if (error) {
      if (!isNetworkError(error)) {
        console.error('Error fetching global ranking:', error);
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
    console.error("Exception in fetchGlobalRanking:", e);
    return [];
  }
};

export const fetchUserHistory = async (username: string): Promise<ScoreEntry[]> => {
  if (!isConfigured) return [];
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
  if (!isConfigured) return [];
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
  if (!isConfigured) return null;
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
      lastLoginBonusTime: data.last_login_bonus
    };
  } catch (e) {
    return null;
  }
};

export const updateUserStamina = async (userId: string, newStamina: number, lastUpdate: string) => {
  if (!isConfigured) return;
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
  if (!isConfigured) return;
  
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
  if (!isConfigured) return;
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

  if (!isConfigured) return inventory;

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
  if (!isConfigured) return false;
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
    const { data, error: fetchError } = await supabase
      .from('player_items')
      .select(columnName)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) return false;
    
    const currentQty = data ? (data as any)[columnName] : 0;

    const { error: updateError } = await supabase
      .from('player_items')
      .upsert({ 
        user_id: userId, 
        [columnName]: currentQty + 1 
      }, { onConflict: 'user_id' });

    return !updateError;
  } catch (e) {
    return false;
  }
};

export const consumeUserItem = async (farcasterUser: any, walletAddress: string | null, itemType: ItemType): Promise<boolean> => {
  if (!isConfigured) return false;
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
  else return false;

  try {
    const { data, error: fetchError } = await supabase
      .from('player_items')
      .select(columnName)
      .eq('user_id', userId)
      .single();

    if (fetchError || !data) return false;

    const currentQty = (data as any)[columnName];
    
    if (currentQty <= 0) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('player_items')
      .update({ [columnName]: currentQty - 1 })
      .eq('user_id', userId);

    return !updateError;
  } catch (e) {
    return false;
  }
};

export const claimLoginBonus = async (userId: string): Promise<boolean> => {
  if (!isConfigured) return false;
  try {
    const { error } = await supabase
      .from('player_stats')
      .update({ 
        last_login_bonus: new Date().toISOString()
      })
      .eq('user_id', userId);

    return !error;
  } catch (e) {
    return false;
  }
};
