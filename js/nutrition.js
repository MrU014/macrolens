// nutrition.js — pure functions. No DOM, no storage. Independently testable.
// Supports three goals: 'lose' | 'maintain' | 'gain'.
// All "macro" objects look like { kcal, protein, carbs, fat, fibre }.

export const clamp01 = (x) => Math.max(0, Math.min(1, x || 0));
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const r0 = (n) => Math.round(n || 0);
const r1 = (n) => Math.round((n || 0) * 10) / 10;

// Goal metadata used across the UI.
export const GOALS = {
  lose:     { key: 'lose',     label: 'Lose Weight',  short: 'LOSE',     verb: 'lose', netLabel: 'DEFICIT', kcalAdjust: -500, proteinPerKg: 2.2 },
  maintain: { key: 'maintain', label: 'Maintain',     short: 'MAINTAIN', verb: 'hold', netLabel: 'NET',     kcalAdjust: 0,    proteinPerKg: 1.8 },
  gain:     { key: 'gain',     label: 'Gain Weight',  short: 'GAIN',     verb: 'gain', netLabel: 'SURPLUS', kcalAdjust: 350,  proteinPerKg: 2.0 },
};
export const goalMeta = (g) => GOALS[g] || GOALS.maintain;

// Sum a list of meals into one macro total.
export function sumMacros(meals) {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 };
  for (const m of meals || []) {
    t.kcal += m.kcal || 0; t.protein += m.protein || 0; t.carbs += m.carbs || 0; t.fat += m.fat || 0; t.fibre += m.fibre || 0;
  }
  return { kcal: r0(t.kcal), protein: r1(t.protein), carbs: r1(t.carbs), fat: r1(t.fat), fibre: r1(t.fibre) };
}

// Re-scale macros when the user changes the portion.
export function scaleMacros(macros, oldGrams, newGrams) {
  if (!oldGrams || oldGrams <= 0) return { ...macros, grams: newGrams };
  const f = newGrams / oldGrams;
  return {
    grams: r0(newGrams), kcal: r0(macros.kcal * f), protein: r1(macros.protein * f),
    carbs: r1(macros.carbs * f), fat: r1(macros.fat * f), fibre: r1(macros.fibre * f),
  };
}

// Meal type from "HH:MM" / hour. Six buckets across the day.
export function mealTypeForTime(time) {
  let h = typeof time === 'number' ? time : parseInt(String(time).split(':')[0], 10);
  if (isNaN(h)) h = 12;
  if (h < 5) return 'midnight_snack';
  if (h < 11) return 'breakfast';
  if (h < 12) return 'morning_snack';
  if (h < 15) return 'lunch';
  if (h < 18) return 'evening_snack';
  if (h < 22) return 'dinner';
  return 'midnight_snack';
}

// Compute daily targets from body stats + goal (Mifflin–St Jeor).
export function computeTargets({ sex, age, heightCm, weightKg, activity, goal }) {
  const w = weightKg || 70, h = heightCm || 170, a = age || 25, act = activity || 1.55;
  const g = goalMeta(goal);
  const bmr = 10 * w + 6.25 * h - 5 * a + (sex === 'female' ? -161 : 5);
  const maintenanceKcal = r0(bmr * act);
  const goalKcal = Math.max(1200, r0(maintenanceKcal + g.kcalAdjust));
  const goalProtein = r0(w * g.proteinPerKg);
  const goalFat = r0((goalKcal * 0.25) / 9);
  const goalFibre = r0((goalKcal / 1000) * 14);
  const goalCarbs = Math.max(0, r0((goalKcal - goalProtein * 4 - goalFat * 9) / 4));
  return { maintenanceKcal, goalKcal, goalProtein, goalFat, goalFibre, goalCarbs };
}

// Goal-aware calorie performance (0..1). Peaks at the target (ratio 1.0);
// the goal only changes how fast the score falls when under vs over target.
const BANDS = {
  lose:     { under: 0.45, over: 0.20 },  // overeating penalised faster
  maintain: { under: 0.25, over: 0.25 },  // symmetric
  gain:     { under: 0.20, over: 0.45 },  // undereating penalised faster
};
function caloriePerf(ratio, goal) {
  const b = BANDS[goal] || BANDS.maintain;
  const dev = ratio < 1 ? (1 - ratio) / b.under : (ratio - 1) / b.over;
  return clamp01(1 - dev);
}

// Daily Score 0–100: calories (40, goal-aware) + protein (40) + consistency (20).
export function dailyScore({ kcal, goalKcal, protein, goalProtein, mealCount, goal }) {
  goalKcal = goalKcal || 1; goalProtein = goalProtein || 1;
  const cal = 40 * caloriePerf(kcal / goalKcal, goal);
  const prot = 40 * clamp01(protein / goalProtein);
  const consist = mealCount >= 3 ? 20 : mealCount === 2 ? 12 : mealCount === 1 ? 6 : 0;
  return clamp(r0(cal + prot + consist), 0, 100);
}

export function scoreLabel(score) {
  if (score >= 85) return 'Dialed in';
  if (score >= 70) return 'Strong day';
  if (score >= 50) return 'Getting there';
  if (score > 0) return 'Warming up';
  return 'Log a meal';
}

