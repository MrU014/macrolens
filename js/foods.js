// foods.js — built-in food database (hostel / Indian staples) + lookup helpers.
// Macros are per 100 g (ml ≈ g for liquids). `units` are portion presets;
// the first unit is the default shown in the picker.

export const FOOD_DB = [
  // --- Staples / grains ---
  { name: 'Rice (cooked)',        emoji: '🍚', per100: { kcal: 130, protein: 2.7,  carbs: 28,  fat: 0.3, fibre: 0.4 }, units: [{ label: 'plate', grams: 200 }, { label: 'cup', grams: 150 }, { label: '100 g', grams: 100 }] },
  { name: 'Roti / Chapati',       emoji: '🫓', per100: { kcal: 297, protein: 11,   carbs: 50,  fat: 7,   fibre: 5   }, units: [{ label: 'roti', grams: 40 }, { label: '2 rotis', grams: 80 }, { label: '100 g', grams: 100 }] },
  { name: 'Bread (white)',        emoji: '🍞', per100: { kcal: 265, protein: 9,    carbs: 49,  fat: 3.2, fibre: 2.7 }, units: [{ label: 'slice', grams: 27 }, { label: '2 slices', grams: 54 }] },
  { name: 'Oats (dry)',           emoji: '🥣', per100: { kcal: 389, protein: 16.9, carbs: 66,  fat: 6.9, fibre: 10.6 }, units: [{ label: 'serving', grams: 40 }, { label: 'big bowl', grams: 60 }] },
  { name: 'Poha',                 emoji: '🍛', per100: { kcal: 130, protein: 2.6,  carbs: 27,  fat: 1.5, fibre: 1   }, units: [{ label: 'plate', grams: 200 }] },
  { name: 'Upma',                 emoji: '🥘', per100: { kcal: 135, protein: 3,    carbs: 20,  fat: 4.5, fibre: 1.5 }, units: [{ label: 'plate', grams: 200 }] },
  { name: 'Idli',                 emoji: '🍥', per100: { kcal: 146, protein: 4,    carbs: 30,  fat: 0.5, fibre: 1.5 }, units: [{ label: 'idli', grams: 40 }, { label: '3 idlis', grams: 120 }] },
  { name: 'Dosa (plain)',         emoji: '🥞', per100: { kcal: 168, protein: 3.9,  carbs: 28,  fat: 4.5, fibre: 1.5 }, units: [{ label: 'dosa', grams: 100 }] },
  { name: 'Veg Biryani',          emoji: '🍛', per100: { kcal: 180, protein: 4,    carbs: 28,  fat: 6,   fibre: 2   }, units: [{ label: 'plate', grams: 250 }] },
  { name: 'Chicken Biryani',      emoji: '🍗', per100: { kcal: 200, protein: 10,   carbs: 24,  fat: 8,   fibre: 1.5 }, units: [{ label: 'plate', grams: 300 }] },
  { name: 'Fried Rice',           emoji: '🍚', per100: { kcal: 170, protein: 4,    carbs: 28,  fat: 5,   fibre: 1.5 }, units: [{ label: 'plate', grams: 250 }] },
  { name: 'Curd Rice',            emoji: '🍚', per100: { kcal: 150, protein: 4,    carbs: 22,  fat: 5,   fibre: 0.6 }, units: [{ label: 'plate', grams: 200 }] },
  { name: 'Maggi (cooked)',       emoji: '🍜', per100: { kcal: 150, protein: 3.5,  carbs: 20,  fat: 6,   fibre: 1   }, units: [{ label: 'pack', grams: 230 }] },

  // --- Protein mains ---
  { name: 'Chicken Curry',        emoji: '🍗', per100: { kcal: 180, protein: 14,   carbs: 6,   fat: 11,  fibre: 1   }, units: [{ label: 'serving', grams: 200 }] },
  { name: 'Chicken Breast',       emoji: '🐔', per100: { kcal: 165, protein: 31,   carbs: 0,   fat: 3.6, fibre: 0   }, units: [{ label: 'piece', grams: 120 }, { label: '100 g', grams: 100 }] },
  { name: 'Egg (whole)',          emoji: '🥚', per100: { kcal: 155, protein: 13,   carbs: 1.1, fat: 11,  fibre: 0   }, units: [{ label: 'egg', grams: 50 }, { label: '2 eggs', grams: 100 }, { label: '3 eggs', grams: 150 }] },
  { name: 'Egg Whites',           emoji: '🥚', per100: { kcal: 52,  protein: 11,   carbs: 0.7, fat: 0.2, fibre: 0   }, units: [{ label: 'white', grams: 33 }, { label: '3 whites', grams: 99 }] },
  { name: 'Paneer',               emoji: '🧀', per100: { kcal: 265, protein: 18,   carbs: 1.2, fat: 21,  fibre: 0   }, units: [{ label: '50 g', grams: 50 }, { label: '100 g', grams: 100 }] },
  { name: 'Paneer Curry',         emoji: '🍛', per100: { kcal: 240, protein: 9,    carbs: 8,   fat: 19,  fibre: 1.5 }, units: [{ label: 'serving', grams: 200 }] },
  { name: 'Soya Chunks (dry)',    emoji: '🫘', per100: { kcal: 345, protein: 52,   carbs: 33,  fat: 0.5, fibre: 13  }, units: [{ label: 'serving', grams: 30 }] },
  { name: 'Fish (cooked)',        emoji: '🐟', per100: { kcal: 160, protein: 22,   carbs: 0,   fat: 7,   fibre: 0   }, units: [{ label: 'piece', grams: 120 }] },
  { name: 'Curd / Yogurt',        emoji: '🥛', per100: { kcal: 60,  protein: 3.5,  carbs: 4.7, fat: 3.3, fibre: 0   }, units: [{ label: 'bowl', grams: 150 }] },
  { name: 'Greek Yogurt',         emoji: '🥛', per100: { kcal: 97,  protein: 10,   carbs: 3.6, fat: 5,   fibre: 0   }, units: [{ label: 'cup', grams: 170 }] },

  // --- Dals / legumes ---
  { name: 'Dal (cooked)',         emoji: '🥣', per100: { kcal: 110, protein: 6,    carbs: 16,  fat: 2,   fibre: 4   }, units: [{ label: 'bowl', grams: 200 }] },
  { name: 'Rajma (cooked)',       emoji: '🫘', per100: { kcal: 127, protein: 8.7,  carbs: 22,  fat: 0.5, fibre: 6   }, units: [{ label: 'bowl', grams: 200 }] },
  { name: 'Chole (cooked)',       emoji: '🫘', per100: { kcal: 160, protein: 9,    carbs: 27,  fat: 2.6, fibre: 8   }, units: [{ label: 'bowl', grams: 200 }] },
  { name: 'Sambar',               emoji: '🍲', per100: { kcal: 85,  protein: 4,    carbs: 12,  fat: 2,   fibre: 3   }, units: [{ label: 'bowl', grams: 200 }] },

  // --- Veg sides ---
  { name: 'Mixed Veg Curry',      emoji: '🥗', per100: { kcal: 110, protein: 3,    carbs: 12,  fat: 6,   fibre: 4   }, units: [{ label: 'serving', grams: 150 }] },
  { name: 'Aloo Sabzi',           emoji: '🥔', per100: { kcal: 120, protein: 2.5,  carbs: 18,  fat: 4.5, fibre: 2.5 }, units: [{ label: 'serving', grams: 150 }] },

  // --- Fruits ---
  { name: 'Banana',               emoji: '🍌', per100: { kcal: 89,  protein: 1.1,  carbs: 23,  fat: 0.3, fibre: 2.6 }, units: [{ label: 'medium', grams: 118 }, { label: 'large', grams: 136 }] },
  { name: 'Apple',                emoji: '🍎', per100: { kcal: 52,  protein: 0.3,  carbs: 14,  fat: 0.2, fibre: 2.4 }, units: [{ label: 'medium', grams: 180 }] },
  { name: 'Mango',                emoji: '🥭', per100: { kcal: 60,  protein: 0.8,  carbs: 15,  fat: 0.4, fibre: 1.6 }, units: [{ label: 'medium', grams: 200 }] },

  // --- Dairy / drinks ---
  { name: 'Milk (full)',          emoji: '🥛', per100: { kcal: 62,  protein: 3.2,  carbs: 4.8, fat: 3.3, fibre: 0   }, units: [{ label: '200 ml', grams: 200 }, { label: '250 ml', grams: 250 }] },
  { name: 'Protein Shake',        emoji: '💪', per100: { kcal: 375, protein: 75,   carbs: 9,   fat: 5,   fibre: 1   }, units: [{ label: 'scoop', grams: 32 }, { label: '2 scoops', grams: 64 }] },
  { name: 'Mass Gainer',          emoji: '🏋️', per100: { kcal: 380, protein: 16,   carbs: 70,  fat: 3,   fibre: 1   }, units: [{ label: 'scoop', grams: 75 }, { label: '2 scoops', grams: 150 }] },

  // --- Fats / nuts / extras ---
  { name: 'Peanut Butter',        emoji: '🥜', per100: { kcal: 588, protein: 25,   carbs: 20,  fat: 50,  fibre: 6   }, units: [{ label: 'tbsp', grams: 16 }, { label: '2 tbsp', grams: 32 }] },
  { name: 'Almonds',              emoji: '🌰', per100: { kcal: 579, protein: 21,   carbs: 22,  fat: 49,  fibre: 12  }, units: [{ label: 'handful', grams: 28 }] },
  { name: 'Ghee',                 emoji: '🧈', per100: { kcal: 900, protein: 0,    carbs: 0,   fat: 100, fibre: 0   }, units: [{ label: 'tsp', grams: 5 }, { label: 'tbsp', grams: 14 }] },
  { name: 'Smoothie',             emoji: '🥤', per100: { kcal: 90,  protein: 3,    carbs: 16,  fat: 1.5, fibre: 1.5 }, units: [{ label: 'glass', grams: 300 }] },
];

