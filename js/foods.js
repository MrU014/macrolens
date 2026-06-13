// foods.js — built-in food database (Indian + global staples) + fuzzy lookup.
// Macros are per 100 g (ml ≈ g for liquids). `units` are portion presets
// (first is the default). `aliases` improve search (alt spellings, local names).

export const FOOD_DB = [
  // ───────────── Indian: rice & grains ─────────────
  { name: 'Rice (cooked)',     emoji: '🍚', per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fibre: 0.4 }, units: [{ label: 'plate', grams: 200 }, { label: 'cup', grams: 150 }, { label: '100 g', grams: 100 }], aliases: ['white rice', 'steamed rice', 'chawal', 'bhaat'] },
  { name: 'Brown Rice (cooked)', emoji: '🍚', per100: { kcal: 123, protein: 2.7, carbs: 26, fat: 1, fibre: 1.8 }, units: [{ label: 'plate', grams: 200 }, { label: 'cup', grams: 150 }] },
  { name: 'Jeera Rice',        emoji: '🍚', per100: { kcal: 165, protein: 3, carbs: 28, fat: 4.5, fibre: 0.6 }, units: [{ label: 'plate', grams: 200 }], aliases: ['cumin rice'] },
  { name: 'Veg Biryani',       emoji: '🍛', per100: { kcal: 180, protein: 4, carbs: 28, fat: 6, fibre: 2 }, units: [{ label: 'plate', grams: 250 }], aliases: ['vegetable biryani', 'biriyani', 'biryani', 'briyani'] },
  { name: 'Chicken Biryani',   emoji: '🍗', per100: { kcal: 200, protein: 10, carbs: 24, fat: 8, fibre: 1.5 }, units: [{ label: 'plate', grams: 300 }, { label: 'half plate', grams: 180 }], aliases: ['chicken biriyani', 'chicken briyani', 'murgh biryani', 'biryani chicken'] },
  { name: 'Mutton Biryani',    emoji: '🍖', per100: { kcal: 215, protein: 11, carbs: 22, fat: 10, fibre: 1.5 }, units: [{ label: 'plate', grams: 300 }], aliases: ['mutton biriyani', 'lamb biryani'] },
  { name: 'Egg Biryani',       emoji: '🥚', per100: { kcal: 185, protein: 7, carbs: 26, fat: 6.5, fibre: 1.5 }, units: [{ label: 'plate', grams: 280 }], aliases: ['anda biryani'] },
  { name: 'Fried Rice',        emoji: '🍚', per100: { kcal: 170, protein: 4, carbs: 28, fat: 5, fibre: 1.5 }, units: [{ label: 'plate', grams: 250 }], aliases: ['veg fried rice', 'chinese rice'] },
  { name: 'Curd Rice',         emoji: '🍚', per100: { kcal: 150, protein: 4, carbs: 22, fat: 5, fibre: 0.6 }, units: [{ label: 'plate', grams: 200 }], aliases: ['thayir sadam', 'dahi rice'] },
  { name: 'Lemon Rice',        emoji: '🍚', per100: { kcal: 165, protein: 3, carbs: 27, fat: 5, fibre: 1 }, units: [{ label: 'plate', grams: 200 }] },
  { name: 'Pulao',             emoji: '🍛', per100: { kcal: 170, protein: 3.5, carbs: 27, fat: 5.5, fibre: 1.8 }, units: [{ label: 'plate', grams: 220 }], aliases: ['pulav', 'pilaf', 'veg pulao'] },

  // ───────────── Indian: breads ─────────────
  { name: 'Roti / Chapati',    emoji: '🫓', per100: { kcal: 297, protein: 11, carbs: 50, fat: 7, fibre: 5 }, units: [{ label: 'roti', grams: 40 }, { label: '2 rotis', grams: 80 }], aliases: ['phulka', 'chapathi', 'wheat roti'] },
  { name: 'Naan',              emoji: '🫓', per100: { kcal: 310, protein: 9, carbs: 50, fat: 8, fibre: 2.2 }, units: [{ label: 'naan', grams: 90 }], aliases: ['butter naan', 'garlic naan'] },
  { name: 'Paratha',           emoji: '🫓', per100: { kcal: 320, protein: 7, carbs: 42, fat: 14, fibre: 3 }, units: [{ label: 'paratha', grams: 80 }], aliases: ['parantha', 'aloo paratha'] },
  { name: 'Puri',              emoji: '🫓', per100: { kcal: 360, protein: 7, carbs: 45, fat: 17, fibre: 2 }, units: [{ label: 'puri', grams: 25 }, { label: '3 puris', grams: 75 }], aliases: ['poori'] },
  { name: 'Dosa (plain)',      emoji: '🥞', per100: { kcal: 168, protein: 3.9, carbs: 28, fat: 4.5, fibre: 1.5 }, units: [{ label: 'dosa', grams: 100 }], aliases: ['masala dosa', 'plain dosa', 'dosai'] },
  { name: 'Idli',              emoji: '🍥', per100: { kcal: 146, protein: 4, carbs: 30, fat: 0.5, fibre: 1.5 }, units: [{ label: 'idli', grams: 40 }, { label: '3 idlis', grams: 120 }], aliases: ['idly'] },
  { name: 'Uttapam',           emoji: '🥞', per100: { kcal: 155, protein: 4, carbs: 26, fat: 4, fibre: 2 }, units: [{ label: 'piece', grams: 120 }] },
  { name: 'Bread (white)',     emoji: '🍞', per100: { kcal: 265, protein: 9, carbs: 49, fat: 3.2, fibre: 2.7 }, units: [{ label: 'slice', grams: 27 }, { label: '2 slices', grams: 54 }], aliases: ['white bread', 'sandwich bread'] },
  { name: 'Brown Bread',       emoji: '🍞', per100: { kcal: 250, protein: 11, carbs: 43, fat: 3.5, fibre: 6 }, units: [{ label: 'slice', grams: 30 }, { label: '2 slices', grams: 60 }], aliases: ['whole wheat bread', 'multigrain bread'] },

  // ───────────── Indian: dals & legumes ─────────────
  { name: 'Dal (cooked)',      emoji: '🥣', per100: { kcal: 110, protein: 6, carbs: 16, fat: 2, fibre: 4 }, units: [{ label: 'bowl', grams: 200 }], aliases: ['daal', 'lentils', 'toor dal', 'moong dal', 'tadka'] },
  { name: 'Dal Makhani',       emoji: '🥣', per100: { kcal: 145, protein: 6, carbs: 14, fat: 7, fibre: 4 }, units: [{ label: 'bowl', grams: 200 }] },
  { name: 'Rajma (cooked)',    emoji: '🫘', per100: { kcal: 127, protein: 8.7, carbs: 22, fat: 0.5, fibre: 6 }, units: [{ label: 'bowl', grams: 200 }], aliases: ['kidney beans', 'rajmah'] },
  { name: 'Chole (cooked)',    emoji: '🫘', per100: { kcal: 160, protein: 9, carbs: 27, fat: 2.6, fibre: 8 }, units: [{ label: 'bowl', grams: 200 }], aliases: ['chana masala', 'chickpea curry', 'channa', 'chhole'] },
  { name: 'Sambar',            emoji: '🍲', per100: { kcal: 85, protein: 4, carbs: 12, fat: 2, fibre: 3 }, units: [{ label: 'bowl', grams: 200 }], aliases: ['sambhar'] },
  { name: 'Soya Chunks (dry)', emoji: '🫘', per100: { kcal: 345, protein: 52, carbs: 33, fat: 0.5, fibre: 13 }, units: [{ label: 'serving', grams: 30 }], aliases: ['soy chunks', 'meal maker', 'nutrela'] },

  // ───────────── Indian: mains (veg) ─────────────
  { name: 'Paneer Curry',      emoji: '🍛', per100: { kcal: 240, protein: 9, carbs: 8, fat: 19, fibre: 1.5 }, units: [{ label: 'serving', grams: 200 }], aliases: ['paneer butter masala', 'shahi paneer', 'kadai paneer', 'matar paneer'] },
  { name: 'Palak Paneer',      emoji: '🥬', per100: { kcal: 180, protein: 8, carbs: 7, fat: 13, fibre: 2.5 }, units: [{ label: 'serving', grams: 200 }] },
  { name: 'Mixed Veg Curry',   emoji: '🥗', per100: { kcal: 110, protein: 3, carbs: 12, fat: 6, fibre: 4 }, units: [{ label: 'serving', grams: 150 }], aliases: ['veg curry', 'sabzi', 'subzi'] },
  { name: 'Aloo Sabzi',        emoji: '🥔', per100: { kcal: 120, protein: 2.5, carbs: 18, fat: 4.5, fibre: 2.5 }, units: [{ label: 'serving', grams: 150 }], aliases: ['aloo curry', 'potato sabzi'] },
  { name: 'Bhindi (fried)',    emoji: '🌿', per100: { kcal: 130, protein: 2.5, carbs: 11, fat: 8, fibre: 4 }, units: [{ label: 'serving', grams: 150 }], aliases: ['okra', 'lady finger'] },
  { name: 'Aloo Gobi',         emoji: '🥦', per100: { kcal: 115, protein: 3, carbs: 13, fat: 6, fibre: 3.5 }, units: [{ label: 'serving', grams: 150 }] },

  // ───────────── Indian: mains (non-veg) ─────────────
  { name: 'Chicken Curry',     emoji: '🍗', per100: { kcal: 180, protein: 14, carbs: 6, fat: 11, fibre: 1 }, units: [{ label: 'serving', grams: 200 }], aliases: ['chicken masala', 'chicken gravy', 'murgh'] },
  { name: 'Butter Chicken',    emoji: '🍗', per100: { kcal: 210, protein: 14, carbs: 7, fat: 14, fibre: 1 }, units: [{ label: 'serving', grams: 200 }], aliases: ['murgh makhani', 'chicken makhani'] },
  { name: 'Chicken Tikka',     emoji: '🍢', per100: { kcal: 195, protein: 25, carbs: 4, fat: 9, fibre: 0.5 }, units: [{ label: 'serving', grams: 150 }], aliases: ['tandoori chicken', 'chicken tandoori'] },
  { name: 'Egg Curry',         emoji: '🥚', per100: { kcal: 150, protein: 8, carbs: 6, fat: 11, fibre: 1.5 }, units: [{ label: 'serving', grams: 200 }], aliases: ['anda curry'] },
  { name: 'Fish Curry',        emoji: '🐟', per100: { kcal: 150, protein: 14, carbs: 5, fat: 8, fibre: 1 }, units: [{ label: 'serving', grams: 200 }] },
  { name: 'Mutton Curry',      emoji: '🍖', per100: { kcal: 220, protein: 15, carbs: 5, fat: 16, fibre: 1 }, units: [{ label: 'serving', grams: 200 }], aliases: ['lamb curry', 'gosht'] },

  // ───────────── Indian: breakfast / snacks ─────────────
  { name: 'Poha',              emoji: '🍛', per100: { kcal: 130, protein: 2.6, carbs: 27, fat: 1.5, fibre: 1 }, units: [{ label: 'plate', grams: 200 }] },
  { name: 'Upma',              emoji: '🥘', per100: { kcal: 135, protein: 3, carbs: 20, fat: 4.5, fibre: 1.5 }, units: [{ label: 'plate', grams: 200 }] },
  { name: 'Poha / Upma',       emoji: '🍛', per100: { kcal: 132, protein: 3, carbs: 24, fat: 3, fibre: 1.5 }, units: [{ label: 'plate', grams: 200 }], aliases: ['breakfast'] },
  { name: 'Samosa',            emoji: '🥟', per100: { kcal: 260, protein: 5, carbs: 30, fat: 13, fibre: 2.5 }, units: [{ label: 'samosa', grams: 60 }] },
  { name: 'Vada Pav',          emoji: '🍔', per100: { kcal: 240, protein: 6, carbs: 33, fat: 9, fibre: 3 }, units: [{ label: 'piece', grams: 130 }], aliases: ['wada pav'] },
  { name: 'Pav Bhaji',         emoji: '🍲', per100: { kcal: 160, protein: 4, carbs: 20, fat: 7, fibre: 3 }, units: [{ label: 'plate', grams: 300 }] },
  { name: 'Pani Puri',         emoji: '💧', per100: { kcal: 150, protein: 3, carbs: 25, fat: 4, fibre: 2 }, units: [{ label: '6 pieces', grams: 120 }], aliases: ['golgappa', 'puchka', 'gol gappa'] },
  { name: 'Maggi (cooked)',    emoji: '🍜', per100: { kcal: 150, protein: 3.5, carbs: 20, fat: 6, fibre: 1 }, units: [{ label: 'pack', grams: 230 }], aliases: ['noodles', 'instant noodles', 'magi'] },
  { name: 'Pakora',            emoji: '🧅', per100: { kcal: 315, protein: 7, carbs: 30, fat: 18, fibre: 4 }, units: [{ label: 'serving', grams: 100 }], aliases: ['bhaji', 'fritters', 'bhajiya'] },

  // ───────────── Indian: sweets ─────────────
  { name: 'Gulab Jamun',       emoji: '🍮', per100: { kcal: 330, protein: 4, carbs: 50, fat: 13, fibre: 0.5 }, units: [{ label: 'piece', grams: 40 }, { label: '2 pieces', grams: 80 }] },
  { name: 'Jalebi',            emoji: '🍥', per100: { kcal: 360, protein: 3, carbs: 60, fat: 13, fibre: 0.3 }, units: [{ label: 'serving', grams: 60 }] },
  { name: 'Rasgulla',          emoji: '⚪', per100: { kcal: 186, protein: 4, carbs: 38, fat: 2, fibre: 0 }, units: [{ label: 'piece', grams: 50 }] },
  { name: 'Kheer',             emoji: '🍚', per100: { kcal: 145, protein: 4, carbs: 22, fat: 4.5, fibre: 0.3 }, units: [{ label: 'bowl', grams: 150 }], aliases: ['payasam', 'rice pudding'] },
  { name: 'Laddu',             emoji: '🟡', per100: { kcal: 400, protein: 7, carbs: 50, fat: 19, fibre: 2 }, units: [{ label: 'piece', grams: 45 }], aliases: ['ladoo', 'besan laddu'] },

  // ───────────── Protein: eggs, poultry, meat, fish ─────────────
  { name: 'Egg (whole)',       emoji: '🥚', per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11, fibre: 0 }, units: [{ label: 'egg', grams: 50 }, { label: '2 eggs', grams: 100 }, { label: '3 eggs', grams: 150 }], aliases: ['boiled egg', 'anda', 'fried egg'] },
  { name: 'Egg Whites',        emoji: '🥚', per100: { kcal: 52, protein: 11, carbs: 0.7, fat: 0.2, fibre: 0 }, units: [{ label: 'white', grams: 33 }, { label: '3 whites', grams: 99 }] },
  { name: 'Omelette',          emoji: '🍳', per100: { kcal: 165, protein: 11, carbs: 2, fat: 12, fibre: 0.3 }, units: [{ label: '2-egg', grams: 120 }] },
  { name: 'Chicken Breast',    emoji: '🐔', per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6, fibre: 0 }, units: [{ label: 'piece', grams: 120 }, { label: '100 g', grams: 100 }], aliases: ['grilled chicken', 'boiled chicken', 'chicken'] },
  { name: 'Chicken Thigh',     emoji: '🍗', per100: { kcal: 209, protein: 26, carbs: 0, fat: 11, fibre: 0 }, units: [{ label: 'piece', grams: 100 }] },
  { name: 'Fish (cooked)',     emoji: '🐟', per100: { kcal: 160, protein: 22, carbs: 0, fat: 7, fibre: 0 }, units: [{ label: 'fillet', grams: 120 }], aliases: ['grilled fish', 'rohu', 'salmon', 'tuna'] },
  { name: 'Prawns (cooked)',   emoji: '🦐', per100: { kcal: 99, protein: 24, carbs: 0.2, fat: 0.3, fibre: 0 }, units: [{ label: 'serving', grams: 100 }], aliases: ['shrimp', 'jhinga'] },
  { name: 'Mutton (cooked)',   emoji: '🍖', per100: { kcal: 250, protein: 25, carbs: 0, fat: 17, fibre: 0 }, units: [{ label: 'serving', grams: 120 }], aliases: ['lamb', 'goat meat'] },
  { name: 'Keema',             emoji: '🍖', per100: { kcal: 215, protein: 18, carbs: 3, fat: 14, fibre: 1 }, units: [{ label: 'serving', grams: 150 }], aliases: ['minced meat', 'kheema'] },

  // ───────────── Dairy & supplements ─────────────
  { name: 'Milk (full)',       emoji: '🥛', per100: { kcal: 62, protein: 3.2, carbs: 4.8, fat: 3.3, fibre: 0 }, units: [{ label: '200 ml', grams: 200 }, { label: '250 ml', grams: 250 }], aliases: ['whole milk', 'doodh'] },
  { name: 'Milk (toned)',      emoji: '🥛', per100: { kcal: 47, protein: 3.1, carbs: 4.7, fat: 1.5, fibre: 0 }, units: [{ label: '200 ml', grams: 200 }], aliases: ['skimmed milk', 'low fat milk', 'double toned'] },
  { name: 'Curd / Yogurt',     emoji: '🥛', per100: { kcal: 60, protein: 3.5, carbs: 4.7, fat: 3.3, fibre: 0 }, units: [{ label: 'bowl', grams: 150 }], aliases: ['dahi', 'yoghurt', 'plain yogurt'] },
  { name: 'Greek Yogurt',      emoji: '🥛', per100: { kcal: 97, protein: 10, carbs: 3.6, fat: 5, fibre: 0 }, units: [{ label: 'cup', grams: 170 }, { label: '100 g', grams: 100 }], aliases: ['greek yoghurt', 'hung curd', 'high protein yogurt'] },
  { name: 'Paneer',            emoji: '🧀', per100: { kcal: 265, protein: 18, carbs: 1.2, fat: 21, fibre: 0 }, units: [{ label: '50 g', grams: 50 }, { label: '100 g', grams: 100 }], aliases: ['cottage cheese', 'panir'] },
  { name: 'Cheese',            emoji: '🧀', per100: { kcal: 402, protein: 25, carbs: 1.3, fat: 33, fibre: 0 }, units: [{ label: 'slice', grams: 20 }, { label: 'cube', grams: 15 }], aliases: ['cheddar', 'amul cheese'] },
  { name: 'Butter',            emoji: '🧈', per100: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81, fibre: 0 }, units: [{ label: 'tsp', grams: 5 }, { label: 'tbsp', grams: 14 }] },
  { name: 'Ghee',              emoji: '🧈', per100: { kcal: 900, protein: 0, carbs: 0, fat: 100, fibre: 0 }, units: [{ label: 'tsp', grams: 5 }, { label: 'tbsp', grams: 14 }], aliases: ['clarified butter'] },
  { name: 'Lassi',             emoji: '🥤', per100: { kcal: 90, protein: 3, carbs: 12, fat: 3, fibre: 0 }, units: [{ label: 'glass', grams: 250 }], aliases: ['sweet lassi', 'chaas', 'buttermilk'] },
  { name: 'Whey Protein',      emoji: '💪', per100: { kcal: 375, protein: 75, carbs: 9, fat: 5, fibre: 1 }, units: [{ label: 'scoop', grams: 32 }, { label: '2 scoops', grams: 64 }], aliases: ['protein powder', 'protein shake', 'whey'] },
  { name: 'Mass Gainer',       emoji: '🏋️', per100: { kcal: 380, protein: 16, carbs: 70, fat: 3, fibre: 1 }, units: [{ label: 'scoop', grams: 75 }, { label: '2 scoops', grams: 150 }], aliases: ['gainer', 'weight gainer'] },
  { name: 'Peanut Butter',     emoji: '🥜', per100: { kcal: 588, protein: 25, carbs: 20, fat: 50, fibre: 6 }, units: [{ label: 'tbsp', grams: 16 }, { label: '2 tbsp', grams: 32 }], aliases: ['pb'] },

  // ───────────── Oats, cereals, breakfast global ─────────────
  { name: 'Oats (dry)',        emoji: '🥣', per100: { kcal: 389, protein: 16.9, carbs: 66, fat: 6.9, fibre: 10.6 }, units: [{ label: 'serving', grams: 40 }, { label: 'big bowl', grams: 60 }], aliases: ['oatmeal', 'rolled oats'] },
  { name: 'Cornflakes',        emoji: '🥣', per100: { kcal: 357, protein: 7, carbs: 84, fat: 0.4, fibre: 3 }, units: [{ label: 'bowl', grams: 40 }] },
  { name: 'Muesli',            emoji: '🥣', per100: { kcal: 360, protein: 10, carbs: 66, fat: 6, fibre: 8 }, units: [{ label: 'bowl', grams: 50 }], aliases: ['granola'] },
  { name: 'Pancake',           emoji: '🥞', per100: { kcal: 227, protein: 6, carbs: 28, fat: 10, fibre: 1 }, units: [{ label: 'pancake', grams: 75 }] },

  // ───────────── Fruits ─────────────
  { name: 'Banana',            emoji: '🍌', per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3, fibre: 2.6 }, units: [{ label: 'medium', grams: 118 }, { label: 'large', grams: 136 }], aliases: ['kela'] },
  { name: 'Apple',             emoji: '🍎', per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2, fibre: 2.4 }, units: [{ label: 'medium', grams: 180 }], aliases: ['seb'] },
  { name: 'Mango',             emoji: '🥭', per100: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4, fibre: 1.6 }, units: [{ label: 'medium', grams: 200 }], aliases: ['aam'] },
  { name: 'Orange',            emoji: '🍊', per100: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1, fibre: 2.4 }, units: [{ label: 'medium', grams: 130 }] },
  { name: 'Grapes',            emoji: '🍇', per100: { kcal: 69, protein: 0.7, carbs: 18, fat: 0.2, fibre: 0.9 }, units: [{ label: 'cup', grams: 100 }], aliases: ['angoor'] },
  { name: 'Papaya',            emoji: '🫐', per100: { kcal: 43, protein: 0.5, carbs: 11, fat: 0.3, fibre: 1.7 }, units: [{ label: 'cup', grams: 145 }] },
  { name: 'Watermelon',        emoji: '🍉', per100: { kcal: 30, protein: 0.6, carbs: 8, fat: 0.2, fibre: 0.4 }, units: [{ label: 'cup', grams: 152 }], aliases: ['tarbooz'] },
  { name: 'Pomegranate',       emoji: '🔴', per100: { kcal: 83, protein: 1.7, carbs: 19, fat: 1.2, fibre: 4 }, units: [{ label: 'cup', grams: 100 }], aliases: ['anar'] },
  { name: 'Guava',             emoji: '🟢', per100: { kcal: 68, protein: 2.6, carbs: 14, fat: 1, fibre: 5.4 }, units: [{ label: 'medium', grams: 100 }], aliases: ['amrood'] },
  { name: 'Dates',             emoji: '🟤', per100: { kcal: 277, protein: 1.8, carbs: 75, fat: 0.2, fibre: 7 }, units: [{ label: 'piece', grams: 24 }, { label: '3 dates', grams: 72 }], aliases: ['khajoor'] },

  // ───────────── Vegetables / salad ─────────────
  { name: 'Mixed Salad',       emoji: '🥗', per100: { kcal: 30, protein: 1.5, carbs: 5, fat: 0.3, fibre: 2 }, units: [{ label: 'bowl', grams: 150 }], aliases: ['green salad', 'salad'] },
  { name: 'Boiled Potato',     emoji: '🥔', per100: { kcal: 87, protein: 1.9, carbs: 20, fat: 0.1, fibre: 1.8 }, units: [{ label: 'medium', grams: 150 }], aliases: ['aloo'] },
  { name: 'Sweet Potato',      emoji: '🍠', per100: { kcal: 86, protein: 1.6, carbs: 20, fat: 0.1, fibre: 3 }, units: [{ label: 'medium', grams: 130 }], aliases: ['shakarkandi'] },
  { name: 'Broccoli',          emoji: '🥦', per100: { kcal: 34, protein: 2.8, carbs: 7, fat: 0.4, fibre: 2.6 }, units: [{ label: 'cup', grams: 90 }] },
  { name: 'Sweet Corn',        emoji: '🌽', per100: { kcal: 86, protein: 3.2, carbs: 19, fat: 1.2, fibre: 2.7 }, units: [{ label: 'cup', grams: 150 }], aliases: ['corn', 'makka'] },

  // ───────────── Nuts & seeds ─────────────
  { name: 'Almonds',           emoji: '🌰', per100: { kcal: 579, protein: 21, carbs: 22, fat: 49, fibre: 12 }, units: [{ label: 'handful', grams: 28 }, { label: '10 pcs', grams: 14 }], aliases: ['badam'] },
  { name: 'Peanuts',           emoji: '🥜', per100: { kcal: 567, protein: 26, carbs: 16, fat: 49, fibre: 8.5 }, units: [{ label: 'handful', grams: 30 }], aliases: ['groundnut', 'moongphali'] },
  { name: 'Cashews',           emoji: '🌰', per100: { kcal: 553, protein: 18, carbs: 30, fat: 44, fibre: 3.3 }, units: [{ label: 'handful', grams: 28 }], aliases: ['kaju'] },
  { name: 'Walnuts',           emoji: '🌰', per100: { kcal: 654, protein: 15, carbs: 14, fat: 65, fibre: 6.7 }, units: [{ label: 'handful', grams: 28 }], aliases: ['akhrot'] },
  { name: 'Chia Seeds',        emoji: '⚫', per100: { kcal: 486, protein: 17, carbs: 42, fat: 31, fibre: 34 }, units: [{ label: 'tbsp', grams: 12 }] },

  // ───────────── Global / fast food ─────────────
  { name: 'Pizza',             emoji: '🍕', per100: { kcal: 266, protein: 11, carbs: 33, fat: 10, fibre: 2.3 }, units: [{ label: 'slice', grams: 107 }, { label: '2 slices', grams: 214 }] },
  { name: 'Burger',            emoji: '🍔', per100: { kcal: 250, protein: 13, carbs: 27, fat: 11, fibre: 1.5 }, units: [{ label: 'burger', grams: 150 }], aliases: ['hamburger', 'veg burger', 'chicken burger'] },
  { name: 'French Fries',      emoji: '🍟', per100: { kcal: 312, protein: 3.4, carbs: 41, fat: 15, fibre: 3.8 }, units: [{ label: 'medium', grams: 117 }], aliases: ['fries', 'chips'] },
  { name: 'Pasta (cooked)',    emoji: '🍝', per100: { kcal: 158, protein: 6, carbs: 31, fat: 0.9, fibre: 1.8 }, units: [{ label: 'plate', grams: 200 }], aliases: ['white sauce pasta', 'red sauce pasta', 'macaroni'] },
  { name: 'Sandwich',          emoji: '🥪', per100: { kcal: 250, protein: 9, carbs: 30, fat: 10, fibre: 2.5 }, units: [{ label: 'sandwich', grams: 150 }], aliases: ['veg sandwich', 'grilled sandwich'] },
  { name: 'Spring Roll',       emoji: '🥢', per100: { kcal: 240, protein: 5, carbs: 27, fat: 12, fibre: 2 }, units: [{ label: 'roll', grams: 60 }] },
  { name: 'Momos',             emoji: '🥟', per100: { kcal: 180, protein: 7, carbs: 26, fat: 5, fibre: 1.5 }, units: [{ label: '6 pieces', grams: 180 }], aliases: ['dumpling', 'momo'] },
  { name: 'Shawarma',          emoji: '🌯', per100: { kcal: 220, protein: 12, carbs: 22, fat: 10, fibre: 2 }, units: [{ label: 'roll', grams: 250 }], aliases: ['wrap', 'kathi roll', 'frankie'] },

  // ───────────── Drinks ─────────────
  { name: 'Tea (with milk)',   emoji: '🍵', per100: { kcal: 40, protein: 1, carbs: 6, fat: 1.2, fibre: 0 }, units: [{ label: 'cup', grams: 150 }], aliases: ['chai', 'masala chai'] },
  { name: 'Coffee (with milk)', emoji: '☕', per100: { kcal: 45, protein: 1.2, carbs: 6, fat: 1.5, fibre: 0 }, units: [{ label: 'cup', grams: 150 }], aliases: ['latte', 'cappuccino'] },
  { name: 'Cola / Soft Drink', emoji: '🥤', per100: { kcal: 42, protein: 0, carbs: 11, fat: 0, fibre: 0 }, units: [{ label: 'can', grams: 330 }, { label: 'glass', grams: 250 }], aliases: ['coke', 'pepsi', 'soda', 'soft drink'] },
  { name: 'Orange Juice',      emoji: '🧃', per100: { kcal: 45, protein: 0.7, carbs: 10, fat: 0.2, fibre: 0.2 }, units: [{ label: 'glass', grams: 250 }], aliases: ['fruit juice', 'juice'] },
  { name: 'Smoothie',          emoji: '🥤', per100: { kcal: 90, protein: 3, carbs: 16, fat: 1.5, fibre: 1.5 }, units: [{ label: 'glass', grams: 300 }], aliases: ['banana shake', 'milkshake', 'shake'] },

  // ───────────── Misc / fats / sugar ─────────────
  { name: 'Olive Oil',         emoji: '🫒', per100: { kcal: 884, protein: 0, carbs: 0, fat: 100, fibre: 0 }, units: [{ label: 'tsp', grams: 5 }, { label: 'tbsp', grams: 14 }], aliases: ['cooking oil', 'oil'] },
  { name: 'Honey',             emoji: '🍯', per100: { kcal: 304, protein: 0.3, carbs: 82, fat: 0, fibre: 0.2 }, units: [{ label: 'tsp', grams: 7 }, { label: 'tbsp', grams: 21 }], aliases: ['shahad'] },
  { name: 'Sugar',             emoji: '🧂', per100: { kcal: 387, protein: 0, carbs: 100, fat: 0, fibre: 0 }, units: [{ label: 'tsp', grams: 4 }, { label: 'tbsp', grams: 12 }], aliases: ['chini'] },
  { name: 'Dark Chocolate',    emoji: '🍫', per100: { kcal: 546, protein: 5, carbs: 61, fat: 31, fibre: 7 }, units: [{ label: 'square', grams: 10 }, { label: 'bar', grams: 40 }], aliases: ['chocolate'] },
  { name: 'Biscuit',           emoji: '🍪', per100: { kcal: 480, protein: 7, carbs: 67, fat: 20, fibre: 2 }, units: [{ label: 'biscuit', grams: 12 }, { label: '4 pcs', grams: 48 }], aliases: ['cookie', 'parle g', 'marie'] },
];

