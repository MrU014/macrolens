// login.js — "who's using this?" profile picker, PIN unlock, and create flow.
import * as profiles from '../profiles.js';
import { el } from './components.js';

let root = null;
function ensureRoot() { if (!root) { root = el('.login-screen'); document.body.appendChild(root); } return root; }
export function hideLogin() { if (root) { root.remove(); root = null; } }

// Resolves with { profile, isNew }.
export function pickProfile() {
  return new Promise((resolve) => renderPicker(resolve));
}

function choose(profile, resolve, isNew) { resolve({ profile, isNew }); }

function renderPicker(resolve) {
  const r = ensureRoot();
  const list = profiles.listProfiles();
  r.replaceChildren(
    el('.login-brand', { html: 'Macro<span>Lens</span>' }),
    el('.login-title', {}, ['Who’s using MacroLens?']),
    el('.profiles-grid', {}, [
      ...list.map(p => el('.profile-card', { onclick: () => (p.pin ? renderPin(p, resolve) : choose(p, resolve, false)) }, [
        el('.avatar', { style: { background: p.color } }, [profiles.initial(p.name)]),
        el('.profile-name', {}, [p.name]),
        p.pin ? el('.profile-lock', {}, ['Locked']) : null,
      ])),
      el('.profile-card.add-profile', { onclick: () => renderCreate(resolve) }, [
        el('.avatar', {}, ['+']),
        el('.profile-name', {}, ['Add']),
      ]),
    ]),
    el('.login-foot', {}, ['Your data stays on this device']),
  );
}

function renderPin(profile, resolve) {
  const r = ensureRoot();
  let entry = '';
  const dots = el('.pin-dots');
  const err = el('.pin-err');
  const drawDots = () => dots.replaceChildren(...[0, 1, 2, 3].map(i => el(`.pin-dot${i < entry.length ? '.filled' : ''}`)));
  const press = (d) => {
    if (entry.length >= 4) return;
    entry += d; drawDots();
    if (entry.length === 4) setTimeout(check, 120);
  };
  const back = () => { entry = entry.slice(0, -1); drawDots(); };
  const check = () => {
    if (entry === profile.pin) choose(profile, resolve, false);
    else { err.textContent = 'Wrong PIN, try again'; entry = ''; drawDots(); }
  };
  const key = (label, fn, cls = '') => el(`button.pin-key${cls}`, { onclick: fn }, [label]);

  r.replaceChildren(el('.pin-wrap', {}, [
    el('.pin-avatar-row', {}, [
      el('.avatar', { style: { background: profile.color } }, [profiles.initial(profile.name)]),
      el('.profile-name', {}, [profile.name]),
    ]),
    el('div', {}, ['Enter PIN']),
    dots, err,
    el('.pin-keys', {}, [
      ...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => key(d, () => press(d))),
      key('‹', () => renderPicker(resolve), 'blank'),
      key('0', () => press('0')),
      key('⌫', back, 'blank'),
    ]),
  ]));
  drawDots();
}

function renderCreate(resolve) {
  const r = ensureRoot();
  let color = profiles.AVATAR_COLORS[profiles.listProfiles().length % profiles.AVATAR_COLORS.length];
  let usePin = false;

  const nameInput = el('input.search-input', { type: 'text', placeholder: 'Name', maxlength: '20' });
  const swatches = el('.swatches', {}, profiles.AVATAR_COLORS.map(c =>
    el(`.swatch${c === color ? '.active' : ''}`, { style: { background: c }, onclick: () => { color = c; [...swatches.children].forEach(s => s.classList.toggle('active', s.style.background === c)); } })));
  const pinInput = el('input.search-input', { type: 'number', inputmode: 'numeric', placeholder: '4-digit PIN', maxlength: '4', style: { display: 'none' } });
  const pinToggle = el('label.pin-toggle', {}, [
    (() => { const cb = el('input', { type: 'checkbox' }); cb.addEventListener('change', () => { usePin = cb.checked; pinInput.style.display = usePin ? 'block' : 'none'; }); return cb; })(),
    el('span', {}, [' Lock this profile with a PIN']),
  ]);

  r.replaceChildren(el('.login-screen-inner', { style: { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '16px' } }, [
    el('.login-brand', { html: 'New profile' }),
    el('.field', {}, [el('label', {}, ['Name']), nameInput]),
    el('.field', {}, [el('label', {}, ['Colour']), swatches]),
    el('.field', {}, [pinToggle, pinInput]),
    el('button.btn-primary.full', { onclick: () => {
      const name = nameInput.value.trim() || 'Me';
      const pin = usePin && /^\d{4}$/.test(pinInput.value) ? pinInput.value : null;
      const p = profiles.createProfile({ name, color, pin });
      choose(p, resolve, true);
    } }, ['Create profile']),
    el('button.btn-ghost.full', { onclick: () => renderPicker(resolve) }, ['Back']),
  ]));
  setTimeout(() => nameInput.focus(), 200);
}
