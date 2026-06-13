// sheets.js — modal flows: manual add (with meal-section picker), portion,
// meal edit, weight log, repeat-yesterday.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { QUICK_TEMPLATES, QUICK_ADD_CHIPS, searchFoods, findFood, macrosFor } from '../foods.js';
import { el, openSheet, closeSheet, toast } from './components.js';

const MEAL_TYPES = [
  ['breakfast', 'Breakfast'], ['morning_snack', 'Morning snack'], ['lunch', 'Lunch'],
  ['evening_snack', 'Evening snack'], ['dinner', 'Dinner'], ['midnight_snack', 'Midnight snack'],
];

function macroPreview(m) {
  return el('.macro-preview', {}, [
    pill(`${Math.round(m.kcal)}`, 'kcal'), pill(`${m.protein}g`, 'protein'),
    pill(`${m.carbs}g`, 'carbs'), pill(`${m.fat}g`, 'fat'), pill(`${m.fibre}g`, 'fibre'),
  ]);
}
const pill = (v, l) => el('.mp', {}, [el('.mp-v', {}, [v]), el('.mp-l', {}, [l])]);

function sectionSelect(addState) {
  const sel = el('select.type-sel', {}, MEAL_TYPES.map(([v, l]) => {
    const o = el('option', { value: v }, [l]); if (v === addState.mealType) o.selected = true; return o;
  }));
  sel.addEventListener('change', () => { addState.mealType = sel.value; });
  return el('.field', {}, [el('label', {}, ['Add to meal']), sel]);
}

// ---------- Manual Add ----------
export function openManualAdd(ctx, presetType) {
  const addState = { mealType: presetType || N.mealTypeForTime(store.timeNow()) };
  const results = el('.food-results');
  const usualsWrap = el('div');

  const renderResults = (list) => {
    results.replaceChildren();
    if (!list.length) { results.appendChild(el('.empty-sm', {}, ['No matches — try “Custom meal” below.'])); return; }
    for (const f of list) results.appendChild(el('.food-item', { onclick: () => openPortion(f, ctx, addState.mealType) }, [
      el('.fi-emoji', {}, [f.emoji || '🍽️']), el('.fi-name', {}, [f.name]), el('.fi-cal', {}, [`${f.per100.kcal} /100g`]),
    ]));
  };
  const search = el('input.search-input', { type: 'search', placeholder: 'Search any food…', inputmode: 'search' });
  search.addEventListener('input', () => renderResults(searchFoods(search.value, 14)));

  store.getFoodMemory().then(mem => {
    const usuals = mem.filter(m => m.count >= 2).slice(0, 6);
    if (!usuals.length) return;
    usualsWrap.appendChild(el('.section-label', {}, ['Your usuals']));
    usualsWrap.appendChild(el('.usuals', {}, usuals.map(u =>
      el('button.usual', { onclick: () => logRemembered(u, ctx, addState.mealType) }, [el('.u-name', {}, [u.name]), el('.u-cal', {}, [`${Math.round(u.kcal)} kcal`])]))));
  });

  renderResults(searchFoods('', 14));

  openSheet(el('div', {}, [
    sectionSelect(addState),
    el('.section-label', {}, ['Quick add']),
    el('.tmpl-chips', {}, QUICK_ADD_CHIPS.map(chip =>
      el('button.tmpl', { onclick: () => quickAdd(chip, ctx, addState.mealType) }, [chip.label]))),
    search,
    el('.tmpl-chips', {}, QUICK_TEMPLATES.map(name => { const f = findFood(name); return f ? el('button.tmpl', { onclick: () => openPortion(f, ctx, addState.mealType) }, [name.split(' ')[0]]) : null; })),
    usualsWrap,
    el('.section-label', {}, ['All foods']),
    results,
    el('button.btn-ghost.full', { onclick: () => openCustom(ctx, addState.mealType) }, ['Custom meal']),
  ]), { title: 'Add a meal' });
}

async function quickAdd(chip, ctx, mealType) {
  const food = findFood(chip.food); if (!food) return;
  const m = macrosFor(food, chip.grams);
  await store.addMeal({ dateKey: store.todayKey(), time: store.timeNow(), mealType, name: food.name, source: 'quick', ...m });
  closeSheet(); toast(`Added ${food.name} · ${m.kcal} kcal`); ctx.refresh();
}