// Home-screen one-tap chips: log a fixed portion instantly.
export const QUICK_ADD_CHIPS = [
  { label: '+200ml Milk', emoji: '🥛', food: 'Milk (full)',  grams: 200 },
  { label: '+2 Eggs',     emoji: '🥚', food: 'Egg (whole)',  grams: 100 },
  { label: '+1 Banana',   emoji: '🍌', food: 'Banana',       grams: 118 },
  { label: '+1 Scoop',    emoji: '💪', food: 'Whey Protein', grams: 32  },
];

// Manual-add quick template chips (names must exist in FOOD_DB).
export const QUICK_TEMPLATES = [
  'Chicken Breast', 'Rice (cooked)', 'Roti / Chapati', 'Egg (whole)', 'Milk (full)',
  'Banana', 'Oats (dry)', 'Paneer', 'Dal (cooked)', 'Curd / Yogurt', 'Whey Protein', 'Chicken Biryani',
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
  const q = norm(name);
  return FOOD_DB.find(f => norm(f.name) === q) || null;
}

// ── Fuzzy search ──────────────────────────────────────────────
// Forgives misspellings ("biriyani"→Biryani), partial words, and local names.
const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

// true if all chars of q appear in order within t (handles dropped/extra letters)
function isSubsequence(q, t) {
  let i = 0;
  for (let j = 0; j < t.length && i < q.length; j++) if (q[i] === t[j]) i++;
  return i === q.length;
}

