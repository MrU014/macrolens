// profiles.js — local multi-user profiles (no backend).
// Profile list + active id live in localStorage; each profile gets its own
// IndexedDB database. The first/default profile keeps the legacy 'macrolens' DB
// so existing data is preserved.

const KEY_LIST = 'ml_profiles';
const KEY_ACTIVE = 'ml_active';

export const AVATAR_COLORS = ['#4e9a6b', '#d8893c', '#5b7fb0', '#b0608f', '#6fa394', '#c98a5a', '#7a6fb0', '#3f9aa0'];

function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function listProfiles() { return read(KEY_LIST, []); }
function saveList(list) { write(KEY_LIST, list); }

export function getActiveId() { return localStorage.getItem(KEY_ACTIVE) || null; }
export function setActiveId(id) { localStorage.setItem(KEY_ACTIVE, id); }
export function getActive() { const id = getActiveId(); return listProfiles().find(p => p.id === id) || null; }

export function dbNameFor(profile) {
  return !profile || profile.id === 'default' ? 'macrolens' : 'macrolens_' + profile.id;
}

function genId() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export function createProfile({ name, color, pin }) {
  const list = listProfiles();
  const profile = {
    id: list.length === 0 ? 'default' : genId(),  // first profile reuses legacy DB
    name: name || 'Me',
    color: color || AVATAR_COLORS[list.length % AVATAR_COLORS.length],
    pin: pin || null,
  };
  list.push(profile);
  saveList(list);
  return profile;
}

export function updateProfile(id, patch) {
  const list = listProfiles();
  const i = list.findIndex(p => p.id === id);
  if (i >= 0) { list[i] = { ...list[i], ...patch }; saveList(list); return list[i]; }
  return null;
}

export function deleteProfile(id) {
  const list = listProfiles();
  const profile = list.find(p => p.id === id);
  if (!profile) return;
  saveList(list.filter(p => p.id !== id));
  if (id !== 'default') indexedDB.deleteDatabase(dbNameFor(profile));
  if (getActiveId() === id) localStorage.removeItem(KEY_ACTIVE);
}

// Ensure at least one profile exists. Existing users (legacy 'macrolens' DB with
// data) get a 'default' profile pointing at it, so nothing is lost.
export function ensureDefault() {
  let list = listProfiles();
  if (list.length === 0) {
    const p = createProfile({ name: 'Me', color: AVATAR_COLORS[0] });
    setActiveId(p.id);
    list = listProfiles();
  }
  if (!getActiveId()) setActiveId(list[0].id);
  return getActive();
}

// Whether the launch picker should be shown (multiple users, or a locked profile).
export function shouldShowPicker() {
  const list = listProfiles();
  const active = getActive();
  return list.length > 1 || !active || (active && active.pin);
}

export function initial(name) { return (name || '?').trim().charAt(0).toUpperCase() || '?'; }
