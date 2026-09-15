import { twinPath } from './paths';

describe('twinPath', () => {
  it('swaps the language segment and keeps the rest', () => {
    expect(twinPath('/en/projects/kaia-external-website', 'en')).toBe('/ar/projects/kaia-external-website');
    expect(twinPath('/ar', 'ar')).toBe('/en');
    expect(twinPath('/ar/journey', 'ar')).toBe('/en/journey');
  });
});