async function logRemembered(u, ctx, mealType) {
  await store.addMeal({ dateKey: store.todayKey(), time: store.timeNow(), mealType, name: u.name, source: 'manual',
    grams: u.grams, kcal: u.kcal, protein: u.protein, carbs: u.carbs, fat: u.fat, fibre: u.fibre });
  closeSheet(); toast(`Logged ${u.name} · ${Math.round(u.kcal)} kcal`); ctx.refresh();
}

// ---------- Portion picker ----------
function openPortion(food, ctx, mealType) {
  let grams = food.units[0].grams;
  const preview = el('div');
  const gramsLabel = el('.grams-big');
  const draw = () => { preview.replaceChildren(macroPreview(macrosFor(food, grams))); gramsLabel.textContent = `${grams} g`; };
  const unitRow = el('.unit-row', {}, food.units.map(u =>
    el('button.unit', { onclick: () => { grams = u.grams; draw(); [...unitRow.children].forEach(b => b.classList.toggle('active', b.textContent === u.label)); } }, [u.label])));
  const step = el('.stepper', {}, [
    el('button.step-btn', { onclick: () => { grams = Math.max(5, grams - 25); draw(); } }, ['−25']),
    el('button.step-btn', { onclick: () => { grams = Math.max(5, grams - 5); draw(); } }, ['−5']),
    el('button.step-btn', { onclick: () => { grams += 5; draw(); } }, ['+5']),
    el('button.step-btn', { onclick: () => { grams += 25; draw(); } }, ['+25']),
  ]);
  openSheet(el('div', {}, [
    el('.portion-head', {}, [el('.fi-emoji.big', {}, [food.emoji || '🍽️']), el('h3', {}, [food.name])]),
    gramsLabel, unitRow, step, preview,
    el('button.btn-primary.full', { onclick: async () => {
      const m = macrosFor(food, grams);
      await store.addMeal({ dateKey: store.todayKey(), time: store.timeNow(), mealType, name: food.name, source: 'manual', ...m });
      closeSheet(); toast(`Logged ${food.name} · ${m.kcal} kcal`); ctx.refresh();
    } }, ['Save meal']),
  ]), { title: MEAL_TYPES.find(t => t[0] === mealType)?.[1] || 'Portion' });
  draw(); [...unitRow.children].forEach(b => b.classList.toggle('active', b.textContent === food.units[0].label));
}

function openCustom(ctx, mealType) {
  openMealForm(ctx, { title: 'Custom meal', meal: { name: '', grams: null, kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, mealType },
    onSave: async (m) => { await store.addMeal({ dateKey: store.todayKey(), time: store.timeNow(), source: 'manual', ...m }); closeSheet(); toast(`Logged ${m.name} · ${m.kcal} kcal`); ctx.refresh(); } });
}

// ---------- Meal edit ----------
export function openMealEdit(meal, ctx) {
  openMealForm(ctx, { title: 'Edit meal', meal: { ...meal }, showExtras: true,
    onSave: async (m) => { await store.updateMeal({ ...meal, ...m }); closeSheet(); toast('Meal updated'); ctx.refresh(); },
    onDelete: async () => { const removed = { ...meal }; await store.deleteMeal(meal.id); closeSheet(); ctx.refresh(); toast('Meal deleted', { action: 'Undo', onAction: async () => { await store.updateMeal(removed); ctx.refresh(); } }); },
    onDuplicate: async () => { const { id, ...rest } = meal; await store.addMeal({ ...rest, dateKey: store.todayKey(), time: store.timeNow() }); closeSheet(); toast('Copied to today'); ctx.refresh(); } });
}

