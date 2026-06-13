// sheets.js — modal flows shared across screens: manual add, portion picker,
// meal edit, weight log, repeat-yesterday.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { FOOD_DB, QUICK_TEMPLATES, searchFoods, findFood, macrosFor } from '../foods.js';
import { el, openSheet, closeSheet, toast } from './components.js';

const ORANGE = '#e8833a';

function macroPreview(m) {
  return el('.macro-preview', {}, [
    pill(`${Math.round(m.kcal)}`, 'kcal', ORANGE),
    pill(`${N.clamp(m.protein, 0, 9999)}g`, 'protein', '#9ecfaa'),
    pill(`${m.carbs}g`, 'carbs', '#c9cdd4'),
    pill(`${m.fat}g`, 'fat', '#c9cdd4'),
    pill(`${m.fibre}g`, 'fibre', '#8fbfae'),
  ]);
}
const pill = (v, l, c) => el('.mp', {}, [el('.mp-v', { style: { color: c } }, [v]), el('.mp-l', {}, [l])]);

// ---------- Manual Add ----------
export function openManualAdd(ctx) {
  const results = el('.food-results');
  const usualsWrap = el('div');

  const renderResults = (list) => {
    results.replaceChildren();
    if (!list.length) { results.appendChild(el('.empty-sm', {}, ['No matches. Try “Custom meal” below.'])); return; }
    for (const f of list) {
      results.appendChild(el('.food-item', { onclick: () => openPortion(f, ctx) }, [
        el('.fi-emoji', {}, [f.emoji || '🍽️']),
        el('.fi-name', {}, [f.name]),
        el('.fi-cal', {}, [`${f.per100.kcal} kcal /100g`]),
      ]));
    }
  };

  const search = el('input.search-input', { type: 'search', placeholder: 'Search food…', inputmode: 'search' });
  search.addEventListener('input', () => renderResults(searchFoods(search.value, 12)));

  // Your usuals (food memory, count >= 2)
  store.getFoodMemory().then(mem => {
    const usuals = mem.filter(m => m.count >= 2).slice(0, 6);
    if (!usuals.length) return;
    usualsWrap.appendChild(el('.section-label', {}, ['YOUR USUALS']));
    usualsWrap.appendChild(el('.usuals', {}, usuals.map(u =>
      el('button.usual', { onclick: () => logRemembered(u, ctx) }, [
        el('.u-name', {}, [u.name]), el('.u-cal', {}, [`${Math.round(u.kcal)} kcal`]),
      ]))));
  });

  renderResults(searchFoods('', 12));

  const body = el('div', {}, [
    search,
    el('.tmpl-chips', {}, QUICK_TEMPLATES.map(name => {
      const f = findFood(name);
      return f ? el('button.tmpl', { onclick: () => openPortion(f, ctx) }, [`${f.emoji} ${name.split(' ')[0]}`]) : null;
    })),
    usualsWrap,
    el('.section-label', {}, ['ALL FOODS']),
    results,
    el('button.btn-ghost.full', { onclick: () => openCustom(ctx) }, ['✎  Custom meal']),
  ]);
  openSheet(body, { title: 'Add a meal' });
}

async function logRemembered(u, ctx) {
  await store.addMeal({
    dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()),
    name: u.name, source: 'manual', grams: u.grams,
    kcal: u.kcal, protein: u.protein, carbs: u.carbs, fat: u.fat, fibre: u.fibre,
  });
  closeSheet(); toast(`Logged ${u.name} · ${Math.round(u.kcal)} kcal`); ctx.refresh();
}

