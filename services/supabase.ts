import { createClient } from '@supabase/supabase-js';
import { ScoreEntry } from '../types';

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
    console.error('Error fetching global ranking:', error);
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

export const saveScoreToSupabase = async (entry: ScoreEntry) => {
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
    console.error('Error saving score to Supabase:', error);
  }
};