// home.js — the calm daily screen: calorie ring, 3 macro bars, meal sections.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { el, ring, bar, animateRings, animateBars, toast, confettiBurst } from './components.js';

const GREEN = '#4e9a6b', CAL = '#d8893c', CARBS = '#8b94a1', FAT = '#c39a63';

export const MEAL_ORDER = ['breakfast', 'morning_snack', 'lunch', 'evening_snack', 'dinner', 'midnight_snack'];
export const MEAL_LABEL = {
  breakfast: 'Breakfast', morning_snack: 'Morning snack', lunch: 'Lunch',
  evening_snack: 'Evening snack', dinner: 'Dinner', midnight_snack: 'Midnight snack',
};

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
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
        el('.name', {}, [s.name || 'there']),
        el('.goal-pill', {}, [`${g.short}${weekNum(s.startDate) ? ' · Week ' + weekNum(s.startDate) : ''}`]),
      ]),
    ]),

    el('.card.hero', {}, [
      el('.hero-ring', {}, [
        ring({ value: totals.kcal, max: s.goalKcal, color: CAL, size: 142, stroke: 12,
          big: totals.kcal, small: `of ${s.goalKcal}`, tiny: leftText }),
        el('.hero-cap', {}, ['CALORIES']),
      ]),
      el('.hero-bars', {}, [
        bar({ label: 'Protein', value: totals.protein, max: s.goalProtein, suffix: 'g', color: GREEN }),
        bar({ label: 'Carbs', value: totals.carbs, max: s.goalCarbs, suffix: 'g', color: CARBS }),
        bar({ label: 'Fat', value: totals.fat, max: s.goalFat, suffix: 'g', color: FAT }),
      ]),
    ]),

    el('.card.weight-tile', { onclick: () => ctx.openWeight() }, [
      el('.mini-label', {}, ['Weight']),
      el('.mini-val', {}, [
        trend.latest != null ? `${trend.latest} kg` : el('span.mini-hint', {}, ['Tap to log']),
        trend.deltaWeek != null ? el('span.mini-delta', { style: { color: trend.deltaWeek >= 0 ? GREEN : CAL } },
          [`  ${trend.deltaWeek >= 0 ? '+' : ''}${trend.deltaWeek}/wk`]) : null,
      ]),
    ]),

    coachingStrip(s, totals),

    el('.quick-actions', {}, [
      el('button.qa.primary', { onclick: () => ctx.startScan() }, ['Scan']),
      el('button.qa', { onclick: () => ctx.openManualAdd() }, ['Add food']),
      el('button.qa', { onclick: () => ctx.openRepeat() }, ['Repeat']),
    ]),

    el('.section-label', {}, ['Today']),
    timeline(meals, ctx),
  ]));

  animateRings(root); animateBars(root);

  if (totals.protein >= s.goalProtein && s.confettiShownFor !== today) {
    store.saveSettings({ confettiShownFor: today });
    confettiBurst(); toast('Protein goal hit.');
  }
}

function coachingStrip(s, totals) {
  const h = new Date().getHours();
  const kcalLeft = s.goalKcal - totals.kcal;
  const protLeft = s.goalProtein - totals.protein;
  if (h < 16) return null;
  if (s.goal !== 'gain' && protLeft <= 5) return null;
  if (s.goal === 'gain' && kcalLeft <= 50) return null;
  const rec = N.missedCalories({ kcal: s.goal === 'gain' ? kcalLeft : Math.max(150, protLeft * 6), protein: protLeft });
  if (!rec.items.length) return null;
  const suggestion = rec.items.map(i => i.label).join(', ');
  const title = s.goal === 'gain'
    ? `${Math.max(0, Math.round(kcalLeft))} kcal and ${Math.max(0, Math.round(protLeft))}g protein to go`
    : `${Math.max(0, Math.round(protLeft))}g protein still to hit`;
  return el('.card.coaching', {}, [
    el('.coach-title', {}, [title]),
    el('.coach-sub', {}, [`Try: ${suggestion}`]),
  ]);
}

function timeline(meals, ctx) {
  const groups = {};
  for (const m of meals) {
    const type = MEAL_LABEL[m.mealType] ? m.mealType : 'evening_snack'; // remap legacy
    (groups[type] ||= []).push(m);
  }
  const wrap = el('.timeline');

  if (!meals.length) {
    const cur = N.mealTypeForTime(store.timeNow());
    wrap.appendChild(el('.empty', {}, ['Nothing logged yet today.', el('br'), el('span', {}, ['Tap Scan or Add food to start.'])]));
    wrap.appendChild(el('.tl-empty', { onclick: () => ctx.openManualAdd(cur) }, [
      el('.tl-empty-text', {}, [`Add to ${MEAL_LABEL[cur]}`]),
      el('.tl-plus', {}, ['+']),
    ]));
    return wrap;
  }

  for (const type of MEAL_ORDER) {
    if (!groups[type]) continue;
    const sub = N.sumMacros(groups[type]);
    const rows = groups[type].sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(m => mealRow(m, ctx));
    wrap.appendChild(el('.tl-group', {}, [
      el('.tl-group-head', {}, [
        el('.tl-group-title', {}, [MEAL_LABEL[type]]),
        el('.tl-group-meta', {}, [
          el('.tl-group-kcal', {}, [`${sub.kcal} kcal`]),
          el('button.tl-add', { onclick: (e) => { e.stopPropagation(); ctx.openManualAdd(type); } }, ['+']),
        ]),
      ]),
      ...rows,
    ]));
  }
  // add-to-current-section prompt
  const cur = N.mealTypeForTime(store.timeNow());
  if (!groups[cur]) {
    wrap.appendChild(el('.tl-empty', { onclick: () => ctx.openManualAdd(cur) }, [
      el('.tl-empty-text', {}, [`Add to ${MEAL_LABEL[cur]}`]),
      el('.tl-plus', {}, ['+']),
    ]));
  }
  return wrap;
}

function mealRow(m, ctx) {
  return el('.tl-row', { onclick: () => ctx.openMealEdit(m) }, [
    el('.tl-main', {}, [
      el('.tl-name', {}, [m.name, m.source === 'scan' ? el('span.tl-badge', {}, ['scan']) : null]),
      el('.tl-time', {}, [m.time || '']),
    ]),
    el('.tl-macros', {}, [
      el('.tl-kcal', {}, [String(Math.round(m.kcal))]),
      el('.tl-prot', {}, [`${Math.round(m.protein)}g P`]),
    ]),
  ]);
}
