// Supabase connection settings
const SUPABASE_URL = "https://znbhvjhlofvjhsephpbo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_zuTfskA3J-uULZ_aWETlhA_bm7q50SM";

const supabaseReady = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";

let clientPromise = null;

async function getClient() {
  if (!supabaseReady) return null;
  if (!clientPromise) {
    clientPromise = Promise.resolve().then(() => {
      if (window.supabase && window.supabase.createClient) {
        return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
      return import(
        "https://esm.sh/@supabase/supabase-js@2"
      ).then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
    });
  }
  return clientPromise;
}

window.SupabaseDB = { getClient, isReady: () => supabaseReady };
