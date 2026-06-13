// scan.js — full-screen camera → Gemini estimate → editable result.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { scanFood, ScanError } from '../gemini.js';
import { el, toast } from './components.js';

let stream = null;

export function startScan(ctx) {
  const key = store.getSettings().geminiApiKey;
  const overlay = el('.scan-overlay');
  document.getElementById('scan-root').appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  const close = () => { stopStream(); overlay.classList.remove('open'); setTimeout(() => overlay.remove(), 240); };

  if (!key) { showNoKey(overlay, close, ctx); return; }
  startCamera(overlay, close, ctx);
}

function stopStream() { if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; } }

function topBar(close, title) {
  return el('.scan-top', {}, [
    el('button.scan-close', { onclick: close }, ['✕']),
    el('.scan-title', {}, [title || 'Scan Meal']),
    el('span', { style: { width: '34px' } }),
  ]);
}

function showNoKey(overlay, close, ctx) {
  overlay.replaceChildren(el('.scan-msg', {}, [
    topBar(close),
    el('.msg-icon', {}, ['🔑']),
    el('h2', {}, ['Add your free Gemini key']),
    el('p', {}, ['Photo scanning uses Google’s free AI. Add a key once in Profile and you’re set — it takes 2 minutes.']),
    el('button.btn-primary.full', { onclick: () => { close(); ctx.go('profile'); } }, ['Go to Profile']),
    el('button.btn-ghost.full', { onclick: () => { close(); ctx.openManualAdd(); } }, ['Add manually instead']),
  ]));
}

async function startCamera(overlay, close, ctx) {
  const video = el('video.scan-video', { autoplay: '', playsinline: '', muted: '' });
  overlay.replaceChildren(
    topBar(close),
    el('.scan-stage', {}, [video, el('.scan-frame')]),
    el('.scan-controls', {}, [
      el('.scan-hint', {}, ['Fill the frame with your plate']),
      el('button.shutter', { onclick: () => capture(video, overlay, close, ctx) }, [el('span')]),
      el('button.scan-upload', { onclick: () => filePick(overlay, close, ctx) }, ['🖼️ Upload instead']),
    ]),
  );
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = stream;
  } catch {
    filePick(overlay, close, ctx, true); // permission denied → fallback
  }
}

function filePick(overlay, close, ctx, auto = false) {
  stopStream();
  const input = el('input', { type: 'file', accept: 'image/*', capture: 'environment', style: { display: 'none' } });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => analyze(reader.result, overlay, close, ctx);
    reader.readAsDataURL(file);
  });
  document.body.appendChild(input);
  if (auto) {
    overlay.replaceChildren(el('.scan-msg', {}, [
      topBar(close),
      el('.msg-icon', {}, ['📷']),
      el('h2', {}, ['Camera unavailable']),
      el('p', {}, ['No camera access — pick a photo from your gallery instead.']),
      el('button.btn-primary.full', { onclick: () => input.click() }, ['Choose photo']),
    ]));
  } else {
    input.click();
  }
}

function capture(video, overlay, close, ctx) {
  if (!video.videoWidth) { toast('Camera still warming up…'); return; }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  stopStream();
  analyze(canvas.toDataURL('image/jpeg', 0.9), overlay, close, ctx);
}

// Downscale a dataURL to maxDim, return { dataUrl, base64 }.
function downscale(dataUrl, maxDim, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const scale = Math.min(1, maxDim / Math.max(width, height));
      width = Math.round(width * scale); height = Math.round(height * scale);
      const c = document.createElement('canvas');
      c.width = width; c.height = height;
      c.getContext('2d').drawImage(img, 0, 0, width, height);
      const out = c.toDataURL('image/jpeg', quality);
      resolve({ dataUrl: out, base64: out.split(',')[1] });
    };
    img.src = dataUrl;
  });
}

async function analyze(rawDataUrl, overlay, close, ctx) {
  const big = await downscale(rawDataUrl, 1024, 0.8);
  const thumb = await downscale(rawDataUrl, 256, 0.7);

  overlay.replaceChildren(
    topBar(close, 'Analyzing…'),
    el('.scan-analyzing', {}, [
      el('img.scan-shot', { src: big.dataUrl }),
      el('.shimmer'),
      el('.analyzing-text', {}, ['⌖ Estimating macros…']),
    ]),
  );

  try {
    const est = await scanFood(big.base64, store.getSettings().geminiApiKey);
    showResult(est, thumb.dataUrl, big.dataUrl, overlay, close, ctx);
  } catch (e) {
    const msg = e instanceof ScanError ? e.message : 'Something went wrong';
    overlay.replaceChildren(el('.scan-msg', {}, [
      topBar(close),
      el('.msg-icon', {}, ['😕']),
      el('h2', {}, ['Couldn’t estimate that one']),
      el('p', {}, [msg]),
      el('button.btn-primary.full', { onclick: () => { close(); ctx.openManualAdd(); } }, ['Add manually instead']),
      el('button.btn-ghost.full', { onclick: () => startCamera(overlay, close, ctx) }, ['Try another photo']),
    ]));
  }
}

function confBadge(c) {
  const label = c >= 0.8 ? 'High' : c >= 0.5 ? 'Medium' : 'Low';
  const cls = c >= 0.8 ? 'high' : c >= 0.5 ? 'med' : 'low';
  return el(`.conf.${cls}`, {}, [`${label} confidence · ${Math.round(c * 100)}%`]);
}

