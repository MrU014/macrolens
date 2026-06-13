# MacroLens 🔍💪

A premium, dark-mode nutrition companion for **any goal** — lose, maintain, or gain weight. Scan meals with your camera, track calories and macros with almost no effort, and watch your progress — all on your phone, all offline-first.

> **Philosophy:** *Roughly right beats perfectly tracked.* Logging a meal should take under 15 seconds.

Built as a vanilla-JS Progressive Web App — no build step, no backend, no accounts. Your data lives on your device.

---

## Features

- **Any goal** — pick lose / maintain / gain; the app calculates your calories & macros (Mifflin–St Jeor + activity) and adapts its language and scoring to your goal. Everything stays editable.
- **AI photo scan** — point your camera at a plate, get an estimated name, portion, and full macros (Google Gemini, free tier). Adjust with steppers; everything stays editable.
- **Clean home** — calorie ring + protein/carbs/fat/fibre bars, weight trend, goal-aware coaching, and today's meals grouped into six sections (breakfast, morning snack, lunch, evening snack, dinner, midnight snack).
- **100+ foods + forgiving search** — Indian *and* global staples; search shrugs off misspellings ("biriyani", "yoghurt", "dahi") and partial words. Quick-add chips, "your usuals", portion presets, and custom meals.
- **Stats tab** — Daily Score, weekly averages, protein consistency, Trend Meter, protein streak, days-on-target, protein heatmap, macro split, weight-vs-intake chart, and a score calendar.
- **History** — every day, expandable, searchable; edit / duplicate / delete with undo.
- **Offline & installable** — works with no signal; add to your home screen like a native app.
- **Your data is yours** — one-tap JSON backup & restore.

---

## Run it

It's a static site — any static server works. From the project folder:

```bash
python3 -m http.server 8000
```

Open **http://localhost:8000** on your computer. The camera works on `localhost` and on HTTPS.

### Install on your Android phone

1. Host the folder over HTTPS (the easiest free option is **GitHub Pages** — see below).
2. Open the URL in **Chrome** on your phone.
3. Menu (⋮) → **Add to Home screen**. It now launches full-screen like an app.

### Deploy to GitHub Pages (free HTTPS)

```bash
# from the MacroLens folder, after creating an empty GitHub repo:
git remote add origin https://github.com/<you>/macrolens.git
git push -u origin main
```

Then in the repo: **Settings → Pages → Source: `main` / root**. Your app goes live at
`https://<you>.github.io/macrolens/`.

---

## Set up AI scanning (free, 2 minutes)

Scanning uses Google's **Gemini** API, which has a free tier that comfortably covers personal daily use.

1. Go to **https://aistudio.google.com/app/apikey** and sign in with a Google account.
2. Click **Create API key** → copy it.
3. In MacroLens: **Profile → AI Scanning → paste the key → Test key**.

That's it — the Scan button now works. The key is stored **only on your device**, sent directly to Google over HTTPS, and is **never included in backups**.

> No key? The app still works fully for manual logging — scanning just stays off until you add one.

---

## Tests

Open **`tests.html`** in a browser. It runs assertions against the pure functions in `js/nutrition.js`
(bulk score, surplus prediction, portion scaling, streaks, suggestions, coaching notes) and shows a green/red summary.

### Manual QA checklist

- [ ] First-run onboarding (name → targets → optional key)
- [ ] Scan happy path (real photo + key) → adjust ±50 g → save
- [ ] Scan with no key / offline / rate-limited → friendly fallback to manual
- [ ] Manual add: search, template, your-usuals, custom meal
- [ ] Quick-add chips log instantly
- [ ] Repeat yesterday (all + single)
- [ ] Edit / delete (with undo) / duplicate a meal
- [ ] Log weight → trend appears on Home & Analytics
- [ ] Export backup → reset all → import backup (data returns)
- [ ] Confetti fires once when the protein goal is hit
- [ ] Analytics ranges 7 / 30 / 90 render all charts
- [ ] Install on Android & launch offline

---

## Architecture

```
index.html            app shell, tab bar, modal roots
manifest.webmanifest  PWA metadata        sw.js  offline cache
css/   base · components · screens         icons/ app icon (svg + png)
js/
  app.js        bootstrap, tab router, onboarding, day rollover
  store.js      IndexedDB + state cache + export/import
  gemini.js     photo → macro estimate (model id is one constant)
  nutrition.js  pure math (bulk score, surplus, heatmap, notes) — unit-tested
  foods.js      built-in food database + lookup
  ui/  components · home · scan · sheets · history · analytics · profile
```

`nutrition.js` is pure (no DOM, no storage), which is why it's the part that's unit-tested.
Design spec lives in `docs/superpowers/specs/`.

---

*MacroLens is a personal-use tracker, not medical or dietary advice. Estimates are approximate by design.*
