// Durable `window.storage` for the FITLY app.
//
// Primary store: IndexedDB — on iOS, a site added to the Home Screen keeps
// IndexedDB across full app termination far more reliably than localStorage
// (which iOS can evict when a standalone web app is killed).
// localStorage is kept as a mirror + fallback, and an in-memory map is the
// last resort (e.g. Private Browsing, where nothing persists past close).
//
// API (all async, mirrors what the app already calls):
//   await window.storage.get(key)        -> { key, value } | null   (value is a string)
//   await window.storage.set(key, value) -> { key, value }
//   await window.storage.delete(key)     -> { key, deleted: true }
//   await window.storage.list(prefix)    -> { keys, prefix }

function makeStorage() {
  const memory = {};

  // --- localStorage (mirror + fallback) ---
  let ls = null;
  try {
    const p = "__fitly_probe__";
    window.localStorage.setItem(p, "1");
    window.localStorage.removeItem(p);
    ls = window.localStorage;
  } catch {
    ls = null;
  }
  const lsGet = (k) => { try { return ls ? ls.getItem(k) : (k in memory ? memory[k] : null); } catch { return k in memory ? memory[k] : null; } };
  const lsSet = (k, v) => { try { if (ls) ls.setItem(k, v); else memory[k] = v; } catch { memory[k] = v; } };
  const lsDel = (k) => { try { if (ls) ls.removeItem(k); else delete memory[k]; } catch { delete memory[k]; } };

  // --- IndexedDB (primary, durable) ---
  const DB_NAME = "fitly", STORE = "kv";
  let dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        if (!("indexedDB" in window) || !window.indexedDB) return resolve(null);
        const req = window.indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return dbPromise;
  }
  function idb(mode, run) {
    return openDB().then((db) => {
      if (!db) return undefined;
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE, mode);
          const store = tx.objectStore(STORE);
          const req = run(store);
          tx.oncomplete = () => resolve(req ? req.result : undefined);
          tx.onerror = () => resolve(undefined);
          tx.onabort = () => resolve(undefined);
        } catch {
          resolve(undefined);
        }
      });
    }).catch(() => undefined);
  }

  return {
    async get(key) {
      let v = await idb("readonly", (s) => s.get(key));
      if (v === undefined || v === null) {
        // migrate any pre-existing localStorage value into IndexedDB
        const lv = lsGet(key);
        if (lv !== null && lv !== undefined) {
          v = lv;
          idb("readwrite", (s) => s.put(lv, key));
        }
      }
      return v === undefined || v === null ? null : { key, value: v };
    },
    async set(key, value) {
      await idb("readwrite", (s) => s.put(value, key));
      lsSet(key, value); // mirror for redundancy
      return { key, value };
    },
    async delete(key) {
      await idb("readwrite", (s) => s.delete(key));
      lsDel(key);
      return { key, deleted: true };
    },
    async list(prefix = "") {
      const keys = new Set();
      const idbKeys = await idb("readonly", (s) => s.getAllKeys());
      if (Array.isArray(idbKeys)) idbKeys.forEach((k) => { if (typeof k === "string" && k.startsWith(prefix)) keys.add(k); });
      try { if (ls) for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(prefix)) keys.add(k); } } catch {}
      return { keys: [...keys], prefix };
    },
  };
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = makeStorage();
}
