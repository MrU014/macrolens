// analytics.js — the "Stats" tab. Daily Score + goal-aware metrics + charts.
import * as store from '../store.js';
import * as N from '../nutrition.js';
import { el } from './components.js';

const ORANGE = '#d8893c', GREEN = '#4e9a6b', GREEN_L = '#4e9a6b', TEAL = '#6fa394', NEUTRAL = '#8b94a1';
let RANGE = 7;

export async function render(root, ctx) {
  const s = store.getSettings();
  const g = N.goalMeta(s.goal);
  const [all, weights] = await Promise.all([store.getAllMeals(), store.getAllWeights()]);
  const mem = await store.getFoodMemory();

  const byDay = new Map();
  for (const m of all) { if (!byDay.has(m.dateKey)) byDay.set(m.dateKey, []); byDay.get(m.dateKey).push(m); }

  const keys = store.recentKeys(RANGE);
  const dayTotals = keys.map(k => N.sumMacros(byDay.get(k) || []));
  const dayKcals = dayTotals.map(t => t.kcal);
  const dayProts = dayTotals.map(t => t.protein);
  const loggedIdx = keys.map((k, i) => ((byDay.get(k) || []).length ? i : -1)).filter(i => i >= 0);
  const n = loggedIdx.length || 1;
  const avgOf = (arr) => Math.round(loggedIdx.reduce((sum, i) => sum + arr[i], 0) / n);

  const avgKcal = avgOf(dayKcals);
  const avgProt = avgOf(dayProts);
  const net = avgKcal - s.maintenanceKcal;
  const trend = N.weightTrend(weights);

  // today
  const today = N.sumMacros(byDay.get(store.todayKey()) || []);
  const todayMealCount = (byDay.get(store.todayKey()) || []).length;
  const score = N.dailyScore({ kcal: today.kcal, goalKcal: s.goalKcal, protein: today.protein, goalProtein: s.goalProtein, mealCount: todayMealCount, goal: s.goal });
  const support = N.muscleSupport({ protein: today.protein, goalProtein: s.goalProtein, kcal: today.kcal, goalKcal: s.goalKcal });
  const streakDays = store.recentKeys(21).map(k => ({ dateKey: k, protein: N.sumMacros(byDay.get(k) || []).protein }))
    .filter(d => d.dateKey !== store.todayKey() || d.protein >= s.goalProtein);
  const streak = N.proteinStreak(streakDays, s.goalProtein);
  const onTarget = N.daysOnTarget(loggedIdx.map(i => dayKcals[i]), s.goalKcal, s.goal);
  const recovery = N.recoveryIndicator(byDay.get(store.todayKey()) || []);
  const monthly = N.predictMonthlyChange(avgKcal, s.maintenanceKcal);
  const consistency = Math.round((loggedIdx.filter(i => dayProts[i] >= 0.9 * s.goalProtein).length / n) * 100);

  root.replaceChildren();
  root.appendChild(el('.screen.analytics', {}, [
    el('.an-head', {}, [
      el('h1.page-title', {}, ['Stats']),
      el('.range-switch', {}, [7, 30, 90].map(r =>
        el('button.range-btn', { class: r === RANGE ? 'active' : '', onclick: () => { RANGE = r; render(root, ctx); } }, [`${r}d`]))),
    ]),

    // Daily Score hero
    el('.card.score-hero', {}, [
      el('.score-big', {}, [String(score)]),
      el('div', {}, [
        el('.score-title', {}, ['Today’s Score']),
        el('.score-sub', {}, [N.scoreLabel(score)]),
      ]),
    ]),

    el('.section-label', {}, ['TODAY']),
    el('.gains-grid', {}, [
      statCard('Nutrition', `${support}%`, 'protein + fuel', GREEN_L),
      statCard('Protein Streak', String(streak), 'days', ORANGE),
      statCard('Days on Target', `${onTarget}/${n}`, `last ${RANGE}d`, ORANGE),
      statCard('Recovery', recovery.status === 'good' ? 'Solid' : recovery.status === 'ok' ? 'OK' : 'Low',
        `${recovery.feedings} feedings`, recovery.status === "good" ? GREEN_L : recovery.status === "ok" ? NEUTRAL : ORANGE),
    ]),

    // Trend meter (predicted weight change)
    el('.card.mass-meter', {}, [
      el('.mm-head', {}, [el('span', {}, ['Trend Meter']),
        el('.mm-val', { style: { color: trendColor(s.goal, monthly) } }, [`${monthly >= 0 ? '+' : ''}${monthly} kg/mo`])]),
      gauge(monthly, -3, 3),
      el('.mm-sub', {}, [`Projected from your ${RANGE}-day average intake vs maintenance (${s.maintenanceKcal} kcal).`]),
    ]),

    el('.section-label', {}, [`AVERAGES · LAST ${RANGE} DAYS`]),
    el('.avg-grid', {}, [
      statCard('Avg Calories', avgKcal.toLocaleString(), 'kcal/day', ORANGE),
      statCard('Avg Protein', `${avgProt}g`, 'per day', GREEN_L),
      statCard(`Avg ${g.netLabel === 'NET' ? 'Net' : g.netLabel[0] + g.netLabel.slice(1).toLowerCase()}`, `${net >= 0 ? '+' : ''}${net}`, 'kcal/day', net >= 0 ? ORANGE : GREEN_L),
      statCard('Weight Δ', trend.deltaWeek != null ? `${trend.deltaWeek >= 0 ? '+' : ''}${trend.deltaWeek}` : '—', 'kg/week', GREEN_L),
    ]),

    el('.card', {}, [el('.chart-title', {}, ['Protein consistency']),
      el('.consistency', {}, [el('.cons-num', {}, [`${consistency}%`]), el('.cons-sub', {}, [`of logged days hit ≥90% of your ${s.goalProtein}g goal`])])]),

    el('.card', {}, [el('.chart-title', {}, ['Calories vs goal']), barChart(dayKcals, s.goalKcal)]),
    el('.card', {}, [el('.chart-title', {}, ['Weight vs intake (7-day avg)']), weightVsIntake(keys, dayKcals, weights)]),
    el('.card', {}, [el('.chart-title', {}, ['Macro split (avg)']), macroDonut(dayTotals)]),
    el('.card', {}, [el('.chart-title', {}, ['Protein by time of day']), heatmap(byDay)]),
    el('.card', {}, [el('.chart-title', {}, ['Daily Score calendar']), calendar(keys, byDay, s)]),
    el('.card', {}, [el('.chart-title', {}, ['Most-logged meals']), topMeals(mem)]),
  ]));
}

