
import { createClient } from '@supabase/supabase-js';
import { ScoreEntry, PlayerStats, ItemType, UserInventory } from '../types';

// 環境変数の取得と検証
// Viteのimport.meta.envと、AI Studio環境のprocess.envの両方をチェック
const envUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const envKey = import.meta.env.VITE_SUPABASE_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_KEY : undefined);

// 文字列かつ空でないことを確認
const hasValidUrl = typeof envUrl === 'string' && envUrl.trim().length > 0 && envUrl.startsWith('http');
const hasValidKey = typeof envKey === 'string' && envKey.trim().length > 0;
const isConfigured = hasValidUrl && hasValidKey;

if (!isConfigured) {
  console.warn("Supabase credentials are not set or invalid. Database features will be disabled (Guest Mode).", {
    hasUrl: !!envUrl,
    hasKey: !!envKey,
    urlValid: hasValidUrl
  });
}

// createClientがクラッシュしないよう、未設定時は安全なプレースホルダーを使用
const supabaseUrl = isConfigured ? envUrl! : 'https://placeholder.supabase.co';
const supabaseKey = isConfigured ? envKey! : 'placeholder-key';

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

export const fetchAdminPlayerStats = async (): Promise<any[]> => {
  if (!isConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('running_player_stats')
      .select(`
        fid,
        total_score,
        total_distance,
        run_count,
        last_active,
        stamina,
        last_stamina_update,
        notification_token,
        notification_url,
        last_login_bonus,
        max_hp,
        heal,
        shield,
        farcaster_users (
          username,
          display_name,
          pfp_url
        )
      `)
      .limit(100);

    if (error) throw error;

    return data.map(row => ({
        ...row,
        username: (row.farcaster_users as any)?.username,
        display_name: (row.farcaster_users as any)?.display_name,
        pfp_url: (row.farcaster_users as any)?.pfp_url
    })) || [];
  } catch (e) {
    console.error("Fetch admin player stats error:", e);
    return [];
  }
};

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
  if (!isConfigured) throw new Error("Database not configured");
  try {
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .order('score', { ascending: false })
      .limit(1000); 

    if (error) {
      console.error('Error fetching global ranking:', error);
      throw error;
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
          fid: row.fid,
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
        fid: row.fid,
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
  if (!isConfigured) throw new Error("Database not configured");
  try {
    const { data, error } = await supabase
      .from('running_player_stats')
      .select(`
        fid,
        total_score,
        total_distance,
        run_count,
        last_active,
        farcaster_users (
          username,
          display_name,
          pfp_url
        )
      `)
      .gt('total_score', 0)
      .order('total_score', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching total ranking:', error);
      throw error;
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.fid.toString(),
      farcasterUser: row.farcaster_users ? {
        fid: row.fid,
        username: row.farcaster_users.username,
        displayName: row.farcaster_users.display_name,
        pfpUrl: row.farcaster_users.pfp_url
      } : undefined,
      totalScore: row.total_score || 0,
      totalDistance: row.total_distance || 0,
      runCount: row.run_count || 0,
      lastActive: row.last_active
    }));
  } catch (e) {
    return [];
  }
};

