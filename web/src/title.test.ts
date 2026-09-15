import { pageTitle } from './title';
import type { HomeData, ProjectDto } from './types';

const home = { profile: { name: 'Hesham Amoudi', headline: 'Lead Application Development' } } as HomeData;
const project = { title: 'Safety Management System' } as ProjectDto;

describe('pageTitle', () => {
  // The same formulas the server renderer uses (PageRenderer.Render), so the
  // tab title does not change or go stale when React takes over navigation.
  it('matches the server title for every page kind', () => {
    expect(pageTitle('home', 'en', home, null)).toBe('Hesham Amoudi — Lead Application Development');
    expect(pageTitle('journey', 'en', home, null)).toBe('Journey — Hesham Amoudi');
    expect(pageTitle('projects', 'ar', home, null)).toBe('المشاريع — Hesham Amoudi');
    expect(pageTitle('project', 'en', home, project)).toBe('Safety Management System — Hesham Amoudi');
    expect(pageTitle('notfound', 'ar', home, null)).toBe('الصفحة غير موجودة — Hesham Amoudi');
  });
});
