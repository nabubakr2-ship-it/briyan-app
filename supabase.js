// Supabase connection settings
// ١. بچۆ https://supabase.com و projectێک دروست بکە
// ٢. لە Settings > API ئەم دوو بەهایە وەربگرە و لێرە دابنێ
const SUPABASE_URL = "https://znbhvjhlofvjhsephpbo.supabase.co"; // لە Settings > API: Project URL — بۆ نموونە https://xxxxx.supabase.co
const SUPABASE_ANON_KEY = "sb_publishable_zuTfskA3J-uULZ_aWETlhA_bm7q50SM"; // anon public key

const supabaseReady = SUPABASE_URL !== "" && SUPABASE_ANON_KEY !== "";

let clientPromise = null;

async function getClient() {
  if (!supabaseReady) return null;
  if (!clientPromise) {
    clientPromise = import(
      "https://esm.sh/@supabase/supabase-js@2"
    ).then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }
  return clientPromise;
}

window.SupabaseDB = { getClient, isReady: () => supabaseReady };
