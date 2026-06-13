// home.js — the clean daily screen: calorie ring, macro bars, 6 meal sections.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { QUICK_ADD_CHIPS, findFood, macrosFor } from '../foods.js';
import { el, ring, bar, animateRings, animateBars, toast, confettiBurst } from './components.js';

const GREEN_L = '#9ecfaa', ORANGE = '#e8833a', ORANGE_L = '#ffb27d', NEUTRAL = '#c9cdd4', TAN = '#e0a878', TEAL = '#8fbfae';

const MEAL_ORDER = ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'midnight_snack'];
const MEAL_META = {
  breakfast: { emoji: '🌅', label: 'Breakfast' },
  morning_snack: { emoji: '☕', label: 'Morning snack' },
  lunch: { emoji: '☀️', label: 'Lunch' },
  evening_snack: { emoji: '🍎', label: 'Evening snack' },
  dinner: { emoji: '🌙', label: 'Dinner' },
  midnight_snack: { emoji: '🌃', label: 'Midnight snack' },
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}
function weekNum(startDate) {
  if (!startDate) return null;
  const days = Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

export async function render(root, ctx) {
  const s = store.getSettings();
  const today = store.todayKey();
  const [meals, weights] = await Promise.all([store.getMealsByDate(today), store.getAllWeights()]);
  const totals = N.sumMacros(meals);
  const trend = N.weightTrend(weights);
  const g = N.goalMeta(s.goal);

  const kcalLeft = s.goalKcal - totals.kcal;
  const leftText = s.goal === 'gain'
    ? `${Math.max(0, Math.round(kcalLeft))} to go`
    : kcalLeft >= 0 ? `${Math.round(kcalLeft)} left` : `${Math.round(-kcalLeft)} over`;

  root.replaceChildren();
  root.appendChild(el('.screen.home', {}, [
    el('.home-head', {}, [
      el('div', {}, [
        el('.greeting', {}, [greeting()]),
        el('.name', {}, [(s.name || 'there') + ' 👋']),
        el('.goal-pill', {}, [`${g.short}${weekNum(s.startDate) ? ' · WEEK ' + weekNum(s.startDate) : ''}`]),
      ]),
    ]),

    // hero: calorie ring + macro bars
    el('.card.hero', {}, [
      el('.hero-ring', {}, [
        ring({ value: totals.kcal, max: s.goalKcal, color: ORANGE, size: 130, stroke: 11, glow: true,
          big: totals.kcal, small: `/ ${s.goalKcal}`, tiny: leftText }),
        el('.hero-cap', {}, ['CALORIES']),
      ]),
      el('.hero-bars', {}, [
        bar({ label: 'Protein', value: totals.protein, max: s.goalProtein, suffix: 'g', color: GREEN_L }),
        bar({ label: 'Carbs', value: totals.carbs, max: s.goalCarbs, suffix: 'g', color: NEUTRAL }),
        bar({ label: 'Fat', value: totals.fat, max: s.goalFat, suffix: 'g', color: TAN }),
        bar({ label: 'Fibre', value: totals.fibre, max: s.goalFibre, suffix: 'g', color: TEAL }),
      ]),
    ]),

    // weight tile (tap to log)
    el('.card.mini.weight-tile', { onclick: () => ctx.openWeight() }, [
      el('.mini-label', {}, ['WEIGHT']),
      el('.mini-val', {}, [
        trend.latest != null ? `${trend.latest} kg` : 'Tap to log',
        trend.deltaWeek != null ? el('span.mini-delta', { style: { color: trend.deltaWeek >= 0 ? GREEN_L : ORANGE_L } },
          [`  ${trend.deltaWeek >= 0 ? '↗ +' : '↘ '}${trend.deltaWeek}/wk`]) : null,
      ]),
    ]),

    coachingStrip(s, totals),

    // quick actions
    el('.quick-actions', {}, [
      el('button.qa.primary', { onclick: () => ctx.startScan() }, ['⌖ Scan']),
      el('button.qa', { onclick: () => ctx.openManualAdd() }, ['＋ Add food']),
      el('button.qa', { onclick: () => ctx.openRepeat() }, ['↺ Repeat']),
    ]),

    el('.chips', {}, QUICK_ADD_CHIPS.map(chip =>
      el('button.chip', { onclick: () => quickAdd(chip, ctx) }, [`${chip.emoji} ${chip.label}`]))),

    el('.section-label', {}, ['TODAY’S MEALS']),
    timeline(meals, ctx),
  ]));

  animateRings(root); animateBars(root);

  if (totals.protein >= s.goalProtein && s.confettiShownFor !== today) {
    store.saveSettings({ confettiShownFor: today });
    confettiBurst(); toast('Protein goal hit! 🎉');
  }
}

function coachingStrip(s, totals) {
  const h = new Date().getHours();
  const kcalLeft = s.goalKcal - totals.kcal;
  const protLeft = s.goalProtein - totals.protein;
  if (h < 16) return null;
  // for losing/maintaining, only nudge if protein is short (don't push more food)
  if (s.goal !== 'gain' && protLeft <= 5) return null;
  if (s.goal === 'gain' && kcalLeft <= 50) return null;
  const rec = N.missedCalories({ kcal: s.goal === 'gain' ? kcalLeft : Math.max(150, protLeft * 6), protein: protLeft });
  if (!rec.items.length) return null;
  const suggestion = rec.items.map(i => `${i.emoji} ${i.label}`).join(' + ');
  const title = s.goal === 'gain'
    ? `${Math.max(0, Math.round(kcalLeft))} kcal · ${Math.max(0, Math.round(protLeft))}g protein to go`
    : `${Math.max(0, Math.round(protLeft))}g protein still to hit`;
  return el('.card.coaching', {}, [
    el('.coach-title', {}, [title]),
    el('.coach-sub', {}, [`Quick fix → ${suggestion}`]),
  ]);
}

function timeline(meals, ctx) {
  if (!meals.length) {
    return el('.empty', {}, ['Nothing logged yet today.', el('br'), el('span', {}, ['Tap Scan or Add food — it takes 15 seconds.'])]);
  }
  const groups = {};
  for (const m of meals) {
    const type = MEAL_META[m.mealType] ? m.mealType : 'evening_snack'; // remap legacy 'snack' etc.
    (groups[type] ||= []).push(m);
  }
  const wrap = el('.timeline');
  for (const type of MEAL_ORDER) {
    if (!groups[type]) continue;
    const sub = N.sumMacros(groups[type]);
    wrap.appendChild(el('.tl-group-label', {}, [
      `${MEAL_META[type].emoji} ${MEAL_META[type].label}`,
      el('span.tl-group-kcal', {}, [`${sub.kcal} kcal`]),
    ]));
    for (const m of groups[type].sort((a, b) => (a.time || '').localeCompare(b.time || ''))) wrap.appendChild(mealRow(m, ctx));
  }
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
      el('.tl-name', {}, [m.name, m.source === 'scan' ? el('span.tl-badge', {}, ['📷']) : null]),
      el('.tl-time', {}, [m.time || '']),
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
  await store.addMeal({ dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()),
    name: food.name, source: 'quick', ...macros });
  toast(`Added ${chip.label.replace('+', '')} · ${macros.kcal} kcal`);
  ctx.refresh();
}
