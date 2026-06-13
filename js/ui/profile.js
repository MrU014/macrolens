// profile.js — personal details, goals, AI key, and data management.
import * as store from '../store.js';
import { testKey } from '../gemini.js';
import { el, openSheet, closeSheet, toast } from './components.js';

export async function render(root, ctx) {
  const s = store.getSettings();

  const numField = (key, label, suffix = '', opts = {}) => {
    const input = el('input.num-input', { type: 'number', inputmode: 'decimal', step: opts.step || '1', value: s[key] ?? '' });
    input.addEventListener('change', async () => {
      const v = input.value === '' ? null : parseFloat(input.value);
      await store.saveSettings({ [key]: v });
      toast('Saved');
    });
    return el('.field.row-field', {}, [el('label', {}, [label]), el('.num-wrap', {}, [input, suffix ? el('span.num-suffix', {}, [suffix]) : null])]);
  };

  const textField = (key, label, placeholder = '') => {
    const input = el('input.search-input', { type: 'text', placeholder, value: s[key] ?? '' });
    input.addEventListener('change', async () => { await store.saveSettings({ [key]: input.value }); toast('Saved'); });
    return el('.field', {}, [el('label', {}, [label]), input]);
  };

  const dateField = (key, label) => {
    const input = el('input.search-input', { type: 'date', value: s[key] ?? '' });
    input.addEventListener('change', async () => { await store.saveSettings({ [key]: input.value }); toast('Saved'); });
    return el('.field', {}, [el('label', {}, [label]), input]);
  };

  root.replaceChildren();
  root.appendChild(el('.screen.profile', {}, [
    el('h1.page-title', {}, ['Profile']),

    section('YOU', [
      textField('name', 'Name', 'Your name'),
      el('.field.row-field', {}, [el('label', {}, ['Current weight']),
        el('button.btn-ghost', { onclick: () => ctx.openWeight() }, [s.currentWeightKg ? `${s.currentWeightKg} kg` : 'Log weight'])]),
      numField('targetWeightKg', 'Target weight', 'kg', { step: '0.1' }),
      dateField('targetDate', 'Target date'),
      dateField('startDate', 'Bulk start date'),
      numField('gymDaysPerWeek', 'Gym days / week'),
    ]),

    section('GOALS', [
      el('.field.row-field', {}, [el('label', {}, ['Maintenance']),
        el('.num-wrap', {}, [String(s.maintenanceKcal), el('span.num-suffix', {}, ['kcal'])])]),
      el('button.btn-ghost.full', { onclick: () => openCalculator(ctx) }, ['🧮  Calculate maintenance']),
      numField('goalKcal', 'Daily calories', 'kcal'),
      numField('goalProtein', 'Protein', 'g'),
      numField('goalFat', 'Fat', 'g'),
      numField('goalFibre', 'Fibre', 'g'),
    ]),

    apiSection(s),

    section('DATA', [
      el('button.btn-ghost.full', { onclick: exportBackup }, ['⬇️  Export backup']),
      el('button.btn-ghost.full', { onclick: () => importBackup(ctx) }, ['⬆️  Import backup']),
      el('button.btn-danger.full', { onclick: () => resetAll(ctx) }, ['Reset all data']),
    ]),

    el('.app-footer', {}, ['MacroLens · roughly right beats perfectly tracked']),
  ]));
}

function section(title, fields) {
  return el('.card.settings-card', {}, [el('.section-label', {}, [title]), ...fields]);
}

function apiSection(s) {
  const input = el('input.search-input', { type: 'password', placeholder: 'Paste Gemini API key', value: s.geminiApiKey || '' });
  const status = el('.key-status');
  const reveal = el('button.btn-mini', { onclick: () => { input.type = input.type === 'password' ? 'text' : 'password'; } }, ['👁']);
  input.addEventListener('change', async () => { await store.saveSettings({ geminiApiKey: input.value.trim() }); toast('Key saved on this device'); });
  return el('.card.settings-card', {}, [
    el('.section-label', {}, ['AI SCANNING']),
    el('.field', {}, [el('label', {}, ['Gemini API key']), el('.key-row', {}, [input, reveal])]),
    el('.key-actions', {}, [
      el('button.btn-primary', { onclick: async () => {
        status.textContent = 'Testing…'; status.className = 'key-status';
        const r = await testKey(input.value.trim());
        status.textContent = r.message; status.className = 'key-status ' + (r.ok ? 'ok' : 'bad');
      } }, ['Test key']),
      el('a.btn-ghost', { href: 'https://aistudio.google.com/app/apikey', target: '_blank', rel: 'noopener' }, ['Get a free key ↗']),
    ]),
    status,
    el('.hint', {}, ['Stored only on this device and sent directly to Google over HTTPS. Excluded from backups.']),
  ]);
}

