const SYNC_KEYS = [
  "viewings",
  "promises",
  "startedWorks",
  "completedWorks",
  "workerEntries",
  "workerAccounts",
  "myExpenses",
];
const DIRTY_KEY = "sbDirtyKeys";
const origSet = Storage.prototype.setItem;
const origRemove = Storage.prototype.removeItem;

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

function collectData() {
  const out = {};
  SYNC_KEYS.forEach((k) => {
    out[k] = readJSON(k, []);
  });
  return out;
}

function dirtyKeys() {
  return readJSON(DIRTY_KEY, []);
}

function markDirty(key) {
  const arr = dirtyKeys();
  if (!arr.includes(key)) {
    arr.push(key);
    origSet.call(localStorage, DIRTY_KEY, JSON.stringify(arr));
  }
}

function clearDirty(keys) {
  const rest = dirtyKeys().filter((k) => !keys.includes(k));
  origSet.call(localStorage, DIRTY_KEY, JSON.stringify(rest));
}

function ensureRemote() {
  if (window.RemoteDB) return Promise.resolve(true);
  if (ensureRemote.p) return ensureRemote.p;
  ensureRemote.p = new Promise((resolve) => {
    const fail = () => {
      ensureRemote.p = null;
      resolve(false);
    };
    const load = (src, next) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = next;
      s.onerror = fail;
      document.head.appendChild(s);
    };
    load("supabase.js", () => load("remote.js", () => resolve(!!window.RemoteDB)));
  });
  return ensureRemote.p;
}

function remoteReady() {
  return !!(window.RemoteDB && window.RemoteDB.isReady && window.RemoteDB.isReady());
}

async function flushDirty() {
  if (!remoteReady()) return false;
  const keys = dirtyKeys();
  if (!keys.length) return true;
  const all = collectData();
  const payload = {};
  keys.forEach((k) => {
    if (SYNC_KEYS.includes(k)) payload[k] = all[k];
  });
  if (!Object.keys(payload).length) {
    clearDirty(keys);
    return true;
  }
  const ok = await window.RemoteDB.supabasePutAll(payload);
  if (ok) clearDirty(keys);
  return ok;
}

async function remoteTick() {
  const ok = await ensureRemote();
  if (!ok || !remoteReady()) return;
  await flushDirty();

  let remote = await window.RemoteDB.supabaseGetAll();
  if (!remote) return;

  const localHasData = SYNC_KEYS.some((k) => readJSON(k, []).length);
  if (Object.keys(remote).length === 0 && localHasData) {
    await window.RemoteDB.supabasePutAll(collectData());
    remote = await window.RemoteDB.supabaseGetAll();
    if (!remote) return;
  }

  let changed = false;
  SYNC_KEYS.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(remote, k)) {
      const remoteVal = remote[k];
      const localVal = readJSON(k, []);
      if (stableStringify(localVal) !== stableStringify(remoteVal ?? [])) {
        origSet.call(localStorage, k, JSON.stringify(remoteVal ?? []));
        changed = true;
      }
    }
  });
  if (changed) location.reload();
}

let timer = null;
let remoteTimer = null;
function scheduleSync() {
  clearTimeout(timer);
  timer = setTimeout(syncNow, 800);
}
function scheduleRemote() {
  clearTimeout(remoteTimer);
  remoteTimer = setTimeout(() => {
    ensureRemote().then((ok) => {
      if (ok) flushDirty();
    });
  }, 800);
}

function syncNow() {
  fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(collectData()),
  }).catch(() => {});
}

Storage.prototype.setItem = function (key, value) {
  const r = origSet.call(this, key, value);
  if (SYNC_KEYS.includes(key)) {
    markDirty(key);
    scheduleSync();
    scheduleRemote();
  }
  return r;
};
Storage.prototype.removeItem = function (key) {
  const r = origRemove.call(this, key);
  if (SYNC_KEYS.includes(key)) {
    markDirty(key);
    scheduleSync();
    scheduleRemote();
  }
  return r;
};

document.addEventListener("DOMContentLoaded", () => {
  remoteTick();
  syncNow();
  setInterval(() => {
    remoteTick();
    syncNow();
  }, 30000);
});
window.addEventListener("beforeunload", syncNow);
