// Provides a `window.storage` implementation backed by localStorage so the
// FITLY app persists data per device/browser with no backend.
// The API mirrors the storage interface the app already uses:
//   await window.storage.get(key)    -> { key, value } | null   (value is a string)
//   await window.storage.set(key, v) -> { key, value }
//   await window.storage.delete(key) -> { key, deleted: true }
//
// Falls back to an in-memory store if localStorage is unavailable
// (e.g. Safari private mode), so the app still works during a session.

function makeStorage() {
  const memory = {};
  let ls = null;
  try {
    const probe = "__fitly_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    ls = window.localStorage;
  } catch {
    ls = null; // private mode / disabled storage -> use memory
  }

  const getRaw = (k) => (ls ? ls.getItem(k) : k in memory ? memory[k] : null);
  const setRaw = (k, v) => {
    if (ls) ls.setItem(k, v);
    else memory[k] = v;
  };
  const delRaw = (k) => {
    if (ls) ls.removeItem(k);
    else delete memory[k];
  };

  return {
    async get(key) {
      const v = getRaw(key);
      return v === null || v === undefined ? null : { key, value: v };
    },
    async set(key, value) {
      setRaw(key, value);
      return { key, value };
    },
    async delete(key) {
      delRaw(key);
      return { key, deleted: true };
    },
    async list(prefix = "") {
      const keys = [];
      if (ls) {
        for (let i = 0; i < ls.length; i++) {
          const k = ls.key(i);
          if (k && k.startsWith(prefix)) keys.push(k);
        }
      } else {
        for (const k of Object.keys(memory)) if (k.startsWith(prefix)) keys.push(k);
      }
      return { keys, prefix };
    },
  };
}

if (typeof window !== "undefined" && !window.storage) {
  window.storage = makeStorage();
}