function trendColor(goal, monthly) {
  if (goal === 'lose') return monthly <= 0 ? GREEN_L : ORANGE;
  if (goal === 'gain') return monthly >= 0 ? GREEN_L : ORANGE;
  return Math.abs(monthly) < 0.5 ? GREEN_L : ORANGE;
}

function statCard(label, value, sub, color) {
  return el('.card.stat', {}, [el('.stat-label', {}, [label]), el('.stat-val', { style: { color } }, [value]), el('.stat-sub', {}, [sub])]);
}

function gauge(value, min, max) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const zero = Math.max(0, Math.min(1, (0 - min) / (max - min)));
  return el('.gauge', {}, [el('.gauge-track', {}, [
    el('.gauge-zero', { style: { left: (zero * 100) + '%' } }),
    el('.gauge-fill', { style: { width: (pct * 100) + '%', background: value >= 0 ? ORANGE : GREEN } }),
  ])]);
}

function barChart(values, goal) {
  const W = 320, H = 120, pad = 6;
  const max = Math.max(goal * 1.1, ...values, 1);
  const bw = (W - pad * 2) / values.length;
  const svg = svgEl(W, H);
  const gy = H - (goal / max) * (H - 20) - 10;
  svg.appendChild(line(pad, gy, W - pad, gy, 'rgba(78,154,107,.5)', 1, '4 4'));
  svg.appendChild(text(W - pad, gy - 4, 'goal', 'end', GREEN_L));
  values.forEach((v, i) => {
    const h = (v / max) * (H - 20);
    svg.appendChild(rect(pad + i * bw + bw * 0.18, H - h - 10, bw * 0.64, h, v >= goal ? GREEN : ORANGE, 3));
  });
  return wrapChart(svg);
}

