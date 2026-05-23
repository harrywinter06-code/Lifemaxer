import type { Meal, Targets } from './types'

// Bad-cook, packable, ~£60/wk. See SPEC §6.
export const MEALS: Meal[] = [
  {
    mealId: 'breakfast',
    slot: 'breakfast',
    name: 'Overnight Oats',
    items: [
      '100 g oats',
      '400 ml whole milk',
      '1 scoop whey',
      '1 tbsp peanut butter',
      '1 banana',
    ],
    kcal: 760, protein: 48, fat: 26, carbs: 90,
    packed: true,
  },
  {
    mealId: 'mid-morning',
    slot: 'mid-morning',
    name: 'Peanuts + Banana',
    items: ['50 g peanuts', '1 banana'],
    kcal: 430, protein: 14, fat: 28, carbs: 32,
    packed: true,
  },
  {
    mealId: 'lunch',
    slot: 'lunch',
    name: 'Chicken & Cheese Wraps',
    items: [
      '2 wholemeal wraps',
      '150 g cooked chicken',
      '30 g cheese',
      '1 tbsp mayo',
      'Handful spinach',
    ],
    kcal: 720, protein: 52, fat: 32, carbs: 60,
    packed: true,
  },
  {
    mealId: 'afternoon',
    slot: 'afternoon',
    name: 'Greek Yogurt + Granola',
    items: ['200 g Greek yogurt', '50 g granola', '1 tbsp honey'],
    kcal: 430, protein: 20, fat: 10, carbs: 60,
    packed: true,
  },
  {
    mealId: 'dinner',
    slot: 'dinner',
    name: 'One-Pan Beef Pasta',
    items: [
      '125 g pasta (dry)',
      '150 g 5% beef mince',
      '1 jar tomato sauce',
      '30 g cheese',
    ],
    kcal: 880, protein: 52, fat: 22, carbs: 110,
    packed: false,
  },
  {
    mealId: 'pre-bed',
    slot: 'pre-bed',
    name: 'Cottage Cheese',
    items: ['250 g cottage cheese', '1 tbsp honey'],
    kcal: 230, protein: 28, fat: 4, carbs: 22,
    packed: false,
  },
]

export const DEFAULT_TARGETS: Targets = {
  kcal: 3400,
  protein: 150,
  fat: 95,
  carbs: 490,
}

export function mealsTotal(meals: Meal[]): Targets {
  return meals.reduce(
    (acc, m) => ({
      kcal: acc.kcal + m.kcal,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 },
  )
}
