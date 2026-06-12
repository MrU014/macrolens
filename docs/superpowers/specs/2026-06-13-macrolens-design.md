# MacroLens — Design Spec

**Date:** 2026-06-13 · **Status:** Approved · **Owner:** Anas

A personal nutrition and muscle-gain companion. Track calories, protein, carbs, fat, and fibre with minimal effort using AI food-photo scanning and fast manual edits.

**Philosophy:** *"Roughly right beats perfectly tracked."* Tracking a meal should take under 15 seconds. No calorie guilt, no dieting language, no medical aesthetic — shortfalls are shown as friendly "to go" coaching.

**Audience:** One user (Anas) — muscle gain, calorie surplus, high protein, consistency over precision. Android phone, hostel + home meals (Indian food heavy).

---

## 1. Decisions (locked during brainstorming)

| Decision | Choice | Why |
|---|---|---|
| Platform | Vanilla JS PWA, no build step | Readable code, no toolchain, free hosting, installs on Android home screen |
| AI scanning | Real AI — Google Gemini Flash, free tier | Genuinely useful from day one; ~5–10 scans/day fits free tier at ₹0 |
| Data | On-device (IndexedDB) + one-tap JSON export/import | Private, offline, zero setup; export protects months of data |
| Scope | Full vision in one build, built in layers | All frontend-local; each tab works as it lands |
| Visual direction | **"Energy Glass"** | Direction C's data-forward energy in Direction B's glass finish |
| Hosting | GitHub Pages (HTTPS) | Camera + PWA install require HTTPS; free |

---

## 2. Visual design system — "Energy Glass"

### Tokens

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0c0e11` (gradient to `#15181d`) | App background |
| `--surface` | `rgba(255,255,255,.05)` + `backdrop-filter: blur(12px)` + 1px `rgba(255,255,255,.09)` border | Glass cards |
| `--orange` | `#e8833a` (light `#ffb27d`) | Calories, energy, Scan FAB, Bulk Score |
| `--green` | `#7fae8b` (light `#9ecfaa`) | Protein, positive trends, primary actions |
| `--text` | `#f2f4f6` | Primary type |
| `--text-dim` | `#8a8f98` | Labels, secondary |
| Radius | 20px cards · 14px strips · 16px buttons | Rounded, soft |
| Type | Inter / system-ui; bold condensed numerals (-0.5px letter-spacing) | Data-forward |

### Rules

- Glass cards on charcoal; ambient radial glows (green top-left, orange mid-right) at very low opacity.
- **Hero calorie ring** (orange, soft glow) + **3 satellite rings** (protein green, fat neutral, fibre muted teal-green) in one card.
- **Bulk Score** always visible top-right of Home as a glass chip.
- Raised circular **orange Scan FAB** in the center of the bottom tab bar.
- Glows only on active progress elements. No red anywhere; shortfalls are orange "to go" coaching.
- Rings animate to value on load (~700ms ease-out); macro bars animate; tab transitions slide/fade ~250ms.
- Confetti **only** when the protein goal is hit (once per day).

---

## 3. Information architecture

Five tabs in a bottom glass tab bar: **Home · History · [Scan FAB] · Analytics · Profile**.
Modal layer (slide-up sheets) for: scan result review, manual add, meal edit, weight entry, quick-add.

Single-page app. `app.js` swaps screens by toggling per-tab containers; each screen is an ES module with `render()` + event wiring. State lives in `store.js`; screens re-render from state.

### File layout

```
MacroLens/
├── index.html              app shell, tab bar, modal root
├── manifest.webmanifest    PWA install metadata
├── sw.js                   service worker: cache-first shell, network-only API
├── icons/                  icon.svg + 192/512 PNG
├── css/
│   ├── base.css            tokens, reset, typography, glass utilities
│   ├── components.css      rings, bars, cards, buttons, sheets, toasts, confetti
│   └── screens.css         per-screen layout
└── js/
    ├── app.js              init, tab router, day-rollover check
    ├── store.js            IndexedDB wrapper, state cache, export/import
    ├── gemini.js           scan API client (prompt, JSON parse, retry)
    ├── nutrition.js        pure functions: bulk score, surplus, heatmap, notes, suggestions
    ├── foods.js            built-in food DB (hostel/Indian staples) + food memory
    └── ui/
        ├── components.js   ring/bar renderers, sheet/toast/confetti helpers
        ├── home.js  scan.js  history.js  analytics.js  profile.js
```

Each unit answers: what it does, how you use it, what it depends on. `nutrition.js` is pure math (no DOM, no storage) so it's independently testable.

---

## 4. Data model (IndexedDB, db name `macrolens`, v1)