function weightVsIntake(keys, kcals, weights) {
  const W = 320, H = 130, pad = 22;
  const wMap = new Map(weights.map(w => [w.dateKey, w.kg]));
  const wSeries = keys.map(k => wMap.has(k) ? wMap.get(k) : null);
  const kSmooth = N.rollingAverage(kcals, 7);
  const svg = svgEl(W, H);
  const kMax = Math.max(...kSmooth, 1), kMin = Math.min(...kSmooth.filter(Boolean), kMax * 0.6);
  const kPts = kSmooth.map((v, i) => [pad + (i / (keys.length - 1 || 1)) * (W - pad * 2), H - pad - ((v - kMin) / (kMax - kMin || 1)) * (H - pad * 2)]);
  svg.appendChild(polyline(kPts, ORANGE, 2));
  const known = wSeries.map((v, i) => [v, i]).filter(([v]) => v != null);
  if (known.length >= 2) {
    const vals = known.map(([v]) => v); const wMin = Math.min(...vals), wMax = Math.max(...vals);
    const wPts = known.map(([v, i]) => [pad + (i / (keys.length - 1 || 1)) * (W - pad * 2), H - pad - ((v - wMin) / (wMax - wMin || 1)) * (H - pad * 2)]);
    svg.appendChild(polyline(wPts, GREEN_L, 2));
    wPts.forEach(p => svg.appendChild(dot(p[0], p[1], GREEN_L)));
  }
  return el('div', {}, [wrapChart(svg), el('.legend', {}, [legendDot(ORANGE, 'Calories (avg)'), legendDot(GREEN_L, 'Weight')])]);
}

function macroDonut(dayTotals) {
  const sum = dayTotals.reduce((a, t) => ({ p: a.p + t.protein, c: a.c + t.carbs, f: a.f + t.fat }), { p: 0, c: 0, f: 0 });
  const pK = sum.p * 4, cK = sum.c * 4, fK = sum.f * 9, tot = pK + cK + fK || 1;
  const pp = pK / tot, cp = cK / tot, fp = fK / tot, deg = (x) => x * 360;
  const grad = `conic-gradient(${GREEN} 0 ${deg(pp)}deg, ${NEUTRAL} ${deg(pp)}deg ${deg(pp + cp)}deg, ${ORANGE} ${deg(pp + cp)}deg 360deg)`;
  return el('.donut-wrap', {}, [
    el('.donut', { style: { background: grad } }, [el('.donut-hole')]),
    el('.donut-legend', {}, [legendDot(GREEN, `Protein ${Math.round(pp * 100)}%`), legendDot(NEUTRAL, `Carbs ${Math.round(cp * 100)}%`), legendDot(ORANGE, `Fat ${Math.round(fp * 100)}%`)]),
  ]);
}

