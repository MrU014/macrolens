// history.js — past days, expandable, with search.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { el, bar, animateBars } from './components.js';

const ORANGE = '#e8833a', GREEN = '#7fae8b';

function dayLabel(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = store.todayKey(), yest = store.shiftKey(today, -1);
  if (key === today) return 'Today';
  if (key === yest) return 'Yesterday';
  return dt.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export async function render(root, ctx) {
  const s = store.getSettings();
  const all = await store.getAllMeals();

  root.replaceChildren();
  const screen = el('.screen.history', {}, [el('h1.page-title', {}, ['History'])]);

  const search = el('input.search-input', { type: 'search', placeholder: 'Search meals…' });
  const list = el('.history-list');
  screen.append(search, list);
  root.appendChild(screen);

  const byDay = new Map();
  for (const m of all) { if (!byDay.has(m.dateKey)) byDay.set(m.dateKey, []); byDay.get(m.dateKey).push(m); }
  const days = [...byDay.keys()].sort((a, b) => b.localeCompare(a));

  const draw = (q = '') => {
    list.replaceChildren();
    if (q) {
      const hits = all.filter(m => m.name.toLowerCase().includes(q.toLowerCase()));
      if (!hits.length) { list.appendChild(el('.empty', {}, ['No meals match that.'])); return; }
      for (const m of hits) list.appendChild(mealRow(m, ctx));
      return;
    }
    if (!days.length) { list.appendChild(el('.empty', {}, ['No history yet — your logged days will appear here.'])); return; }
    for (const key of days) {
      const meals = byDay.get(key);
      const t = N.sumMacros(meals);
      const score = N.bulkScore({ kcal: t.kcal, goalKcal: s.goalKcal, protein: t.protein, goalProtein: s.goalProtein, mealCount: meals.length });
      const body = el('.day-body');
      let open = false;
      const card = el('.card.day-card', {}, [
        el('.day-head', { onclick: () => { open = !open; body.replaceChildren(open ? mealsList(meals, ctx) : null); card.classList.toggle('open', open); } }, [
          el('.day-date', {}, [dayLabel(key)]),
          el('.day-score', {}, [String(score)]),
        ]),
        el('.day-bars', {}, [
          bar({ label: 'Calories', value: t.kcal, max: s.goalKcal, suffix: '', color: ORANGE }),
          bar({ label: 'Protein', value: t.protein, max: s.goalProtein, suffix: 'g', color: GREEN }),
        ]),
        body,
      ]);
      list.appendChild(card);
    }
    animateBars(list);
  };

  search.addEventListener('input', () => draw(search.value));
  draw();
}

function mealsList(meals, ctx) {
  return el('.day-meals', {}, meals.map(m => mealRow(m, ctx)));
}
function mealRow(m, ctx) {
  return el('.hist-row', { onclick: () => ctx.openMealEdit(m) }, [
    el('.hist-name', {}, [m.name, m.source === 'scan' ? el('span.tl-badge', {}, ['scan']) : null]),
    el('.hist-macros', {}, [`${Math.round(m.kcal)} kcal · ${Math.round(m.protein)}g P`]),
  ]);
}
