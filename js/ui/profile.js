// profile.js — account, goal, body stats, targets, AI key, and data management.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import * as profiles from '../profiles.js';
import { testKey } from '../gemini.js';
import { el, openSheet, closeSheet, toast } from './components.js';

export async function render(root, ctx) {
  const s = store.getSettings();

  const numField = (key, label, suffix = '', step = '1') => {
    const input = el('input.num-input', { type: 'number', inputmode: 'decimal', step, value: s[key] ?? '' });
    input.addEventListener('change', async () => { await store.saveSettings({ [key]: input.value === '' ? null : parseFloat(input.value) }); toast('Saved'); });
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
  const selectField = (key, label, options) => {
    const sel = el('select.type-sel', {}, options.map(([v, l]) => { const o = el('option', { value: v }, [l]); if (String(s[key]) === String(v)) o.selected = true; return o; }));
    sel.addEventListener('change', async () => { await store.saveSettings({ [key]: isNaN(sel.value) ? sel.value : parseFloat(sel.value) }); toast('Saved'); });
    return el('.field.row-field', {}, [el('label', {}, [label]), sel]);
  };

  const active = profiles.getActive();

  root.replaceChildren();
  root.appendChild(el('.screen.profile', {}, [
    el('h1.page-title', {}, ['Profile']),

    // ACCOUNT / profile
    el('.card.settings-card', {}, [
      el('.section-label', {}, ['Account']),
      el('.current-user', {}, [
        el('.avatar', { style: { background: active?.color || '#4e9a6b' } }, [profiles.initial(active?.name || s.name)]),
        el('div', {}, [el('.cu-name', {}, [active?.name || s.name || 'Me']), el('.cu-sub', {}, [`${profiles.listProfiles().length} profile${profiles.listProfiles().length === 1 ? '' : 's'} on this device`])]),
      ]),
      el('button.btn-ghost.full', { onclick: () => ctx.switchUser() }, ['Switch / add user']),
      profiles.listProfiles().length > 1 ? el('button.btn-danger.full', { onclick: () => confirmDelete(ctx) }, ['Delete this profile']) : null,
    ]),

    // GOAL selector
    el('.card.settings-card', {}, [
      el('.section-label', {}, ['My goal']),
      el('.goal-select', {}, ['lose', 'maintain', 'gain'].map(gk => {
        const g = N.goalMeta(gk);
        return el('button.goal-opt', { class: s.goal === gk ? 'active' : '', onclick: () => pickGoal(gk, ctx) }, [
          el('.goal-name', {}, [g.label]),
        ]);
      })),
      el('button.btn-ghost.full', { onclick: () => autoCalc(ctx) }, ['Auto-calculate my targets']),
    ]),

    // BODY STATS
    el('.card.settings-card', {}, [
      el('.section-label', {}, ['YOU']),
      textField('name', 'Name', 'Your name'),
      selectField('sex', 'Sex', [['male', 'Male'], ['female', 'Female']]),
      numField('age', 'Age', 'yr'),
      numField('heightCm', 'Height', 'cm'),
      el('.field.row-field', {}, [el('label', {}, ['Current weight']),
        el('button.btn-ghost', { onclick: () => ctx.openWeight() }, [s.currentWeightKg ? `${s.currentWeightKg} kg` : 'Log weight'])]),
      numField('targetWeightKg', 'Target weight', 'kg', '0.1'),
      dateField('targetDate', 'Target date'),
      selectField('activity', 'Activity', [['1.2', 'Sedentary'], ['1.375', 'Light (1-3 gym/wk)'], ['1.55', 'Moderate (3-5)'], ['1.725', 'Heavy (6-7)']]),
    ]),

    // TARGETS
    el('.card.settings-card', {}, [
      el('.section-label', {}, ['DAILY TARGETS']),
      el('.field.row-field', {}, [el('label', {}, ['Maintenance']), el('.num-wrap', {}, [String(s.maintenanceKcal), el('span.num-suffix', {}, ['kcal'])])]),
      numField('goalKcal', 'Calories', 'kcal'),
      numField('goalProtein', 'Protein', 'g'),
      numField('goalCarbs', 'Carbs', 'g'),
      numField('goalFat', 'Fat', 'g'),
      numField('goalFibre', 'Fibre', 'g'),
    ]),

    apiSection(s),

    el('.card.settings-card', {}, [
      el('.section-label', {}, ['DATA']),
      el('button.btn-ghost.full', { onclick: exportBackup }, ['Export backup']),
      el('button.btn-ghost.full', { onclick: () => importBackup(ctx) }, ['Import backup']),
      el('button.btn-danger.full', { onclick: () => resetAll(ctx) }, ['Reset all data']),
    ]),

    el('.app-footer', {}, ['MacroLens · track your way']),
  ]));
}

async function pickGoal(goal, ctx) {
  const s = store.getSettings();
  const patch = { goal };
  // recompute targets immediately if we have the body stats
  if (s.currentWeightKg && s.age && s.heightCm) {
    Object.assign(patch, N.computeTargets({ sex: s.sex, age: s.age, heightCm: s.heightCm, weightKg: s.currentWeightKg, activity: s.activity, goal }));
  }
  await store.saveSettings(patch);
  toast(`Goal set: ${N.goalMeta(goal).label}`);
  ctx.refresh();
}

async function autoCalc(ctx) {
  const s = store.getSettings();
  if (!s.currentWeightKg || !s.age || !s.heightCm) {
    toast('Add your age, height & weight first');
    return;
  }
  const t = N.computeTargets({ sex: s.sex, age: s.age, heightCm: s.heightCm, weightKg: s.currentWeightKg, activity: s.activity, goal: s.goal });
  await store.saveSettings(t);
  toast('Targets updated 🎯');
  ctx.refresh();
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
      el('button.btn-primary', { onclick: async () => { status.textContent = 'Testing…'; status.className = 'key-status'; const r = await testKey(input.value.trim()); status.textContent = r.message; status.className = 'key-status ' + (r.ok ? 'ok' : 'bad'); } }, ['Test key']),
      el('a.btn-ghost', { href: 'https://aistudio.google.com/app/apikey', target: '_blank', rel: 'noopener' }, ['Get a free key ↗']),
    ]),
    status,
    el('.hint', {}, ['Stored only on this device and sent directly to Google over HTTPS. Excluded from backups.']),
  ]);
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
    reader.onload = async () => { try { await store.importData(JSON.parse(reader.result)); toast('Backup restored 🎉'); ctx.refresh(); ctx.go('home'); } catch (e) { toast(e.message || 'Could not read that file'); } };
    reader.readAsText(file);
  });
  document.body.appendChild(input); input.click(); input.remove();
}

function confirmDelete(ctx) {
  openSheet(el('div', {}, [
    el('p', {}, ['Delete this profile and all its data on this device? This cannot be undone.']),
    el('button.btn-danger.full', { onclick: () => { closeSheet(); ctx.deleteCurrentProfile(); } }, ['Delete profile']),
  ]), { title: 'Delete profile' });
}

function resetAll(ctx) {
  const body = el('div', {}, [
    el('p', {}, ['This permanently deletes all meals, weights, and settings on this device. This cannot be undone.']),
    el('button.btn-danger.full', { onclick: () => {
      body.replaceChildren(el('p', {}, ['Are you absolutely sure?']),
        el('button.btn-danger.full', { onclick: async () => { await store.resetAll(); closeSheet(); toast('Everything reset'); ctx.go('home'); ctx.refresh(); } }, ['Tap again to confirm delete']));
    } }, ['Delete all data']),
  ]);
  openSheet(body, { title: 'Reset all data' });
}
