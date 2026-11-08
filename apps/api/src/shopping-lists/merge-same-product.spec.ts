import { mergeSameProduct } from './shopping-lists.service';

describe('mergeSameProduct', () => {
  it('adds the salad and first-dish tomatoes into one line', () => {
    expect(
      mergeSameProduct([
        { name: 'Pomidor', quantity: 2, unit: 'KG' },
        { name: 'Piyoz', quantity: 1, unit: 'KG' },
        { name: ' pomidor', quantity: 1, unit: 'KG' },
      ]),
    ).toEqual([
      { name: 'Pomidor', quantity: 3, unit: 'KG' },
      { name: 'Piyoz', quantity: 1, unit: 'KG' },
    ]);
  });

  it('keeps different units apart and avoids float drift', () => {
    expect(
      mergeSameProduct([
        { name: 'Tuxum', quantity: 0.1, unit: 'KG' },
        { name: 'Tuxum', quantity: 0.2, unit: 'KG' },
        { name: 'Tuxum', quantity: 30, unit: 'DONA' },
      ]),
    ).toEqual([
      { name: 'Tuxum', quantity: 0.3, unit: 'KG' },
      { name: 'Tuxum', quantity: 30, unit: 'DONA' },
    ]);
  });
});
