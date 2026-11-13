// Supabase storage adapter — key-value JSON بۆ هەموو localStorage keys
const APP_DATA_TABLE = "app_data";

async function supabaseGetAll() {
  const sb = await window.SupabaseDB.getClient();
  if (!sb) return null;
  const { data, error } = await sb.from(APP_DATA_TABLE).select("key,value");
  if (error) return null;
  const out = {};
  (data || []).forEach((r) => {
    out[r.key] = r.value;
  });
  return out;
}

async function supabasePutAll(payload) {
  const sb = await window.SupabaseDB.getClient();
  if (!sb) return false;
  const rows = Object.keys(payload).map((key) => ({
    key,
    value: payload[key] ?? [],
    updated_at: new Date().toISOString(),
  }));
  const { error } = await sb.from(APP_DATA_TABLE).upsert(rows, { onConflict: "key" });
  return !error;
}

window.RemoteDB = {
  supabaseGetAll,
  supabasePutAll,
  isReady: () => !!(window.SupabaseDB && window.SupabaseDB.isReady()),
};
