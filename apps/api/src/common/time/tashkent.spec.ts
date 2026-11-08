import { localDateKey, localMidnight } from './tashkent';

describe('Tashkent day boundaries', () => {
  it('starts the day at 19:00 UTC of the previous date', () => {
    const noon = new Date('2026-10-04T07:00:00Z'); // 12:00 in Tashkent
    expect(localMidnight(noon).toISOString()).toBe('2026-10-03T19:00:00.000Z');
    expect(localMidnight(noon, 1).toISOString()).toBe(
      '2026-10-04T19:00:00.000Z',
    );
  });

  it('counts 01:00 Tashkent as the new day although UTC is still the old one', () => {
    const lateUtc = new Date('2026-10-03T20:00:00Z'); // 01:00 on 4 Oct in Tashkent
    expect(localDateKey(lateUtc)).toBe('2026-10-04');
    expect(localMidnight(lateUtc).toISOString()).toBe(
      '2026-10-03T19:00:00.000Z',
    );
  });

  it('puts an 18:00 wedding on its own calendar day', () => {
    expect(localDateKey(new Date('2026-10-04T13:00:00Z'))).toBe('2026-10-04');
  });
});
