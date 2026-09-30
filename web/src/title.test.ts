import { pageTitle } from './title';
import type { HomeData, ProjectDto } from './types';

const home = { profile: { name: 'Changed profile name' }, siteTitle: 'Hesham Amoudi' } as HomeData;
const project = { title: 'Safety Management System' } as ProjectDto;

describe('pageTitle', () => {
  it('uses the fixed site title for every public route and language', () => {
    for (const kind of ['home', 'journey', 'projects', 'project', 'notfound'] as const) {
      expect(pageTitle(kind, 'en', home, project)).toBe('Hesham Amoudi');
      expect(pageTitle(kind, 'ar', home, project)).toBe('Hesham Amoudi');
    }
  });

  it('uses the fixed title when the server has no configured site title', () => {
    expect(pageTitle('home', 'en', null, null)).toBe('Hesham Amoudi');
    expect(pageTitle('project', 'ar', { ...home, siteTitle: '' }, null)).toBe('Hesham Amoudi');
  });
});
