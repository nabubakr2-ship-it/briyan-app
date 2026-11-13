// وەرگرتنی هەژمارەکان ڕاستەوخۆ لە Supabase — بۆ لاپەڕەکانی چوونەژوورەوە
const SB_URL = "https://znbhvjhlofvjhsephpbo.supabase.co";
const SB_KEY = "sb_publishable_zuTfskA3J-uULZ_aWETlhA_bm7q50SM";

async function fetchRemoteAccounts() {
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/app_data?key=eq.workerAccounts&select=value`,
      {
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
        },
      }
    );
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0] && Array.isArray(rows[0].value)) {
      localStorage.setItem("workerAccounts", JSON.stringify(rows[0].value));
      return rows[0].value;
    }
  } catch {}
  try {
    return JSON.parse(localStorage.getItem("workerAccounts")) || [];
  } catch {
    return [];
  }
}

window.fetchRemoteAccounts = fetchRemoteAccounts;