function heatmap(byDay) {
  const keys = store.recentKeys(7);
  const matrix = N.proteinHeatmap([].concat(...keys.map(k => byDay.get(k) || [])), keys);
  const buckets = ['0', '3', '6', '9', '12', '15', '18', '21'];
  let maxCell = 1;
  const bucketed = matrix.map(row => {
    const b = new Array(8).fill(0);
    for (let h = 0; h < 24; h++) b[Math.floor(h / 3)] += row[h];
    b.forEach(v => { if (v > maxCell) maxCell = v; });
    return b;
  });
  const grid = el('.heatmap');
  grid.appendChild(el('.hm-corner'));
  buckets.forEach(b => grid.appendChild(el('.hm-col', {}, [b])));
  keys.forEach((k, di) => {
    grid.appendChild(el('.hm-row', {}, [k.slice(8)]));
    bucketed[di].forEach(v => {
      const a = v / maxCell;
      grid.appendChild(el('.hm-cell', { style: { background: a === 0 ? '#e9ebe9' : `rgba(78,154,107,${0.15 + a * 0.85})` }, title: `${Math.round(v)}g` }));
    });
  });
  return el('div', {}, [grid, el('.hm-note', {}, ['Darker = more protein that window. Spot the gaps.'])]);
}

function calendar(keys, byDay, s) {
  const cal = el('.calendar');
  keys.forEach(k => {
    const meals = byDay.get(k) || [];
    const t = N.sumMacros(meals);
    const score = meals.length ? N.dailyScore({ kcal: t.kcal, goalKcal: s.goalKcal, protein: t.protein, goalProtein: s.goalProtein, mealCount: meals.length, goal: s.goal }) : 0;
    const a = score / 100;
    cal.appendChild(el('.cal-cell', { style: { background: score === 0 ? '#e9ebe9' : `rgba(78,154,107,${0.12 + a * 0.88})` }, title: `${k}: ${score}` }));
  });
  return cal;
}

function topMeals(mem) {
  const top = [...mem].sort((a, b) => b.count - a.count).slice(0, 5);
  if (!top.length) return el('.empty-sm', {}, ['Log meals and your favourites show up here.']);
  return el('.top-meals', {}, top.map(m => el('.top-row', {}, [el('.top-name', {}, [m.name]), el('.top-count', {}, [`${m.count}×`])])));
}

const NS = 'http://www.w3.org/2000/svg';
function svgEl(w, h) { const s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', `0 0 ${w} ${h}`); s.setAttribute('width', '100%'); s.setAttribute('height', h); return s; }
function rect(x, y, w, h, fill, r = 0) { const e = document.createElementNS(NS, 'rect'); e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('width', w); e.setAttribute('height', Math.max(0, h)); e.setAttribute('rx', r); e.setAttribute('fill', fill); return e; }
function line(x1, y1, x2, y2, stroke, w, dash) { const e = document.createElementNS(NS, 'line'); e.setAttribute('x1', x1); e.setAttribute('y1', y1); e.setAttribute('x2', x2); e.setAttribute('y2', y2); e.setAttribute('stroke', stroke); e.setAttribute('stroke-width', w); if (dash) e.setAttribute('stroke-dasharray', dash); return e; }
function polyline(pts, stroke, w) { const e = document.createElementNS(NS, 'polyline'); e.setAttribute('points', pts.map(p => p.join(',')).join(' ')); e.setAttribute('fill', 'none'); e.setAttribute('stroke', stroke); e.setAttribute('stroke-width', w); e.setAttribute('stroke-linejoin', 'round'); e.setAttribute('stroke-linecap', 'round'); return e; }
function dot(x, y, fill) { const e = document.createElementNS(NS, 'circle'); e.setAttribute('cx', x); e.setAttribute('cy', y); e.setAttribute('r', 2.5); e.setAttribute('fill', fill); return e; }
function text(x, y, str, anchor, fill) { const e = document.createElementNS(NS, 'text'); e.setAttribute('x', x); e.setAttribute('y', y); e.setAttribute('text-anchor', anchor); e.setAttribute('fill', fill); e.setAttribute('font-size', '9'); e.textContent = str; return e; }
function wrapChart(svg) { return el('.chart', {}, [svg]); }
function legendDot(color, label) { return el('.leg', {}, [el('span.leg-dot', { style: { background: color } }), label]); }
