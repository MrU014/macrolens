// gemini.js — food-photo → macro estimate via Google Gemini (free tier).
// The model id is a single constant; bump it when Google ships newer flash models.

export const MODEL = 'gemini-2.5-flash';
const ENDPOINT = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

const PROMPT = `You are an expert nutritionist specialising in Indian and college-hostel food.
Look at this photo of a meal and estimate its nutrition. Treat the whole visible plate as ONE entry.
Be realistic, not optimistic — portion sizes in hostels are generous.
Return ONLY a JSON object with EXACTLY these keys and numeric values (no text, no units):
{
  "name": "<short dish name>",
  "portion_grams": <number>,
  "kcal": <number>,
  "protein_g": <number>,
  "carbs_g": <number>,
  "fat_g": <number>,
  "fibre_g": <number>,
  "confidence": <0..1>,
  "assumptions": "<one short sentence>"
}`;

// Custom error with a user-friendly code the UI can switch on.
export class ScanError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function parseEstimate(text) {
  let data;
  try { data = JSON.parse(text); }
  catch { throw new ScanError('parse', 'Could not read the estimate'); }
  const num = (v) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : null);
  const out = {
    name: (data.name || 'Scanned meal').toString().slice(0, 60),
    grams: num(data.portion_grams),
    kcal: num(data.kcal),
    protein: num(data.protein_g),
    carbs: num(data.carbs_g),
    fat: num(data.fat_g),
    fibre: num(data.fibre_g) ?? 0,
    confidence: Math.max(0, Math.min(1, num(data.confidence) ?? 0.5)),
    assumptions: (data.assumptions || '').toString().slice(0, 140),
  };
  if (out.grams == null || out.kcal == null || out.protein == null || out.carbs == null || out.fat == null) {
    throw new ScanError('parse', 'Estimate was incomplete');
  }
  return out;
}

async function callGemini(base64Jpeg, apiKey, strict = false) {
  const body = {
    contents: [{
      parts: [
        { text: strict ? PROMPT + '\n\nIMPORTANT: return STRICTLY valid JSON only.' : PROMPT },
        { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } },
      ],
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
  };
  let res;
  try {
    res = await fetch(ENDPOINT(MODEL, apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
  } catch {
    throw new ScanError('network', 'You’re offline — log it manually and scan next time');
  }
  if (res.status === 429) throw new ScanError('rate', 'Free tier is catching its breath — try again in a minute');
  if (res.status === 400 || res.status === 403) throw new ScanError('key', 'API key looks invalid — check it in Profile');
  if (!res.ok) throw new ScanError('http', `Scan failed (${res.status})`);
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new ScanError('parse', 'No estimate returned');
  return text;
}

// Main entry: returns a normalized estimate object. Retries once on parse failure.
export async function scanFood(base64Jpeg, apiKey) {
  if (!apiKey) throw new ScanError('nokey', 'Add your Gemini API key in Profile to scan');
  let text;
  try { text = await callGemini(base64Jpeg, apiKey, false); }
  catch (e) { if (e.code === 'parse') text = await callGemini(base64Jpeg, apiKey, true); else throw e; }
  try { return parseEstimate(text); }
  catch { return parseEstimate(await callGemini(base64Jpeg, apiKey, true)); }
}

// Lightweight key check used by the "Test key" button in Profile.
export async function testKey(apiKey) {
  if (!apiKey) return { ok: false, message: 'Enter a key first' };
  try {
    const res = await fetch(ENDPOINT(MODEL, apiKey), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'ping — reply with the word ok' }] }] }),
    });
    if (res.ok) return { ok: true, message: 'Key works! Scanning is ready 🎉' };
    if (res.status === 429) return { ok: true, message: 'Key works (rate-limited right now, but valid)' };
    if (res.status === 400 || res.status === 403) return { ok: false, message: 'That key was rejected — double-check it' };
    return { ok: false, message: `Unexpected response (${res.status})` };
  } catch {
    return { ok: false, message: 'Network error — are you online?' };
  }
}
