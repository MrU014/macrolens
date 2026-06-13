// app.js — bootstraps the app, wires the tab router, FAB, onboarding, day rollover.
import * as store from './store.js';
import { el, openSheet, closeSheet, toast } from './ui/components.js';
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
  openManualAdd: () => openManualAdd(ctx),
  openMealEdit: (m) => openMealEdit(m, ctx),
  openWeight: () => openWeight(ctx),
  openRepeat: () => openRepeat(ctx),
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
  document.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => switchTab(t.dataset.tab)));
  document.getElementById('fab').addEventListener('click', () => startScan(ctx));
}

// Re-render Home if the calendar day changed while the app was open.
function watchDayRollover() {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    const now = store.todayKey();
    if (now !== lastDay) { lastDay = now; if (currentTab === 'home') renderCurrent(); }
  });
}

// ---- First-run onboarding (3 steps, one sheet) ----
function runOnboarding() {
  const data = { name: '', currentWeightKg: null, targetWeightKg: null, targetDate: '', geminiApiKey: '' };
  const root = el('div');

  const step1 = () => root.replaceChildren(el('div', {}, [
    el('.ob-emoji', {}, ['👋']),
    el('h2', {}, ['Welcome to MacroLens']),
    el('p.ob-sub', {}, ['Two quick steps and you’re tracking. Let’s start with the basics.']),
    field('Your name', (v) => data.name = v, data.name, 'text', 'Name'),
    field('Current weight (kg)', (v) => data.currentWeightKg = parseFloat(v) || null, data.currentWeightKg, 'number', 'kg'),
    el('button.btn-primary.full', { onclick: step2 }, ['Next →']),
  ]));

  const step2 = () => root.replaceChildren(el('div', {}, [
    el('.ob-emoji', {}, ['🎯']),
    el('h2', {}, ['Your goal']),
    el('p.ob-sub', {}, ['Lean bulk. We pre-fill sensible targets — tune them anytime in Profile.']),
    field('Target weight (kg)', (v) => data.targetWeightKg = parseFloat(v) || null, data.targetWeightKg, 'number', 'kg'),
    field('Target date', (v) => data.targetDate = v, data.targetDate, 'date'),
    el('.btn-pair', {}, [
      el('button.btn-ghost', { onclick: step1 }, ['← Back']),
      el('button.btn-primary', { onclick: step3 }, ['Next →']),
    ]),
  ]));

  const step3 = () => root.replaceChildren(el('div', {}, [
    el('.ob-emoji', {}, ['📷']),
    el('h2', {}, ['AI photo scanning']),
    el('p.ob-sub', {}, ['Optional now — paste a free Google Gemini key to scan meals from photos. You can add it later in Profile; scanning stays off until you do.']),
    field('Gemini API key (optional)', (v) => data.geminiApiKey = v.trim(), data.geminiApiKey, 'text', 'Paste key or skip'),
    el('a.ob-link', { href: 'https://aistudio.google.com/app/apikey', target: '_blank', rel: 'noopener' }, ['Get a free key ↗']),
    el('.btn-pair', {}, [
      el('button.btn-ghost', { onclick: step2 }, ['← Back']),
      el('button.btn-primary', { onclick: finish }, ['Start tracking 🚀']),
    ]),
  ]));

  async function finish() {
    const base = data.currentWeightKg || 70;
    await store.saveSettings({
      name: data.name || 'Athlete',
      currentWeightKg: data.currentWeightKg,
      targetWeightKg: data.targetWeightKg,
      targetDate: data.targetDate || null,
      startDate: store.todayKey(),
      geminiApiKey: data.geminiApiKey || '',
      goalProtein: Math.round(base * 2),
      onboarded: true,
    });
    if (data.currentWeightKg) await store.setWeight(store.todayKey(), data.currentWeightKg);
    closeSheet();
    toast(`Welcome, ${data.name || 'Athlete'}! Let’s build. 💪`);
    renderCurrent();
  }

  function field(label, onChange, value, type = 'text', placeholder = '') {
    const inp = el('input.search-input', { type, value: value ?? '', placeholder, inputmode: type === 'number' ? 'decimal' : null });
    inp.addEventListener('input', () => onChange(inp.value));
    return el('.field', {}, [el('label', {}, [label]), inp]);
  }

  step1();
  openSheet(root, { title: '' });
}

async function main() {
  await store.init();
  wireTabBar();
  watchDayRollover();
  await renderCurrent();
  if (!store.getSettings().onboarded) runOnboarding();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

main();