// ---------- Portion picker (for a DB food) ----------
function openPortion(food, ctx) {
  let grams = food.units[0].grams;
  const preview = el('div');
  const gramsLabel = el('.grams-big');
  const draw = () => { preview.replaceChildren(macroPreview(macrosFor(food, grams))); gramsLabel.textContent = `${grams} g`; };

  const unitRow = el('.unit-row', {}, food.units.map(u =>
    el('button.unit', { onclick: () => { grams = u.grams; draw(); markActive(unitRow, u.label); } }, [u.label])));
  const customStep = el('.stepper', {}, [
    el('button.step-btn', { onclick: () => { grams = Math.max(5, grams - 25); draw(); } }, ['−25']),
    el('button.step-btn', { onclick: () => { grams = Math.max(5, grams - 5); draw(); } }, ['−5']),
    el('button.step-btn', { onclick: () => { grams += 5; draw(); } }, ['+5']),
    el('button.step-btn', { onclick: () => { grams += 25; draw(); } }, ['+25']),
  ]);

  const body = el('div', {}, [
    el('.portion-head', {}, [el('.fi-emoji.big', {}, [food.emoji || '🍽️']), el('h3', {}, [food.name])]),
    gramsLabel, unitRow, customStep, preview,
    el('button.btn-primary.full', { onclick: async () => {
      const m = macrosFor(food, grams);
      await store.addMeal({ dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()),
        name: food.name, source: 'manual', ...m });
      closeSheet(); toast(`Logged ${food.name} · ${m.kcal} kcal`); ctx.refresh();
    } }, ['Save meal']),
  ]);
  openSheet(body, { title: 'Portion' });
  draw(); markActive(unitRow, food.units[0].label);
}
function markActive(row, label) {
  row.querySelectorAll('.unit').forEach(b => b.classList.toggle('active', b.textContent === label));
}

// ---------- Custom meal form ----------
function openCustom(ctx) {
  openMealForm(ctx, {
    title: 'Custom meal',
    meal: { name: '', grams: null, kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
    onSave: async (m) => {
      await store.addMeal({ dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()), source: 'manual', ...m });
      closeSheet(); toast(`Logged ${m.name} · ${m.kcal} kcal`); ctx.refresh();
    },
  });
}

// ---------- Meal edit ----------
export function openMealEdit(meal, ctx) {
  openMealForm(ctx, {
    title: 'Edit meal',
    meal: { ...meal },
    showExtras: true,
    onSave: async (m) => {
      await store.updateMeal({ ...meal, ...m });
      closeSheet(); toast('Meal updated'); ctx.refresh();
    },
    onDelete: async () => {
      const removed = { ...meal };
      await store.deleteMeal(meal.id);
      closeSheet(); ctx.refresh();
      toast('Meal deleted', { action: 'Undo', onAction: async () => { await store.updateMeal(removed); ctx.refresh(); } });
    },
    onDuplicate: async () => {
      const { id, ...rest } = meal;
      await store.addMeal({ ...rest, dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()) });
      closeSheet(); toast('Copied to today'); ctx.refresh();
    },
  });
}

