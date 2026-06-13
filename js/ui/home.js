// home.js — the daily dashboard.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { QUICK_ADD_CHIPS, findFood, macrosFor } from '../foods.js';
import { el, ring, bar, animateRings, animateBars, toast, confettiBurst } from './components.js';

const GREEN = '#7fae8b', GREEN_L = '#9ecfaa', ORANGE = '#e8833a', ORANGE_L = '#ffb27d', NEUTRAL = '#c9cdd4', TEAL = '#8fbfae';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}
function weekNum(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  const days = Math.floor((Date.now() - start.getTime()) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}
const MEAL_META = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  lunch: { emoji: '☀️', label: 'Lunch' },
  snack: { emoji: '🍎', label: 'Snacks' },
  dinner: { emoji: '🌙', label: 'Dinner' },
};

export async function render(root, ctx) {
  const s = store.getSettings();
  const today = store.todayKey();
  const [allMeals, weights] = await Promise.all([store.getAllMeals(), store.getAllWeights()]);

  // group meals by day
  const byDay = new Map();
  for (const m of allMeals) { if (!byDay.has(m.dateKey)) byDay.set(m.dateKey, []); byDay.get(m.dateKey).push(m); }
  const meals = (byDay.get(today) || []).slice().sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  const totals = N.sumMacros(meals);

  // weekly context
  const last7 = store.recentKeys(7).map(k => N.sumMacros(byDay.get(k) || []).kcal);
  const avg7 = last7.reduce((a, b) => a + b, 0) / 7;
  const trend = N.weightTrend(weights);
  const score = N.bulkScore({ kcal: totals.kcal, goalKcal: s.goalKcal, protein: totals.protein, goalProtein: s.goalProtein, mealCount: meals.length });

  // streak (past days; include today only if already met)
  const streakDays = store.recentKeys(21).map(k => ({ dateKey: k, protein: N.sumMacros(byDay.get(k) || []).protein }))
    .filter(d => d.dateKey !== today || d.protein >= s.goalProtein);
  const streak = N.proteinStreak(streakDays, s.goalProtein);

  root.replaceChildren();
  root.appendChild(el('.screen.home', {}, [
    // header
    el('.home-head', {}, [
      el('div', {}, [
        el('.greeting', {}, [greeting()]),
        el('.name', {}, [(s.name || 'Athlete') + ' 💪']),
        el('.goal-pill', {}, [`LEAN BULK${weekNum(s.startDate) ? ' · WEEK ' + weekNum(s.startDate) : ''}`]),
      ]),
      el('.score-chip', { onclick: () => ctx.go('analytics') }, [
        el('.score-num', {}, [String(score)]),
        el('.score-cap', {}, ['BULK SCORE']),
      ]),
    ]),

    // hero rings card
    el('.card.rings-card', {}, [
      ring({ value: totals.kcal, max: s.goalKcal, color: ORANGE, size: 132, stroke: 11, glow: true,
        big: N.clamp(totals.kcal, 0, 99999), small: `/ ${s.goalKcal} kcal`,
        tiny: `${Math.max(0, s.goalKcal - totals.kcal)} left` }),
      el('.satellites', {}, [
        satellite(totals.protein, s.goalProtein, GREEN_L, 'PROTEIN', 'g'),
        satellite(totals.fat, s.goalFat, NEUTRAL, 'FAT', 'g'),
        satellite(totals.fibre, s.goalFibre, TEAL, 'FIBRE', 'g'),
      ]),
    ]),

    // weight + surplus strip
    el('.strip-row', {}, [
      el('.card.mini', { onclick: () => ctx.openWeight() }, [
        el('.mini-label', {}, ['WEIGHT']),
        el('.mini-val', {}, [
          trend.latest != null ? `${trend.latest}` : '—',
          trend.deltaWeek != null ? el('span.mini-delta', { style: { color: trend.deltaWeek >= 0 ? GREEN_L : ORANGE_L } },
            [` ${trend.deltaWeek >= 0 ? '↗' : '↘'} ${trend.deltaWeek >= 0 ? '+' : ''}${trend.deltaWeek}/wk`]) : el('span.mini-hint', {}, [' tap to log']),
        ]),
      ]),
      el('.card.mini', {}, [
        el('.mini-label', {}, ['EST. SURPLUS']),
        el('.mini-val', { style: { color: ORANGE_L } }, [
          `${avg7 - s.maintenanceKcal >= 0 ? '+' : ''}${Math.round(avg7 - s.maintenanceKcal)}`,
          el('span.mini-unit', {}, [' kcal/day']),
        ]),
      ]),
    ]),

    coachingStrip(s, totals),
    notesBlock({ s, totals, streak, byDay, today }),

    // quick actions
    el('.quick-actions', {}, [
      el('button.qa.primary', { onclick: () => ctx.startScan() }, ['⌖ Scan Meal']),
      el('button.qa', { onclick: () => ctx.openManualAdd() }, ['＋ Manual']),
      el('button.qa', { onclick: () => ctx.openRepeat() }, ['↺ Repeat']),
    ]),

    // quick-add chips
    el('.chips', {}, QUICK_ADD_CHIPS.map(chip =>
      el('button.chip', { onclick: () => quickAdd(chip, ctx) }, [`${chip.emoji} ${chip.label}`]))),

    trend.latest == null || !hasWeightToday(weights, today)
      ? el('button.weight-nudge', { onclick: () => ctx.openWeight() }, ['⚖️  Log today’s weight'])
      : null,

    // timeline
    el('.section-label', {}, ['TODAY’S MEALS']),
    timeline(meals, ctx),
  ]));

  animateRings(root); animateBars(root);

  // protein-goal celebration, once per day
  if (totals.protein >= s.goalProtein && s.confettiShownFor !== today) {
    store.saveSettings({ confettiShownFor: today });
    confettiBurst();
    toast('Protein goal smashed! 🎉');
  }
}