// Mifflin–St Jeor maintenance calculator.
function openCalculator(ctx) {
  const s = store.getSettings();
  const f = (label, key, val, suffix) => {
    const inp = el('input.num-input', { type: 'number', inputmode: 'decimal', value: val ?? '' });
    inp.dataset.key = key;
    return { row: el('.field.row-field', {}, [el('label', {}, [label]), el('.num-wrap', {}, [inp, el('span.num-suffix', {}, [suffix])])]), inp };
  };
  const age = f('Age', 'age', s.age, 'yr');
  const height = f('Height', 'heightCm', s.heightCm, 'cm');
  const weight = f('Weight', 'w', s.currentWeightKg, 'kg');
  const activity = el('select.type-sel', {}, [
    ['1.2', 'Sedentary'], ['1.375', 'Light (1-3 gym/wk)'], ['1.55', 'Moderate (3-5)'], ['1.725', 'Heavy (6-7)'],
  ].map(([v, l]) => el('option', { value: v }, [l])));
  activity.value = '1.55';
  const result = el('.calc-result');

  const body = el('div', {}, [
    el('.hint', {}, ['Mifflin–St Jeor estimate. Tune it over a week against your real weight trend.']),
    age.row, height.row, weight.row,
    el('.field', {}, [el('label', {}, ['Activity']), activity]),
    el('button.btn-primary.full', { onclick: async () => {
      const a = parseFloat(age.inp.value), h = parseFloat(height.inp.value), w = parseFloat(weight.inp.value);
      if (!a || !h || !w) { toast('Fill age, height, weight'); return; }
      const bmr = 10 * w + 6.25 * h - 5 * a + 5; // male formula
      const maint = Math.round(bmr * parseFloat(activity.value));
      const goalKcal = maint + 300;
      const goalProtein = Math.round(w * 2);
      await store.saveSettings({ age: a, heightCm: h, currentWeightKg: w, maintenanceKcal: maint,
        goalKcal, goalProtein, goalFat: Math.round((goalKcal * 0.25) / 9), goalFibre: 35 });
      result.replaceChildren(el('.calc-out', {}, [
        `Maintenance ≈ ${maint} kcal`, el('br'),
        `Lean-bulk target set: ${goalKcal} kcal · ${goalProtein}g protein`,
      ]));
      toast('Goals updated');
      setTimeout(() => { closeSheet(); ctx.refresh(); }, 1400);
    } }, ['Calculate & set goals']),
    result,
  ]);
  openSheet(body, { title: 'Maintenance calculator' });
}

async function exportBackup() {
  const data = await store.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `macrolens-backup-${store.todayKey()}.json` });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup downloaded');
}

function importBackup(ctx) {
  const input = el('input', { type: 'file', accept: 'application/json', style: { display: 'none' } });
  input.addEventListener('change', () => {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await store.importData(JSON.parse(reader.result));
        toast('Backup restored 🎉'); ctx.refresh(); ctx.go('home');
      } catch (e) { toast(e.message || 'Could not read that file'); }
    };
    reader.readAsText(file);
  });
  document.body.appendChild(input); input.click(); input.remove();
}

function resetAll(ctx) {
  const body = el('div', {}, [
    el('p', {}, ['This permanently deletes all meals, weights, and settings on this device. This cannot be undone.']),
    el('button.btn-danger.full', { onclick: async () => {
      const confirmBtn = el('button.btn-danger.full', { onclick: async () => {
        await store.resetAll(); closeSheet(); toast('Everything reset'); ctx.go('home'); ctx.refresh();
      } }, ['Tap again to confirm delete']);
      body.replaceChildren(el('p', {}, ['Are you absolutely sure?']), confirmBtn);
    } }, ['Delete all data']),
  ]);
  openSheet(body, { title: 'Reset all data' });
}
