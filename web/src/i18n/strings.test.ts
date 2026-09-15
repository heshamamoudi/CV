import strings from './strings.json';

describe('strings.json', () => {
  it('has every key in both languages, and is not empty', () => {
    const en = Object.keys(strings.en).sort();
    const ar = Object.keys(strings.ar).sort();
    expect(en.length).toBeGreaterThan(10);
    expect(ar).toEqual(en);
    for (const key of en) expect((strings.ar as Record<string, string>)[key].trim()).not.toBe('');
  });
});