function satellite(value, max, color, label, suffix) {
  return el('.sat', {}, [
    ring({ value, max, color, size: 58, stroke: 6, big: Math.round(value) }),
    el('.sat-label', {}, [label, el('br'), el('span', {}, [`/${max}${suffix}`])]),
  ]);
}

function hasWeightToday(weights, today) { return weights.some(w => w.dateKey === today); }

function coachingStrip(s, totals) {
  const h = new Date().getHours();
  const kcalLeft = s.goalKcal - totals.kcal;
  const protLeft = s.goalProtein - totals.protein;
  if (h < 16 || kcalLeft <= 50) return null;
  const rec = N.missedCalories({ kcal: kcalLeft, protein: protLeft });
  const suggestion = rec.items.length ? rec.items.map(i => `${i.emoji} ${i.label}`).join(' + ') : 'a protein-rich snack';
  return el('.card.coaching', {}, [
    el('.coach-title', {}, [`Tonight: ${Math.max(0, Math.round(kcalLeft))} kcal · ${Math.max(0, Math.round(protLeft))}g protein to go`]),
    el('.coach-sub', {}, [`Quick fix → ${suggestion}`]),
  ]);
}

function notesBlock({ s, totals, streak, byDay, today }) {
  const y = store.shiftKey(today, -1);
  const yTotals = N.sumMacros(byDay.get(y) || []);
  const thisWeek = store.recentKeys(7).map(k => N.sumMacros(byDay.get(k) || []).fibre);
  const lastWeek = store.recentKeys(14).slice(0, 7).map(k => N.sumMacros(byDay.get(k) || []).fibre);
  const mean = (a) => a.reduce((x, z) => x + z, 0) / (a.length || 1);
  const notes = N.aiNotes({
    protein: totals.protein, goalProtein: s.goalProtein, kcal: totals.kcal, goalKcal: s.goalKcal,
    hour: new Date().getHours(), kcalYesterday: yTotals.kcal, goalKcalYesterday: s.goalKcal,
    fibreAvgThisWeek: mean(thisWeek), fibreAvgLastWeek: mean(lastWeek), streak,
  });
  if (!notes.length) return null;
  return el('.notes', {}, notes.map(n => el('.note', {}, [el('span.note-dot'), n])));
}

function timeline(meals, ctx) {
  if (!meals.length) {
    return el('.empty', {}, ['No meals logged yet today.', el('br'), el('span', {}, ['Tap Scan or Manual to start — takes 15 seconds.'])]);
  }
  const order = ['breakfast', 'lunch', 'snack', 'dinner'];
  const groups = {};
  for (const m of meals) (groups[m.mealType || 'snack'] ||= []).push(m);
  const wrap = el('.timeline');
  for (const type of order) {
    if (!groups[type]) continue;
    wrap.appendChild(el('.tl-group-label', {}, [`${MEAL_META[type].emoji} ${MEAL_META[type].label}`]));
    for (const m of groups[type]) wrap.appendChild(mealRow(m, ctx));
  }
  // dashed "next meal" hint for the current window if empty
  const cur = N.mealTypeForTime(store.timeNow());
  if (!groups[cur]) {
    wrap.appendChild(el('.tl-empty', { onclick: () => ctx.openManualAdd() }, [
      el('.tl-icon', {}, [MEAL_META[cur].emoji]),
      el('.tl-empty-text', {}, [`${MEAL_META[cur].label} — not logged yet`]),
      el('.tl-plus', {}, ['＋']),
    ]));
  }
  return wrap;
}

function mealRow(m, ctx) {
  return el('.tl-row', { onclick: () => ctx.openMealEdit(m) }, [
    el('.tl-icon', {}, [MEAL_META[m.mealType]?.emoji || '🍽️']),
    el('.tl-main', {}, [
      el('.tl-name', {}, [m.name, m.source === 'scan' ? el('span.tl-badge', {}, ['📷 scanned']) : null]),
      el('.tl-time', {}, [`${MEAL_META[m.mealType]?.label || ''} · ${m.time || ''}`]),
    ]),
    el('.tl-macros', {}, [
      el('.tl-kcal', {}, [String(Math.round(m.kcal))]),
      el('.tl-prot', {}, [`${Math.round(m.protein)}g P`]),
    ]),
  ]);
}

async function quickAdd(chip, ctx) {
  const food = findFood(chip.food);
  if (!food) return;
  const macros = macrosFor(food, chip.grams);
  await store.addMeal({
    dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()),
    name: food.name, source: 'quick', ...macros,
  });
  toast(`Added ${chip.label.replace('+', '')} · ${macros.kcal} kcal`);
  ctx.refresh();
}
