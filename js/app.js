// app.js — bootstraps the app: profiles/login, tab router, FAB, onboarding, rollover.
import * as store from './store.js';
import * as N from './nutrition.js';
import * as profiles from './profiles.js';
import { el, openSheet, closeSheet, toast } from './ui/components.js';
import { pickProfile, hideLogin } from './ui/login.js';
import { openManualAdd, openMealEdit, openWeight, openRepeat } from './ui/sheets.js';
import { startScan } from './ui/scan.js';
import * as home from './ui/home.js';
import * as history from './ui/history.js';
import * as analytics from './ui/analytics.js';
import * as profile from './ui/profile.js';

const screens = { home, history, analytics, profile };
let currentTab = 'home';
let lastDay = store.todayKey();
const appRoot = () => document.getElementById('app');

const ctx = {
  refresh: () => renderCurrent(),
  go: (tab) => switchTab(tab),
  startScan: () => startScan(ctx),
  openManualAdd: (presetType) => openManualAdd(ctx, presetType),
  openMealEdit: (m) => openMealEdit(m, ctx),
  openWeight: () => openWeight(ctx),
  openRepeat: () => openRepeat(ctx),
  switchUser: () => switchUser(),
  deleteCurrentProfile: () => deleteCurrentProfile(),
};

async function renderCurrent() {
  const root = appRoot();
  root.classList.add('fading');
  await screens[currentTab].render(root, ctx);
  requestAnimationFrame(() => root.classList.remove('fading'));
  root.scrollTop = 0;
}

function switchTab(tab) {
  if (tab === currentTab) { renderCurrent(); return; }
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  renderCurrent();
}

function wireTabBar() {
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
  document.getElementById('fab').addEventListener('click', () => startScan(ctx));
}

function watchDayRollover() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const now = store.todayKey();
    if (now !== lastDay) { lastDay = now; if (currentTab === 'home') renderCurrent(); }
  });
}

// Load the active profile's data and render. Runs onboarding if needed.
async function bootProfile() {
  const active = profiles.getActive();
  await store.init(profiles.dbNameFor(active));
  const st = store.getSettings();
  if (active && st.name && active.name !== st.name) profiles.updateProfile(active.id, { name: st.name });
  lastDay = store.todayKey();
  currentTab = 'home';
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'home'));
  document.querySelector('.tabbar').style.display = 'flex';
  document.getElementById('fab').style.display = 'flex';
  await renderCurrent();
  if (!st.onboarded) runOnboarding();
}

async function enter() {
  document.querySelector('.tabbar').style.display = 'none';
  document.getElementById('fab').style.display = 'none';
  const { profile: chosen } = await pickProfile();
  profiles.setActiveId(chosen.id);
  hideLogin();
  await bootProfile();
}

async function switchUser() {
  store.close();
  await enter();
}

async function deleteCurrentProfile() {
  const active = profiles.getActive();
  profiles.deleteProfile(active.id);
  if (profiles.listProfiles().length === 0) profiles.ensureDefault();
  store.close();
  toast('Profile deleted');
  await enter();
}