// Protein + calorie adequacy (works for any goal).
export function muscleSupport({ protein, goalProtein, kcal, goalKcal }) {
  return clamp(r0(55 * clamp01(protein / (goalProtein || 1)) + 45 * clamp01(kcal / (goalKcal || 1))), 0, 100);
}

export function surplus(kcal, maintenance) { return r0((kcal || 0) - (maintenance || 0)); }

// Predicted body-weight change (negative = loss). 7700 kcal ≈ 1 kg.
export function predictWeeklyChange(avgKcal, maintenance) { return r1(((avgKcal - maintenance) * 7) / 7700); }
export function predictMonthlyChange(avgKcal, maintenance) { return r1(((avgKcal - maintenance) * 30) / 7700); }

export function rollingAverage(series, window) {
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

// weights: [{dateKey, kg}] ascending.
export function weightTrend(weights) {
  if (!weights || !weights.length) return { latest: null, avg7: null, deltaWeek: null };
  const kgs = weights.map(w => w.kg);
  const last7 = kgs.slice(-7), prev7 = kgs.slice(-14, -7);
  const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return {
    latest: r1(kgs[kgs.length - 1]), avg7: r1(avg(last7)),
    deltaWeek: prev7.length ? r1(avg(last7) - avg(prev7)) : null,
  };
}

export function trailingRun(bools) {
  let n = 0;
  for (let i = bools.length - 1; i >= 0; i--) { if (bools[i]) n++; else break; }
  return n;
}
export function proteinStreak(dayProteins, goalProtein) {
  return trailingRun((dayProteins || []).map(d => d.protein >= goalProtein));
}
export function daysOnTarget(dayKcals, goalKcal, goal) {
  return (dayKcals || []).filter(k => caloriePerf(k / (goalKcal || 1), goal) >= 0.7).length;
}

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

export function recoveryIndicator(meals) {
  const feedings = (meals || []).filter(m => (m.protein || 0) >= 20).length;
  let status, message;
  if (feedings >= 3) { status = 'good'; message = 'Protein nicely spread across the day'; }
  else if (feedings === 2) { status = 'ok'; message = 'One more 20g+ protein feeding would round it out'; }
  else { status = 'low'; message = `${3 - feedings} more protein-rich feeding${3 - feedings === 1 ? '' : 's'} would help`; }
  return { feedings, status, message };
}

const RECOVERY_FOODS = [
  { label: 'Protein shake', emoji: '💪', kcal: 120, protein: 24, dense: 'protein' },
  { label: '3 boiled eggs', emoji: '🥚', kcal: 210, protein: 18, dense: 'protein' },
  { label: '200ml milk', emoji: '🥛', kcal: 124, protein: 6.4, dense: 'protein' },
  { label: 'Greek yogurt', emoji: '🥛', kcal: 165, protein: 17, dense: 'protein' },
  { label: 'Paneer (100g)', emoji: '🧀', kcal: 265, protein: 18, dense: 'protein' },
  { label: 'Peanut butter (2 tbsp)', emoji: '🥜', kcal: 188, protein: 8, dense: 'cal' },
  { label: 'Banana', emoji: '🍌', kcal: 105, protein: 1.3, dense: 'cal' },
  { label: 'Oats bowl', emoji: '🥣', kcal: 233, protein: 10, dense: 'cal' },
  { label: 'Rice (1 cup)', emoji: '🍚', kcal: 195, protein: 4, dense: 'cal' },
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
  const items = []; let kcal = 0, protein = 0;
  for (const f of pool) {
    if (items.length >= 3 || kcal >= kcalGap * 0.85) break;
    items.push(f); kcal += f.kcal; protein += f.protein;
  }
  return { items, total: { kcal: r0(kcal), protein: r1(protein) } };
}

// Goal-aware coaching notes (max 2). Always gentle — never guilt.
export function aiNotes(ctx) {
  const notes = [];
  const {
    goal = 'maintain', protein = 0, goalProtein = 1, kcal = 0, goalKcal = 1, hour = 12,
    kcalYesterday = null, goalKcalYesterday = 1, fibreAvgThisWeek = null, fibreAvgLastWeek = null, streak = 0,
  } = ctx || {};

  if (streak >= 3) notes.push(`🔥 ${streak}-day protein streak — keep it rolling`);
  if (hour >= 20 && protein < 0.6 * goalProtein)
    notes.push('Protein’s a bit behind — a shake or yogurt closes the gap');

  if (goal === 'gain') {
    if (kcal < 0.8 * goalKcal && kcalYesterday != null && kcalYesterday < 0.8 * goalKcalYesterday)
      notes.push('Fuel’s been low 2 days — a gain needs the calories');
  } else if (goal === 'lose') {
    if (kcal > 1.1 * goalKcal)
      notes.push('A little over budget today — no stress, tomorrow’s a clean slate');
    else if (hour >= 19 && kcal <= goalKcal && kcal > 0.6 * goalKcal && protein >= 0.8 * goalProtein)
      notes.push('Nice — on target with protein up. That’s the recipe 👌');
  }
  if (fibreAvgThisWeek != null && fibreAvgLastWeek != null && fibreAvgThisWeek > fibreAvgLastWeek + 1)
    notes.push('Fibre’s improving week-on-week 👌');
  if (hour >= 19 && protein >= goalProtein && notes.length < 2)
    notes.push('Protein goal hit 💪 — nice work today');

  return notes.slice(0, 2);
}