function openMealForm(ctx, { title, meal, onSave, onDelete, onDuplicate, showExtras }) {
  const m = { ...meal };
  const field = (key, label, suffix = '') => {
    const input = el('input.num-input', { type: 'number', inputmode: 'decimal', value: m[key] ?? '', step: 'any' });
    input.addEventListener('input', () => { m[key] = parseFloat(input.value) || 0; });
    return el('.field', {}, [el('label', {}, [label]), el('.num-wrap', {}, [input, suffix ? el('span.num-suffix', {}, [suffix]) : null])]);
  };
  const nameInput = el('input.search-input', { type: 'text', placeholder: 'Meal name', value: m.name || '' });
  nameInput.addEventListener('input', () => { m.name = nameInput.value; });

  const macroFields = el('.macro-grid');
  const drawMacros = () => macroFields.replaceChildren(field('kcal', 'Calories', 'kcal'), field('protein', 'Protein', 'g'), field('carbs', 'Carbs', 'g'), field('fat', 'Fat', 'g'), field('fibre', 'Fibre', 'g'));
  drawMacros();

  const gramsCtl = m.grams != null ? el('.field', {}, [el('label', {}, ['Portion (g) — rescales macros']),
    el('.stepper', {}, [el('button.step-btn', { onclick: () => rescale(-50) }, ['−50']), el('.step-val', { id: 'gv' }, [`${m.grams}g`]), el('button.step-btn', { onclick: () => rescale(50) }, ['+50'])])]) : null;
  function rescale(delta) { const ng = Math.max(5, (m.grams || 0) + delta); Object.assign(m, N.scaleMacros(m, m.grams, ng)); gramsCtl.querySelector('#gv').textContent = `${m.grams}g`; drawMacros(); }

  const typeSel = el('select.type-sel', {}, MEAL_TYPES.map(([t, label]) => { const o = el('option', { value: t }, [label]); if ((m.mealType || N.mealTypeForTime(store.timeNow())) === t) o.selected = true; return o; }));
  typeSel.addEventListener('change', () => { m.mealType = typeSel.value; });

  openSheet(el('div', {}, [
    nameInput, gramsCtl,
    el('.field', {}, [el('label', {}, ['Meal']), typeSel]),
    macroFields,
    el('.form-actions', {}, [
      onDelete ? el('button.btn-danger', { onclick: onDelete }, ['Delete']) : null,
      onDuplicate ? el('button.btn-ghost', { onclick: onDuplicate }, ['Copy to today']) : null,
      el('button.btn-primary', { onclick: () => { if (!m.name) { toast('Give it a name'); return; } m.mealType = m.mealType || typeSel.value; onSave(m); } }, ['Save']),
    ]),
  ]), { title });
}

// ---------- Weight ----------
export function openWeight(ctx) {
  const s = store.getSettings();
  const input = el('input.weight-input', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: 'kg', value: s.currentWeightKg ?? '' });
  openSheet(el('div', {}, [
    el('.weight-row', {}, [input, el('span.weight-unit', {}, ['kg'])]),
    el('.hint', {}, ['Same time each day (morning, empty stomach) gives the cleanest trend.']),
    el('button.btn-primary.full', { onclick: async () => { const kg = parseFloat(input.value); if (!kg || kg < 20 || kg > 400) { toast('Enter a realistic weight'); return; } await store.setWeight(store.todayKey(), kg); closeSheet(); toast(`Logged ${kg} kg`); ctx.refresh(); } }, ['Save weight']),
  ]), { title: 'Log weight' });
  setTimeout(() => input.focus(), 250);
}

// ---------- Repeat yesterday ----------
export async function openRepeat(ctx) {
  const y = store.shiftKey(store.todayKey(), -1);
  const meals = await store.getMealsByDate(y);
  let body;
  if (!meals.length) body = el('.empty', {}, ['Nothing logged yesterday to repeat.']);
  else {
    const addOne = async (meal) => { const { id, ...rest } = meal; await store.addMeal({ ...rest, dateKey: store.todayKey(), time: store.timeNow() }); toast(`Added ${meal.name}`); ctx.refresh(); };
    body = el('div', {}, [
      el('button.btn-primary.full', { onclick: async () => { for (const meal of meals) { const { id, ...rest } = meal; await store.addMeal({ ...rest, dateKey: store.todayKey() }); } closeSheet(); toast(`Repeated ${meals.length} meals`); ctx.refresh(); } }, [`Repeat all (${meals.length})`]),
      el('.section-label', {}, ['Or pick one']),
      ...meals.map(meal => el('.food-item', { onclick: () => addOne(meal) }, [el('.fi-name', {}, [meal.name]), el('.fi-cal', {}, [`${Math.round(meal.kcal)} kcal`]), el('.fi-plus', {}, ['+'])])),
    ]);
  }
  openSheet(body, { title: 'Repeat yesterday' });
}