// ---- First-run onboarding (4 steps, one sheet) ----
function runOnboarding() {
  const active = profiles.getActive();
  const data = { name: active?.name && active.name !== 'Me' ? active.name : '', sex: 'male', age: null, heightCm: null, currentWeightKg: null, activity: 1.55, goal: 'maintain', geminiApiKey: '' };
  const root = el('div');

  const field = (label, onChange, value, type = 'text', placeholder = '') => {
    const inp = el('input.search-input', { type, value: value ?? '', placeholder, inputmode: type === 'number' ? 'decimal' : null });
    inp.addEventListener('input', () => onChange(inp.value));
    return el('.field', {}, [el('label', {}, [label]), inp]);
  };
  const select = (label, onChange, value, options) => {
    const sel = el('select.type-sel', {}, options.map(([v, l]) => { const o = el('option', { value: v }, [l]); if (String(value) === String(v)) o.selected = true; return o; }));
    sel.addEventListener('change', () => onChange(sel.value));
    return el('.field', {}, [el('label', {}, [label]), sel]);
  };

  const step1 = () => root.replaceChildren(el('div', {}, [
    el('h2', {}, ['Welcome to MacroLens']),
    el('p.ob-sub', {}, ['A quick setup and you’re tracking. First, a bit about you.']),
    field('Your name', v => data.name = v, data.name, 'text', 'Name'),
    select('Sex', v => data.sex = v, data.sex, [['male', 'Male'], ['female', 'Female']]),
    field('Age', v => data.age = parseFloat(v) || null, data.age, 'number', 'years'),
    el('button.btn-primary.full', { onclick: step2 }, ['Continue']),
  ]));

  const step2 = () => root.replaceChildren(el('div', {}, [
    el('h2', {}, ['Your body']),
    el('p.ob-sub', {}, ['So we can calculate the right calories & macros for you.']),
    field('Height (cm)', v => data.heightCm = parseFloat(v) || null, data.heightCm, 'number', 'cm'),
    field('Current weight (kg)', v => data.currentWeightKg = parseFloat(v) || null, data.currentWeightKg, 'number', 'kg'),
    select('How active are you?', v => data.activity = parseFloat(v), data.activity,
      [['1.2', 'Mostly sitting'], ['1.375', 'Light (1-3 workouts/wk)'], ['1.55', 'Moderate (3-5/wk)'], ['1.725', 'Very active (6-7/wk)']]),
    el('.btn-pair', {}, [el('button.btn-ghost', { onclick: step1 }, ['Back']), el('button.btn-primary', { onclick: step3 }, ['Continue'])]),
  ]));

  const step3 = () => {
    const opts = el('.goal-select', {}, ['lose', 'maintain', 'gain'].map(gk => {
      const g = N.goalMeta(gk);
      return el('button.goal-opt', { class: data.goal === gk ? 'active' : '', onclick: () => { data.goal = gk; step3(); } }, [
        el('.goal-name', {}, [g.label]),
      ]);
    }));
    root.replaceChildren(el('div', {}, [
      el('h2', {}, ['What’s your goal?']),
      el('p.ob-sub', {}, ['Pick one — you can change it anytime.']),
      opts,
      el('.btn-pair', {}, [el('button.btn-ghost', { onclick: step2 }, ['Back']), el('button.btn-primary', { onclick: step4 }, ['Continue'])]),
    ]));
  };

  const step4 = () => root.replaceChildren(el('div', {}, [
    el('h2', {}, ['AI photo scanning']),
    el('p.ob-sub', {}, ['Optional — paste a free Google Gemini key to log meals from photos. You can add it later in Profile.']),
    field('Gemini API key (optional)', v => data.geminiApiKey = v.trim(), data.geminiApiKey, 'text', 'Paste key or skip'),
    el('a.ob-link', { href: 'https://aistudio.google.com/app/apikey', target: '_blank', rel: 'noopener' }, ['Get a free key']),
    el('.btn-pair', {}, [el('button.btn-ghost', { onclick: step3 }, ['Back']), el('button.btn-primary', { onclick: finish }, ['Start tracking'])]),
  ]));

  async function finish() {
    const targets = N.computeTargets({ sex: data.sex, age: data.age, heightCm: data.heightCm, weightKg: data.currentWeightKg, activity: data.activity, goal: data.goal });
    await store.saveSettings({
      name: data.name || 'Me', sex: data.sex, age: data.age, heightCm: data.heightCm,
      currentWeightKg: data.currentWeightKg, activity: data.activity, goal: data.goal,
      startDate: store.todayKey(), geminiApiKey: data.geminiApiKey || '', onboarded: true, ...targets,
    });
    if (data.currentWeightKg) await store.setWeight(store.todayKey(), data.currentWeightKg);
    profiles.updateProfile(profiles.getActiveId(), { name: data.name || 'Me' });
    closeSheet();
    toast(`You’re set, ${data.name || 'there'}.`);
    renderCurrent();
  }

  step1();
  openSheet(root, { title: '' });
}

async function main() {
  profiles.ensureDefault();
  wireTabBar();
  watchDayRollover();
  if (profiles.shouldShowPicker()) await enter();
  else await bootProfile();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
}

main();