function showResult(est, thumbUrl, shotUrl, overlay, close, ctx) {
  const original = { ...est };                 // photo estimate (immutable)
  const cur = { ...est };                      // adjusted, editable
  let edited = false;

  const previewWrap = el('.result-preview');
  const compareWrap = el('.compare-wrap');

  const drawPreview = () => previewWrap.replaceChildren(
    macroLine('Calories', Math.round(cur.kcal), 'kcal', '#e8833a'),
    macroLine('Protein', cur.protein, 'g', '#9ecfaa'),
    macroLine('Carbs', cur.carbs, 'g', '#c9cdd4'),
    macroLine('Fat', cur.fat, 'g', '#c9cdd4'),
    macroLine('Fibre', cur.fibre, 'g', '#8fbfae'),
  );
  const drawCompare = () => {
    compareWrap.replaceChildren();
    if (!edited) return;
    compareWrap.appendChild(el('.compare', {}, [
      el('.cmp-col', {}, [el('.cmp-h', {}, ['Photo estimate']), el('.cmp-v', {}, [`${Math.round(original.kcal)} kcal`]), el('.cmp-s', {}, [`${original.grams}g · ${original.protein}g P`])]),
      el('.cmp-arrow', {}, ['→']),
      el('.cmp-col.adj', {}, [el('.cmp-h', {}, ['Adjusted']), el('.cmp-v', {}, [`${Math.round(cur.kcal)} kcal`]), el('.cmp-s', {}, [`${cur.grams}g · ${cur.protein}g P`])]),
    ]));
  };

  const nameInput = el('input.result-name', { type: 'text', value: cur.name });
  nameInput.addEventListener('input', () => { cur.name = nameInput.value; });

  const gramsLabel = el('.grams-big', {}, [`${cur.grams} g`]);
  const adjustGrams = (delta) => {
    const ng = Math.max(5, cur.grams + delta);
    const scaled = N.scaleMacros(original, original.grams, ng); // always scale from the photo estimate
    Object.assign(cur, scaled);
    gramsLabel.textContent = `${cur.grams} g`;
    edited = true; drawPreview(); drawCompare();
  };

  // direct macro edit
  const editFields = el('.macro-grid');
  const buildFields = () => editFields.replaceChildren(...[
    ['kcal', 'Calories'], ['protein', 'Protein'], ['carbs', 'Carbs'], ['fat', 'Fat'], ['fibre', 'Fibre'],
  ].map(([k, label]) => {
    const inp = el('input.num-input', { type: 'number', inputmode: 'decimal', step: 'any', value: cur[k] });
    inp.addEventListener('input', () => { cur[k] = parseFloat(inp.value) || 0; edited = true; drawPreview(); drawCompare(); });
    return el('.field', {}, [el('label', {}, [label]), el('.num-wrap', {}, [inp])]);
  }));

  let advancedOpen = false;
  const advanced = el('.advanced');
  const toggleAdvanced = el('button.btn-ghost.full', { onclick: () => {
    advancedOpen = !advancedOpen;
    advanced.replaceChildren(advancedOpen ? editFields : null);
    toggleAdvanced.textContent = advancedOpen ? 'Hide manual edit' : '✎ Edit macros manually';
  } }, ['✎ Edit macros manually']);
  buildFields();

  overlay.replaceChildren(el('.scan-result', {}, [
    topBar(close, 'Confirm meal'),
    el('.result-scroll', {}, [
      el('img.result-shot', { src: shotUrl }),
      nameInput,
      confBadge(cur.confidence),
      cur.assumptions ? el('.assumptions', {}, [`“${cur.assumptions}”`]) : null,
      el('.section-label', {}, ['PORTION']),
      gramsLabel,
      el('.stepper', {}, [
        el('button.step-btn', { onclick: () => adjustGrams(-50) }, ['−50g']),
        el('button.step-btn', { onclick: () => adjustGrams(-10) }, ['−10g']),
        el('button.step-btn', { onclick: () => adjustGrams(10) }, ['+10g']),
        el('button.step-btn', { onclick: () => adjustGrams(50) }, ['+50g']),
      ]),
      previewWrap,
      compareWrap,
      toggleAdvanced,
      advanced,
      el('.approx', {}, ['≈ Estimates are approximate — roughly right beats perfectly tracked.']),
    ]),
    el('.result-save', {}, [
      el('button.btn-primary.full', { onclick: async () => {
        const meal = {
          dateKey: store.todayKey(), time: store.timeNow(), mealType: N.mealTypeForTime(store.timeNow()),
          name: cur.name || 'Scanned meal', source: 'scan', grams: cur.grams,
          kcal: Math.round(cur.kcal), protein: cur.protein, carbs: cur.carbs, fat: cur.fat, fibre: cur.fibre,
          confidence: cur.confidence, photoThumb: thumbUrl,
        };
        await store.addMeal(meal);
        close(); toast(`Logged · ${meal.kcal} kcal · ${meal.protein}g protein`); ctx.refresh();
      } }, ['Save Meal']),
    ]),
  ]));
  drawPreview();
}

function macroLine(label, value, suffix, color) {
  return el('.mline', {}, [
    el('.mline-l', {}, [label]),
    el('.mline-v', { style: { color } }, [`${value}${suffix === 'kcal' ? ' kcal' : suffix}`]),
  ]);
}
