// store.js — IndexedDB persistence + in-memory state cache + export/import.
// Stores: meals, weights, foodMemory, settings.

let activeDbName = 'macrolens';   // set per active profile in init()
const DB_VERSION = 1;

const DEFAULT_SETTINGS = {
  name: '',
  goal: 'gain',              // 'lose' | 'maintain' | 'gain'
  sex: 'male',               // 'male' | 'female' (Mifflin constant)
  activity: 1.55,            // activity multiplier
  currentWeightKg: null,
  targetWeightKg: null,
  targetDate: null,          // ISO date string
  startDate: null,           // ISO date string — when this goal began
  heightCm: null,
  age: null,
  gymDaysPerWeek: 4,
  maintenanceKcal: 2700,
  goalKcal: 3000,
  goalProtein: 170,
  goalCarbs: 300,
  goalFat: 85,
  goalFibre: 35,
  geminiApiKey: '',
  onboarded: false,
  confettiShownFor: '',
};

let db = null;
export const state = { settings: { ...DEFAULT_SETTINGS } };

// ---- date helpers (local time) ----
export function dateKeyOf(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function todayKey() { return dateKeyOf(new Date()); }
export function timeNow() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
export function shiftKey(key, deltaDays) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return dateKeyOf(dt);
}
// Returns the last N dateKeys ending today (ascending).
export function recentKeys(n) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(shiftKey(todayKey(), -i));
  return out;
}

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(activeDbName, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('meals')) {
        const s = d.createObjectStore('meals', { keyPath: 'id' });
        s.createIndex('dateKey', 'dateKey', { unique: false });
      }
      if (!d.objectStoreNames.contains('weights')) d.createObjectStore('weights', { keyPath: 'dateKey' });
      if (!d.objectStoreNames.contains('foodMemory')) d.createObjectStore('foodMemory', { keyPath: 'name' });
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  return db.transaction(storeName, mode).objectStore(storeName);
}
function reqP(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
function getAll(storeName) { return reqP(tx(storeName).getAll()); }

// ---- init ----
export async function init(dbName) {
  if (db) { db.close(); db = null; }
  activeDbName = dbName || 'macrolens';
  db = await open();
  const rows = await getAll('settings');
  const saved = {};
  for (const r of rows) saved[r.key] = r.value;
  state.settings = { ...DEFAULT_SETTINGS, ...saved };
  return state;
}

export function close() { if (db) { db.close(); db = null; } }

// ---- settings ----
export function getSettings() { return state.settings; }
export async function saveSettings(patch) {
  state.settings = { ...state.settings, ...patch };
  const store = tx('settings', 'readwrite');
  for (const [key, value] of Object.entries(patch)) store.put({ key, value });
  return new Promise((res, rej) => { store.transaction.oncomplete = () => res(state.settings); store.transaction.onerror = () => rej(store.transaction.error); });
}

// ---- meals ----
export function newId() {
  return `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
export async function addMeal(meal) {
  const m = { id: newId(), ...meal };
  await reqP(tx('meals', 'readwrite').put(m));
  await recordFood(m);
  return m;
}
export async function updateMeal(meal) {
  await reqP(tx('meals', 'readwrite').put(meal));
  return meal;
}
export async function deleteMeal(id) { return reqP(tx('meals', 'readwrite').delete(id)); }
export async function getMealsByDate(dateKey) {
  const idx = tx('meals').index('dateKey');
  const rows = await reqP(idx.getAll(IDBKeyRange.only(dateKey)));
  return rows.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}
export async function getAllMeals() {
  const rows = await getAll('meals');
  return rows.sort((a, b) => (b.dateKey + b.time).localeCompare(a.dateKey + a.time));
}

// ---- weights ----
export async function setWeight(dateKey, kg) {
  await reqP(tx('weights', 'readwrite').put({ dateKey, kg }));
  await saveSettings({ currentWeightKg: kg });
}
export async function getAllWeights() {
  const rows = await getAll('weights');
  return rows.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}
export async function getWeight(dateKey) { return reqP(tx('weights').get(dateKey)); }

// ---- food memory ----
export async function recordFood(meal) {
  if (!meal.name) return;
  const key = meal.name;
  const existing = await reqP(tx('foodMemory').get(key));
  const entry = existing
    ? { ...existing, count: existing.count + 1, lastUsed: Date.now(),
        grams: meal.grams, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, fibre: meal.fibre }
    : { name: key, count: 1, lastUsed: Date.now(),
        grams: meal.grams, kcal: meal.kcal, protein: meal.protein, carbs: meal.carbs, fat: meal.fat, fibre: meal.fibre };
  await reqP(tx('foodMemory', 'readwrite').put(entry));
}
export async function getFoodMemory() {
  const rows = await getAll('foodMemory');
  return rows.sort((a, b) => b.lastUsed - a.lastUsed);
}

// ---- export / import ----
export async function exportData() {
  const [meals, weights, foodMemory] = await Promise.all([getAllMeals(), getAllWeights(), getFoodMemory()]);
  const settings = { ...state.settings };
  delete settings.geminiApiKey; // never export the key by default
  // strip photo thumbs to keep the file small
  const slimMeals = meals.map(({ photoThumb, ...rest }) => rest);
  return {
    app: 'MacroLens', version: 1, exportedAt: new Date().toISOString(),
    meals: slimMeals, weights, foodMemory, settings,
  };
}
export async function importData(json) {
  if (!json || json.app !== 'MacroLens' || !Array.isArray(json.meals)) {
    throw new Error('Not a valid MacroLens backup file');
  }
  const mStore = tx('meals', 'readwrite');
  for (const m of json.meals) if (m && m.id) mStore.put(m);
  await txDone(mStore);

  if (Array.isArray(json.weights)) {
    const wStore = tx('weights', 'readwrite');
    for (const w of json.weights) if (w && w.dateKey) wStore.put(w);
    await txDone(wStore);
  }
  if (Array.isArray(json.foodMemory)) {
    const fStore = tx('foodMemory', 'readwrite');
    for (const f of json.foodMemory) if (f && f.name) fStore.put(f);
    await txDone(fStore);
  }
  if (json.settings) {
    const keep = { ...json.settings };
    delete keep.geminiApiKey; // don't overwrite local key from a backup
    await saveSettings(keep);
  }
  return true;
}
function txDone(store) {
  return new Promise((res, rej) => { store.transaction.oncomplete = res; store.transaction.onerror = () => rej(store.transaction.error); });
}

export async function resetAll() {
  await Promise.all(['meals', 'weights', 'foodMemory', 'settings'].map(s => reqP(tx(s, 'readwrite').clear())));
  state.settings = { ...DEFAULT_SETTINGS };
}
