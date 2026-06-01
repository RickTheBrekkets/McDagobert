import type { PriceList } from './types.js';

// Default global menu, ported from the original public/price-list.json prototype.
// Snapshotted into each group at creation time so results stay reproducible.
export const defaultPriceList: PriceList = {
  items: {
    'Big Mac': 4.5,
    'Medium Fries': 2.5,
    'Medium Coke': 2.25,
    McChicken: 4.25,
    'Small Fries': 2.0,
    'Small Coke': 2.0,
  },
  combos: [
    {
      name: 'Big Mac Menu',
      items: ['Big Mac', 'Medium Fries', 'Medium Coke'],
      price: 8.5,
    },
    {
      name: 'McChicken Menu',
      items: ['McChicken', 'Medium Fries', 'Medium Coke'],
      price: 8.25,
    },
    {
      name: 'Small Menu',
      items: ['Big Mac', 'Small Fries', 'Small Coke'],
      price: 7.0,
    },
  ],
};
