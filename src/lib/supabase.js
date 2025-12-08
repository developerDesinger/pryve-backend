const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for admin operations
let supabaseClient = null;

/**
 * Initialize and get Supabase client instance
 * Uses service role key for admin operations (bypasses RLS)
 */
function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error(
        'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
      );
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

/**
 * Get Supabase client for public operations (uses anon key)
 */
function getSupabasePublicClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.'
    );
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

module.exports = {
  getSupabaseClient,
  getSupabasePublicClient,
};