// Best match score (0–100) of query against one food's name + aliases.
function scoreFood(q, food) {
  const targets = [norm(food.name), ...(food.aliases || []).map(norm)];
  let best = 0;
  const qWords = q.split(' ').filter(Boolean);
  for (const t of targets) {
    let s = 0;
    if (t === q) s = 100;
    else if (t.startsWith(q)) s = 90;
    else if (t.includes(q)) s = 78;
    else if (qWords.length && qWords.every(w => t.includes(w))) s = 70;
    else if (isSubsequence(q.replace(/ /g, ''), t.replace(/ /g, ''))) s = 60;
    else {
      // fuzzy: compare query against each word of the target
      for (const w of t.split(' ')) {
        const d = levenshtein(q, w);
        const ratio = 1 - d / Math.max(q.length, w.length);
        if (d <= 2 || ratio >= 0.72) s = Math.max(s, Math.round(50 * ratio));
      }
    }
    best = Math.max(best, s);
  }
  return best;
}

export function searchFoods(query, limit = 12) {
  const q = norm(query);
  if (!q) return FOOD_DB.slice(0, limit);
  return FOOD_DB
    .map(f => ({ f, s: scoreFood(q, f) }))
    .filter(x => x.s >= 30)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(x => x.f);
}

function round1(n) { return Math.round(n * 10) / 10; }