export const fetchUserStats = async (fid: number): Promise<PlayerStats | null> => {
  if (!isConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('running_player_stats')
      .select(`
        fid,
        total_score,
        total_distance,
        run_count,
        last_active,
        stamina,
        last_stamina_update,
        notification_token,
        notification_url,
        last_login_bonus,
        max_hp,
        heal,
        shield,
        farcaster_users (
          username,
          display_name,
          pfp_url
        )
      `)
      .eq('fid', fid.toString())
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.fid.toString(),
      farcasterUser: (data.farcaster_users as any) ? {
        fid: data.fid,
        username: (data.farcaster_users as any).username,
        displayName: (data.farcaster_users as any).display_name,
        pfpUrl: (data.farcaster_users as any).pfp_url
      } : undefined,
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

export const updateUserStamina = async (fid: number, newStamina: number, lastUpdate: string) => {
  if (!isConfigured) return;
  try {
    await supabase
      .from('running_player_stats')
      .update({
        stamina: newStamina,
        last_stamina_update: lastUpdate,
        is_notify: false
      })
      .eq('fid', fid.toString());
  } catch (e) { }
};

export const updatePlayerProfile = async (farcasterUser: any, walletAddress: string | null, notificationDetails: {token: string, url: string} | null = null) => {
  if (!isConfigured) return;
  
  if (!farcasterUser?.fid) return;

  try {
    const { data: existing } = await supabase
      .from('running_player_stats')
      .select('fid')
      .eq('fid', farcasterUser.fid.toString())
      .maybeSingle();

    const payload: any = {
      fid: farcasterUser.fid,
      wallet_address: walletAddress || null,
      last_active: new Date().toISOString()
    };
    
    if (notificationDetails) {
      payload.notification_token = notificationDetails.token;
      payload.notification_url = notificationDetails.url;
    }

    if (existing) {
      await supabase.from('running_player_stats').update(payload).eq('fid', farcasterUser.fid.toString());
    } else {
      await supabase.from('running_player_stats').insert({
        ...payload,
        notification_token: notificationDetails?.token || null,
        notification_url: notificationDetails?.url || null,
        total_score: 0,
        total_distance: 0,
        run_count: 0,
        stamina: 5,
        last_stamina_update: new Date().toISOString(),
        last_login_bonus: null,
        max_hp: 0,
        heal: 0,
        shield: 0
      });
    }

    await supabase.from('farcaster_users').upsert({
        fid: farcasterUser.fid,
        username: farcasterUser.username,
        display_name: farcasterUser.displayName,
        pfp_url: farcasterUser.pfpUrl
    }, { onConflict: 'fid' });

  } catch (e) { }
};

export const saveScoreToSupabase = async (entry: ScoreEntry) => {
  if (!isConfigured) return;
  if (!entry.farcasterUser?.fid) return;
  const fid = entry.farcasterUser.fid;

  try {
    const payload = {
      score: entry.score,
      distance: entry.distance,
      created_at: entry.date,
      username: entry.farcasterUser?.username,
      display_name: entry.farcasterUser?.displayName,
      pfp_url: entry.farcasterUser?.pfpUrl
    };

    await supabase.from('scores').insert([payload]);
    
    const { data: currentStats } = await supabase
      .from('running_player_stats')
      .select('*')
      .eq('fid', fid)
      .maybeSingle();
      
    const previousTotalScore = currentStats?.total_score ? Number(currentStats.total_score) : 0;
    const previousTotalDistance = currentStats?.total_distance ? Number(currentStats.total_distance) : 0;
    const previousRunCount = currentStats?.run_count ? Number(currentStats.run_count) : 0;

    await supabase.from('running_player_stats').upsert({
      fid: fid,
      total_score: previousTotalScore + Number(entry.score),
      total_distance: previousTotalDistance + Number(entry.distance),
      run_count: previousRunCount + 1,
      last_active: entry.date
    });
  } catch (e) { }
};

// --- Inventory Systems ---

export const fetchUserInventory = async (farcasterUser: any): Promise<UserInventory> => {
  const inventory: UserInventory = {
    [ItemType.MAX_HP]: 0,
    [ItemType.HEAL_ON_DODGE]: 0,
    [ItemType.SHIELD]: 0,
    [ItemType.NONE]: 0,
  };

  if (!isConfigured) return inventory;

  if (!farcasterUser?.fid) return inventory;

  try {
    const { data, error } = await supabase
      .from('running_player_stats')
      .select('max_hp, heal, shield')
      .eq('fid', farcasterUser.fid)
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

export const grantUserItem = async (farcasterUser: any, itemType: ItemType): Promise<boolean> => {
  if (!isConfigured) return false;
  if (itemType === ItemType.NONE) return false;
  
  if (!farcasterUser?.fid) return false;

  let columnName = '';
  if (itemType === ItemType.MAX_HP) columnName = 'max_hp';
  else if (itemType === ItemType.HEAL_ON_DODGE) columnName = 'heal';
  else if (itemType === ItemType.SHIELD) columnName = 'shield';
  else return false;

  try {
    const { data, error: fetchError } = await supabase
      .from('running_player_stats')
      .select(columnName)
      .eq('fid', farcasterUser.fid)
      .maybeSingle();

    if (fetchError) return false;
    
    const currentQty = data ? (data as any)[columnName] : 0;

    const { error: updateError } = await supabase
      .from('running_player_stats')
      .update({ 
        [columnName]: currentQty + 1 
      })
      .eq('fid', farcasterUser.fid);

    return !updateError;
  } catch (e) {
    return false;
  }
};

export const consumeUserItem = async (farcasterUser: any, itemType: ItemType): Promise<boolean> => {
  if (!isConfigured) return false;
  if (itemType === ItemType.NONE) return true;

  if (!farcasterUser?.fid) return false;

  let columnName = '';
  if (itemType === ItemType.MAX_HP) columnName = 'max_hp';
  else if (itemType === ItemType.HEAL_ON_DODGE) columnName = 'heal';
  else if (itemType === ItemType.SHIELD) columnName = 'shield';
  else return false;

  try {
    const { data, error: fetchError } = await supabase
      .from('running_player_stats')
      .select(columnName)
      .eq('fid', farcasterUser.fid)
      .single();

    if (fetchError || !data) return false;

    const currentQty = (data as any)[columnName];
    
    if (currentQty <= 0) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('running_player_stats')
      .update({ [columnName]: currentQty - 1 })
      .eq('fid', farcasterUser.fid);

    return !updateError;
  } catch (e) {
    return false;
  }
};

export const claimLoginBonus = async (fid: number): Promise<boolean> => {
  if (!isConfigured) return false;
  try {
    const { error } = await supabase
      .from('running_player_stats')
      .update({ 
        last_login_bonus: new Date().toISOString()
      })
      .eq('fid', fid);

    return !error;
  } catch (e) {
    return false;
  }
};