// Home-screen one-tap chips: log a fixed portion instantly.
export const QUICK_ADD_CHIPS = [
  { label: '+200ml Milk', emoji: '🥛', food: 'Milk (full)',     grams: 200 },
  { label: '+2 Eggs',     emoji: '🥚', food: 'Egg (whole)',     grams: 100 },
  { label: '+1 Banana',   emoji: '🍌', food: 'Banana',          grams: 118 },
  { label: '+1 Scoop',    emoji: '💪', food: 'Protein Shake',   grams: 32  },
];

// Manual-add quick template chips (names must exist in FOOD_DB).
export const QUICK_TEMPLATES = [
  'Chicken Breast', 'Rice (cooked)', 'Milk (full)', 'Egg (whole)', 'Banana',
  'Protein Shake', 'Oats (dry)', 'Paneer', 'Dal (cooked)', 'Roti / Chapati',
];

// Compute absolute macros for a given food + grams.
export function macrosFor(food, grams) {
  const f = grams / 100;
  return {
    grams: Math.round(grams),
    kcal: Math.round(food.per100.kcal * f),
    protein: round1(food.per100.protein * f),
    carbs: round1(food.per100.carbs * f),
    fat: round1(food.per100.fat * f),
    fibre: round1(food.per100.fibre * f),
  };
}

export function findFood(name) {
  if (!name) return null;
  const q = name.trim().toLowerCase();
  return FOOD_DB.find(f => f.name.toLowerCase() === q) || null;
}

// Lightweight fuzzy search: prefix and substring matches, ranked.
export function searchFoods(query, limit = 8) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return FOOD_DB.slice(0, limit);
  const scored = [];
  for (const f of FOOD_DB) {
    const name = f.name.toLowerCase();
    let score = -1;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 50;
    else if (q.split(/\s+/).every(w => name.includes(w))) score = 30;
    if (score >= 0) scored.push({ f, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.f);
}

function round1(n) { return Math.round(n * 10) / 10; }