```js
// store: meals (keyPath id)
{ id: "m_<timestamp>_<rand>", dateKey: "2026-06-13", time: "13:15",
  mealType: "breakfast|lunch|dinner|snack",          // inferred from time, editable
  name: "Hostel Chicken Rice",
  source: "scan|manual|repeat|quick",
  grams: 420,                                         // null allowed for manual
  kcal: 640, protein: 38, carbs: 72, fat: 18, fibre: 4,
  confidence: 0.78,                                   // scans only
  photoThumb: Blob|null }                             // ≤256px JPEG q0.7, scans only

// store: weights (keyPath dateKey)   { dateKey, kg }
// store: foodMemory (keyPath name)   { name, grams, kcal, protein, carbs, fat, fibre, count, lastUsed }
// store: settings (key-value)
{ name, currentWeightKg, targetWeightKg, targetDate, maintenanceKcal,
  gymDaysPerWeek, goalKcal, goalProtein, goalFat, goalFibre,
  geminiApiKey,                                       // device-only, never exported by default
  onboarded, confettiShownFor: "2026-06-13" }
```

- **Day boundary:** local-time date string (`dateKey`). On app focus, if date changed → re-render Home for the new day.
- **Meal type inference:** <11:00 breakfast · 11:00–15:59 lunch · 16:00–18:59 snack · ≥19:00 dinner. Editable on every entry.
- **Export:** single JSON `{version, exportedAt, meals, weights, foodMemory, settings-without-apiKey}` (photo thumbs excluded to keep files small) → share-sheet download `macrolens-backup-YYYY-MM-DD.json`. **Import:** merge by id/dateKey, newer `lastUsed`/timestamp wins; never deletes.
- **Food memory:** after saving, if a meal's name (case-insensitive) matches an existing memory → increment count, update macros to latest, bump `lastUsed`; else create. Memories with count ≥ 2 surface in Manual Add "Your usuals."

---

## 5. Screens

### 5.1 Home

