// nutrition.js — pure functions. No DOM, no storage. Independently testable.
// All "macro" objects look like { kcal, protein, carbs, fat, fibre }.

export const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r0 = (n) => Math.round(n || 0);
const r1 = (n) => Math.round((n || 0) * 10) / 10;

// Sum a list of meals into one macro total.
export function sumMacros(meals) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  for (const m of meals || []) {
    t.kcal += m.kcal || 0;
    t.protein += m.protein || 0;
    t.carbs += m.carbs || 0;
    t.fat += m.fat || 0;
    t.fibre += m.fibre || 0;
  }
  return { kcal: r0(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat), fibre: r1(t.fibre) };
}

// Re-scale macros when the user changes the portion (±50 g etc.).
export function scaleMacros(macros, oldGrams, newGrams) {
  if (!oldGrams || oldGrams <= 0) return { ...macros, grams: newGrams };
  const f = newGrams / oldGrams;
  return {
    grams: r0(newGrams),
    kcal: r0(macros.kcal * f),
    protein: r1(macros.protein * f),
    carbs: r1(macros.carbs * f),
    fat: r1(macros.fat * f),
    fibre: r1(macros.fibre * f),
  };
}

// Meal type from a "HH:MM" string or hour number.
export function mealTypeForTime(time) {
  let h;
  if (typeof time === 'number') h = time;
  else h = parseInt(String(time).split(':')[0], 10);
  if (isNaN(h)) h = 12;
  if (h < 11) return 'breakfast';
  if (h < 16) return 'lunch';
  if (h < 19) return 'snack';
  return 'dinner';
}

// Bulk Score 0–100: calories (40) + protein (40) + consistency (20).
export function bulkScore({ kcal, goalKcal, protein, goalProtein, mealCount }) {
  goalKcal = goalKcal || 1; goalProtein = goalProtein || 1;
  const ratio = kcal / goalKcal;
  let cal;
  if (ratio > 1.15) cal = Math.max(25, 40 - 5 * Math.ceil((ratio - 1.15) / 0.10));
  else cal = 40 * clamp01(ratio);
  const prot = 40 * clamp01(protein / goalProtein);
  const consist = mealCount >= 3 ? 20 : mealCount === 2 ? 12 : mealCount === 1 ? 6 : 0;
  return clamp(r0(cal + prot + consist), 0, 100);
}

export function bulkScoreLabel(score) {
  if (score >= 85) return 'Dialed in';
  if (score >= 70) return 'Strong day';
  if (score >= 50) return 'Getting there';
  if (score > 0)  return 'Warming up';
  return 'Log a meal';
}

// Real-time intraday muscle-support % companion to Bulk Score.
export function muscleSupport({ protein, goalProtein, kcal, goalKcal }) {
  return clamp(r0(55 * clamp01(protein / (goalProtein || 1)) + 45 * clamp01(kcal / (goalKcal || 1))), 0, 100);
}

export function surplus(kcal, maintenance) { return r0((kcal || 0) - (maintenance || 0)); }

// Predicted body-weight change from average surplus (7700 kcal ≈ 1 kg).
export function predictWeeklyGain(avgKcal, maintenance) {
  return r1(((avgKcal - maintenance) * 7) / 7700);
}
export function predictMonthlyGain(avgKcal, maintenance) {
  return r1(((avgKcal - maintenance) * 30) / 7700);
}

// Rolling average of a numeric series; returns a same-length array.
export function rollingAverage(series, window) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

// weights: [{dateKey, kg}] ascending by date.
export function weightTrend(weights) {
  if (!weights || !weights.length) return { latest: null, avg7: null, deltaWeek: null };
  const kgs = weights.map(w => w.kg);
  const latest = kgs[kgs.length - 1];
  const last7 = kgs.slice(-7);
  const prev7 = kgs.slice(-14, -7);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const avg7 = r1(avg(last7));
  const deltaWeek = prev7.length ? r1(avg(last7) - avg(prev7)) : null;
  return { latest: r1(latest), avg7, deltaWeek };
}

// Trailing run of `true` in a boolean array (oldest → newest).
export function trailingRun(bools) {
  let n = 0;
  for (let i = bools.length - 1; i >= 0; i--) { if (bools[i]) n++; else break; }
  return n;
}

// dayProteins: [{dateKey, protein}] ascending; today excluded unless it already met goal.
export function proteinStreak(dayProteins, goalProtein) {
  return trailingRun((dayProteins || []).map(d => d.protein >= goalProtein));
}

// dayKcals: array of numbers within a window.
export function daysInSurplus(dayKcals, maintenance) {
  return (dayKcals || []).filter(k => k >= maintenance).length;
}