// Shared form for custom + edit. Editing grams re-scales macros proportionally.
function openMealForm(ctx, { title, meal, onSave, onDelete, onDuplicate, showExtras }) {
  const m = { ...meal };
  const field = (key, label, suffix = '') => {
    const input = el('input.num-input', { type: 'number', inputmode: 'decimal', value: m[key] ?? '', step: 'any' });
    input.addEventListener('input', () => { m[key] = parseFloat(input.value) || 0; });
    return el('.field', {}, [el('label', {}, [label]), el('.num-wrap', {}, [input, suffix ? el('span.num-suffix', {}, [suffix]) : null])]);
  };

  const nameInput = el('input.search-input', { type: 'text', placeholder: 'Meal name', value: m.name || '' });
  nameInput.addEventListener('input', () => { m.name = nameInput.value; });

  // grams stepper that re-scales the macro fields
  const macroFields = el('.macro-grid');
  const drawMacros = () => macroFields.replaceChildren(
    field('kcal', 'Calories', 'kcal'), field('protein', 'Protein', 'g'),
    field('carbs', 'Carbs', 'g'), field('fat', 'Fat', 'g'), field('fibre', 'Fibre', 'g'));
  drawMacros();

  const gramsCtl = m.grams != null ? el('.field', {}, [
    el('label', {}, ['Portion (g) — rescales macros']),
    el('.stepper', {}, [
      el('button.step-btn', { onclick: () => rescale(-50) }, ['−50']),
      el('.step-val', { id: 'gv' }, [`${m.grams}g`]),
      el('button.step-btn', { onclick: () => rescale(50) }, ['+50']),
    ]),
  ]) : null;
  function rescale(delta) {
    const ng = Math.max(5, (m.grams || 0) + delta);
    const scaled = N.scaleMacros(m, m.grams, ng);
    Object.assign(m, scaled);
    gramsCtl.querySelector('#gv').textContent = `${m.grams}g`;
    drawMacros();
  }

  const typeSel = el('select.type-sel', {},
    ['breakfast', 'lunch', 'snack', 'dinner'].map(t => {
      const o = el('option', { value: t }, [t[0].toUpperCase() + t.slice(1)]);
      if ((m.mealType || N.mealTypeForTime(store.timeNow())) === t) o.selected = true;
      return o;
    }));
  typeSel.addEventListener('change', () => { m.mealType = typeSel.value; });

  const actions = el('.form-actions', {}, [
    onDelete ? el('button.btn-danger', { onclick: onDelete }, ['Delete']) : null,
    onDuplicate ? el('button.btn-ghost', { onclick: onDuplicate }, ['Copy to today']) : null,
    el('button.btn-primary', { onclick: () => {
      if (!m.name) { toast('Give it a name'); return; }
      m.mealType = m.mealType || typeSel.value;
      onSave(m);
    } }, ['Save']),
  ]);

  openSheet(el('div', {}, [nameInput, gramsCtl, showExtras ? el('.field', {}, [el('label', {}, ['Meal']), typeSel]) : null, macroFields, actions]), { title });
}

// ---------- Weight log ----------
export function openWeight(ctx) {
  const s = store.getSettings();
  const input = el('input.weight-input', { type: 'number', inputmode: 'decimal', step: '0.1',
    placeholder: 'kg', value: s.currentWeightKg ?? '' });
  const body = el('div', {}, [
    el('.weight-row', {}, [input, el('span.weight-unit', {}, ['kg'])]),
    el('.hint', {}, ['Same time each day (morning, empty stomach) gives the cleanest trend.']),
    el('button.btn-primary.full', { onclick: async () => {
      const kg = parseFloat(input.value);
      if (!kg || kg < 20 || kg > 300) { toast('Enter a realistic weight'); return; }
      await store.setWeight(store.todayKey(), kg);
      closeSheet(); toast(`Logged ${kg} kg`); ctx.refresh();
    } }, ['Save weight']),
  ]);
  openSheet(body, { title: 'Log weight' });
  setTimeout(() => input.focus(), 250);
}

// ---------- Repeat yesterday ----------
export async function openRepeat(ctx) {
  const y = store.shiftKey(store.todayKey(), -1);
  const meals = await store.getMealsByDate(y);
  let body;
  if (!meals.length) {
    body = el('.empty', {}, ['Nothing logged yesterday to repeat.']);
  } else {
    const addOne = async (meal) => {
      const { id, ...rest } = meal;
      await store.addMeal({ ...rest, dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()) });
      toast(`Added ${meal.name}`); ctx.refresh();
    };
    body = el('div', {}, [
      el('button.btn-primary.full', { onclick: async () => {
        for (const meal of meals) { const { id, ...rest } = meal; await store.addMeal({ ...rest, dateKey: store.todayKey() }); }
        closeSheet(); toast(`Repeated ${meals.length} meals`); ctx.refresh();
      } }, [`↺ Repeat all (${meals.length})`]),
      el('.section-label', {}, ['OR PICK ONE']),
      ...meals.map(meal => el('.food-item', { onclick: () => addOne(meal) }, [
        el('.fi-emoji', {}, ['🍽️']),
        el('.fi-name', {}, [meal.name]),
        el('.fi-cal', {}, [`${Math.round(meal.kcal)} kcal`]),
        el('.fi-plus', {}, ['＋']),
      ])),
    ]);
  }
  openSheet(body, { title: 'Repeat yesterday' });
}