Top → bottom: greeting ("Good Morning/Afternoon/Evening" + name) · goal pill ("LEAN BULK · WEEK n" from targetDate math) · **Bulk Score chip** · hero rings card (calorie ring with "left" count + protein/fat/fibre satellites) · weight & surplus strip (latest weight + 7-day trend arrow; estimated daily surplus) · **coaching strip** (evening: remaining kcal/protein + quick-fix suggestion) · quick actions (**Scan Meal** primary green, **Manual**, **Repeat** = re-log yesterday's same meal-type) · quick-add chips (+200ml Milk · +2 Eggs · +1 Banana · +1 Scoop — editable templates from foods.js) · today's meal timeline grouped by meal type with kcal + protein per entry, scanned entries badged 📷, dashed "not logged yet" row for the next expected meal · subtle "log weight" chip if no weight today.

### 5.2 Scan (core feature)

1. Full-screen camera (`getUserMedia`, rear camera). Fallback: `<input type="file" accept="image/*" capture="environment">` if permission denied. Capture button + flash of the frozen frame.
2. Frame → canvas → JPEG ≤1024px → `gemini.js`.
3. **Analyzing state:** shimmer over the photo, "Estimating…" (target <4s).
4. **Result sheet** over the photo: food name (editable) · confidence badge (High ≥0.8 / Medium ≥0.5 / Low) · grams with **−50g / +50g** steppers (macros re-scale linearly: `macro × newGrams/oldGrams`) · per-macro fields (tap to edit any number directly) · **Photo Estimate vs Adjusted** comparison row whenever the user changes anything · *"Estimates are approximate"* caption, always visible.
5. **Save Meal** → store, toast "Logged · 640 kcal · 38g protein", return Home. Rings animate to new values.

### 5.3 Manual Add (sheet)

Search box (fuzzy match over built-in food DB + food memory) · "Your usuals" row (food memory, count ≥2) · recents · quick templates (Chicken, Rice, Milk, Eggs, Banana, Protein Shake, Oats, Paneer, Dal, Roti) · each template asks portion (grams/pieces/ml with sensible defaults) · fully custom entry (name + macros). Saving any manual meal feeds food memory.

### 5.4 History

Reverse-chronological day cards: date · total kcal/protein vs goals (mini bars) · Bulk Score badge · tap to expand the day's meals. Per meal: edit (re-opens sheet), duplicate to today, delete (undo toast, 5s). Search by meal name across all history.

### 5.5 Analytics

Range switch: 7 / 30 / 90 days. All charts hand-rolled SVG.
- Weekly average cards: kcal, protein, surplus, weight change
- **Protein consistency:** % of days ≥90% of protein goal
- **Protein heatmap:** hour-of-day × day grid, colored by protein logged that hour
- Macro split donut (avg P/C/F by calories)
- **Weight vs intake:** dual line — 7-day-avg weight + 7-day-avg kcal
- Calendar heatmap colored by Bulk Score
- Top meals: most-logged from food memory

### 5.6 Profile

Personal: name · current weight (opens weight log) · target weight + target date · gym days/week.
Goals: maintenance kcal (manual, with optional Mifflin-St Jeor calculator helper: `10×kg + 6.25×cm − 5×age + 5`, × activity factor) · goal kcal/protein/fat/fibre (suggest: maintenance+300 · 2.0 g/kg · 25% kcal · 35g — editable).
AI: Gemini API key (masked input · "Test key" button hits the API with "ping" · link to aistudio.google.com walkthrough).
Data: Export backup · Import · Reset all (double-confirm).

### First-run onboarding (one sheet, 3 steps)

Name + current weight → targets (pre-filled suggestions) → optional API key ("you can add it later in Profile — Scan stays disabled until then, with a friendly pointer").

---

## 6. Gemini integration (`gemini.js`)

- **Endpoint:** `POST https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=<KEY>` with `generationConfig.responseMimeType: "application/json"`.
- **Request:** downscaled JPEG as `inline_data` (base64) + prompt: *expert nutritionist for Indian/hostel food; estimate the full plate as one entry; return ONLY JSON* `{name, portion_grams, kcal, protein_g, carbs_g, fat_g, fibre_g, confidence, assumptions}`.
- **Validation:** parse JSON; all macro fields finite numbers ≥0; confidence clamped 0–1. On parse/validation failure → **one** automatic retry with "return strictly valid JSON" appended → then friendly error + "Add manually instead?" shortcut.
- **Errors:** no key → sheet pointing to Profile; HTTP 429 → "Free tier is catching its breath — try again in a minute"; offline/network → "You're offline — log it manually and scan next time."
- **Key handling:** stored in IndexedDB settings on this device only; sent only to Google's API over HTTPS; excluded from exports by default; never committed to code. Acceptable model for a single-user personal app.

---

## 7. Smart-feature math (`nutrition.js`, all pure functions)

| Feature | Formula |
|---|---|
| **Bulk Score (0–100)** | `40×clamp01(kcal/goalKcal)` (if intake >115% of goal, taper −5 per extra 10%, floor 25) + `40×clamp01(protein/goalProtein)` + consistency: ≥3 meals logged = 20 · 2 = 12 · 1 = 6 · 0 = 0 |
| **Surplus (today)** | `kcalToday − maintenanceKcal` |
| **Surplus predictor** | `(7-day avg kcal − maintenance) × 7 ÷ 7700` → predicted kg/week; shown with weight-trend reality check |
| **Weight trend** | 7-day rolling average of logged weights; weekly delta = avg(this 7d) − avg(prior 7d) |
| **Protein heatmap** | meals bucketed by hour; cell = protein grams logged that hour |
| **Recovery indicator** | days with ≥3 separate feedings of ≥20g protein → "Recovery support: good"; else show which feeding is missing |
| **Muscle Support % (today)** | `min(100, 55×clamp01(protein/goal) + 45×clamp01(kcal/goal))` — real-time intraday companion to Bulk Score |
| **Protein streak** | consecutive days protein ≥ goal; flame chip on Home when ≥2 |
| **Days in surplus** | count in current 7-day window with kcal ≥ maintenance |
| **Missed-calories recovery** | gap = goals − logged. Greedy fill from quick foods: protein gap >25g → prioritize protein density (shake, eggs, milk, paneer); else calorie density (banana, oats, rice, smoothie). Suggest 2–3 items with combined macros |
| **AI Notes (rule-based)** | evaluated on Home render: protein <60% of goal after 20:00 → "Protein's behind today — shake before bed?" · kcal <80% goal two days running → "Fuel's been low 2 days — bulk needs calories" · fibre 7-day avg ↑ week-over-week → "Fibre improving 👌" · protein streak ≥3 → "3-day protein streak" · max 2 notes shown, friendly tone, never guilt |

---

## 8. PWA & deployment

- `manifest.webmanifest`: name MacroLens, `display: standalone`, `theme_color #0c0e11`, 192/512 icons (generated from a lens-aperture + leaf SVG mark).
- `sw.js`: versioned cache-first for shell assets; network-only for Gemini; bump cache name per release.
- Deploy: GitHub repo (project-local git) → GitHub Pages. Camera + install require HTTPS — Pages provides it. Local dev: `python3 -m http.server` (camera works on localhost).
- Install: Chrome on Android → "Add to Home Screen."

## 9. Error handling & edge cases

Covered above per-feature, plus: no camera permission → file-input fallback · day rollover while app open → refresh on `visibilitychange` · empty states for every screen with a friendly prompt toward the first action · IndexedDB quota/photo bloat prevented by 256px thumbs · import of malformed JSON → validation error, nothing written · clock changes handled by always deriving from local `dateKey`.

## 10. Testing & verification

- `nutrition.js` is pure → a `tests.html` page runs assertion checks on bulk score, surplus, scaling, suggestions (open in browser, all-green list).
- Manual checklist per screen (logged in README): onboarding, scan happy-path, scan with no key/offline/429, ±50g scaling, repeat, quick-add, edit/delete/undo, export→wipe→import round-trip, day rollover, install on Android, confetti fires once on protein goal.
- One real scan verified end-to-end with Anas's key + a real meal photo before calling it shipped.

## 11. Stretch (not in v1 acceptance)

Voice input on Manual Add (Web Speech API) · multi-item scan results (per-food breakdown) · cloud sync · home-screen widget. Explicitly out: social features, diet modes, ads/accounts.