// Protein heatmap: matrix[dayIndex][hour] = protein grams that hour.
export function proteinHeatmap(meals, dateKeys) {
  const idx = new Map(dateKeys.map((d, i) => [d, i]));
  const matrix = dateKeys.map(() => new Array(24).fill(0));
  for (const m of meals) {
    const di = idx.get(m.dateKey);
    if (di == null) continue;
    const h = parseInt(String(m.time || '12:00').split(':')[0], 10) || 12;
    matrix[di][h] += m.protein || 0;
  }
  return matrix;
}

// Recovery indicator from today's meals: ≥3 feedings of ≥20 g protein = good.
export function recoveryIndicator(meals) {
  const feedings = (meals || []).filter(m => (m.protein || 0) >= 20).length;
  let status, message;
  if (feedings >= 3) { status = 'good'; message = 'Recovery support: solid — protein spread across the day'; }
  else if (feedings === 2) { status = 'ok'; message = 'One more 20g+ protein feeding for ideal recovery'; }
  else { status = 'low'; message = `${3 - feedings} more protein-rich feeding${3 - feedings === 1 ? '' : 's'} would help recovery`; }
  return { feedings, status, message };
}

// Greedy "missed calories" filler. remaining = {kcal, protein}.
const RECOVERY_FOODS = [
  { label: 'Protein shake', emoji: '💪', kcal: 120, protein: 24, dense: 'protein' },
  { label: '3 boiled eggs', emoji: '🥚', kcal: 210, protein: 18, dense: 'protein' },
  { label: '200ml milk',    emoji: '🥛', kcal: 124, protein: 6.4, dense: 'protein' },
  { label: 'Paneer (100g)', emoji: '🧀', kcal: 265, protein: 18, dense: 'protein' },
  { label: 'Peanut butter (2 tbsp)', emoji: '🥜', kcal: 188, protein: 8, dense: 'cal' },
  { label: 'Banana',        emoji: '🍌', kcal: 105, protein: 1.3, dense: 'cal' },
  { label: 'Oats bowl',     emoji: '🥣', kcal: 233, protein: 10, dense: 'cal' },
  { label: 'Rice (1 cup)',  emoji: '🍚', kcal: 195, protein: 4, dense: 'cal' },
  { label: 'Smoothie',      emoji: '🥤', kcal: 270, protein: 9, dense: 'cal' },
];
export function missedCalories(remaining, foods = RECOVERY_FOODS) {
  const kcalGap = Math.max(0, remaining.kcal || 0);
  const protGap = Math.max(0, remaining.protein || 0);
  if (kcalGap < 100) return { items: [], total: { kcal: 0, protein: 0 } };
  const priority = protGap > 25 ? 'protein' : 'cal';
  const pool = [...foods].sort((a, b) => {
    if (a.dense === priority && b.dense !== priority) return -1;
    if (b.dense === priority && a.dense !== priority) return 1;
    return b.kcal - a.kcal;
  });
  const items = [];
  let kcal = 0, protein = 0;
  for (const f of pool) {
    if (items.length >= 3) break;
    if (kcal >= kcalGap * 0.85) break;
    items.push(f); kcal += f.kcal; protein += f.protein;
  }
  return { items, total: { kcal: r0(kcal), protein: r1(protein) } };
}

// Rule-based coaching notes. ctx fields are all optional.
export function aiNotes(ctx) {
  const notes = [];
  const {
    protein = 0, goalProtein = 1, kcal = 0, goalKcal = 1, hour = 12,
    kcalYesterday = null, goalKcalYesterday = 1,
    fibreAvgThisWeek = null, fibreAvgLastWeek = null, streak = 0,
  } = ctx || {};

  if (streak >= 3) notes.push(`🔥 ${streak}-day protein streak — keep it rolling`);
  if (hour >= 20 && protein < 0.6 * goalProtein)
    notes.push('Protein’s behind today — a shake before bed closes the gap');
  if (kcal < 0.8 * goalKcal && kcalYesterday != null && kcalYesterday < 0.8 * goalKcalYesterday)
    notes.push('Fuel’s been low 2 days running — a bulk needs the calories');
  if (fibreAvgThisWeek != null && fibreAvgLastWeek != null && fibreAvgThisWeek > fibreAvgLastWeek + 1)
    notes.push('Fibre’s improving week-on-week 👌');
  if (hour >= 19 && protein >= goalProtein && notes.length < 2)
    notes.push('Protein goal hit 💪 — nice work today');

  return notes.slice(0, 2);
}
