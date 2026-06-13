// components.js — shared UI primitives: DOM helper, rings, bars, sheets, toasts, confetti.

const SVGNS = 'http://www.w3.org/2000/svg';

// Tiny hyperscript helper. el('div.card#x', {onclick}, [children|strings])
export function el(spec, attrs = {}, children = []) {
  const [tagAndId, ...classes] = spec.split('.');
  const [tag, id] = tagAndId.split('#');
  const node = document.createElement(tag || 'div');
  if (id) node.id = id;
  if (classes.length) node.className = classes.join(' ');
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = (node.className + ' ' + v).trim();
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v);
  }
  for (const c of [].concat(children)) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return node;
}

export const fmt = (n) => Math.round(n || 0).toLocaleString();
export const fmt1 = (n) => (Math.round((n || 0) * 10) / 10);

// Progress ring. Returns a positioned wrapper with an SVG + centred content.
// opts: { value, max, color, size, stroke, glow, big, small, tiny }
export function ring(opts) {
  const { value = 0, max = 1, color = '#e8833a', size = 110, stroke = 9, glow = false } = opts;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max ? value / max : 0));
  const offset = c * (1 - pct);

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('width', size); svg.setAttribute('height', size);
  svg.classList.add('ring-svg');

  const track = document.createElementNS(SVGNS, 'circle');
  track.setAttribute('cx', size / 2); track.setAttribute('cy', size / 2); track.setAttribute('r', r);
  track.setAttribute('fill', 'none'); track.setAttribute('stroke', 'rgba(255,255,255,.07)');
  track.setAttribute('stroke-width', stroke);

  const arc = document.createElementNS(SVGNS, 'circle');
  arc.setAttribute('cx', size / 2); arc.setAttribute('cy', size / 2); arc.setAttribute('r', r);
  arc.setAttribute('fill', 'none'); arc.setAttribute('stroke', color); arc.setAttribute('stroke-width', stroke);
  arc.setAttribute('stroke-linecap', 'round');
  arc.setAttribute('stroke-dasharray', c.toFixed(1));
  arc.setAttribute('stroke-dashoffset', c.toFixed(1)); // start empty; animate on mount
  arc.setAttribute('transform', `rotate(-90 ${size / 2} ${size / 2})`);
  arc.classList.add('ring-arc');
  arc.dataset.target = offset.toFixed(1);
  if (glow) arc.style.filter = `drop-shadow(0 0 6px ${color}66)`;

  svg.append(track, arc);

  const center = el('.ring-center');
  if (opts.big != null) center.appendChild(el('.ring-big', {}, [String(opts.big)]));
  if (opts.small != null) center.appendChild(el('.ring-small', {}, [String(opts.small)]));
  if (opts.tiny != null) center.appendChild(el('.ring-tiny', { style: { color } }, [String(opts.tiny)]));

  return el('.ring', { style: { width: size + 'px', height: size + 'px' } }, [svg, center]);
}

// After inserting rings into the DOM, call this to trigger the fill animation.
export function animateRings(root) {
  const arcs = root.querySelectorAll('.ring-arc[data-target]');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    arcs.forEach(a => { a.style.strokeDashoffset = a.dataset.target; });
  }));
}

// Labelled macro bar.
export function bar({ label, value, max, suffix = 'g', color = '#7fae8b' }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const fill = el('.bar-fill', { style: { background: color, width: '0%' } });
  fill.dataset.target = pct.toFixed(0) + '%';
  return el('.bar-row', {}, [
    el('.bar-head', {}, [
      el('span.bar-label', {}, [label]),
      el('span.bar-val', {}, [`${fmt1(value)}/${fmt(max)}${suffix}`]),
    ]),
    el('.bar-track', {}, [fill]),
  ]);
}
export function animateBars(root) {
  const fills = root.querySelectorAll('.bar-fill[data-target]');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fills.forEach(f => { f.style.width = f.dataset.target; });
  }));
}

// ---- Bottom sheet ----
let sheetEl = null;
export function openSheet(contentNode, { title = '', onClose } = {}) {
  closeSheet();
  const panel = el('.sheet', {}, [
    el('.sheet-handle'),
    title ? el('.sheet-title', {}, [title]) : null,
    el('.sheet-body', {}, [contentNode]),
  ]);
  const backdrop = el('.sheet-backdrop', { onclick: (e) => { if (e.target === backdrop) closeSheet(); } }, [panel]);
  sheetEl = backdrop; sheetEl._onClose = onClose;
  document.getElementById('sheet-root').appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('open'));
  return { close: closeSheet };
}
export function closeSheet() {
  if (!sheetEl) return;
  const node = sheetEl, cb = sheetEl._onClose; sheetEl = null;
  node.classList.remove('open');
  setTimeout(() => { node.remove(); if (cb) cb(); }, 240);
}

// ---- Toast (with optional action, e.g. Undo) ----
export function toast(message, { action, onAction, duration = 3200 } = {}) {
  const root = document.getElementById('toast-root');
  const t = el('.toast', {}, [el('span', {}, [message])]);
  let done = false;
  const finish = () => { if (done) return; done = true; t.classList.remove('show'); setTimeout(() => t.remove(), 240); };
  if (action) {
    t.appendChild(el('button.toast-action', { onclick: () => { finish(); onAction && onAction(); } }, [action]));
  }
  root.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(finish, duration);
  return finish;
}

// ---- Confetti (protein-goal celebration only) ----
export function confettiBurst() {
  const root = document.getElementById('toast-root');
  const colors = ['#7fae8b', '#9ecfaa', '#e8833a', '#ffb27d', '#f2f4f6'];
  const wrap = el('.confetti');
  for (let i = 0; i < 70; i++) {
    const p = el('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random() * 0.3) + 's';
    p.style.animationDuration = (1.6 + Math.random() * 1.2) + 's';
    p.style.transform = `rotate(${Math.random() * 360}deg)`;
    wrap.appendChild(p);
  }
  root.appendChild(wrap);
  setTimeout(() => wrap.remove(), 3200);
}

// Stepper input (− value +) used in scan/manual sheets.
export function stepper(value, step, onChange, { suffix = 'g', min = 0 } = {}) {
  let v = value;
  const valEl = el('.step-val', {}, [`${v}${suffix}`]);
  const set = (nv) => { v = Math.max(min, Math.round(nv)); valEl.textContent = `${v}${suffix}`; onChange(v); };
  return el('.stepper', {}, [
    el('button.step-btn', { onclick: () => set(v - step) }, ['−' + step]),
    valEl,
    el('button.step-btn', { onclick: () => set(v + step) }, ['+' + step]),
  ]);
}
