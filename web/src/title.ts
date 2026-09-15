import { useEffect } from 'react';
import strings from './i18n/strings.json';
import type { HomeData, Lang, PageData, ProjectDto } from './types';

/** Mirrors PageRenderer.Render's titles exactly. */
export function pageTitle(kind: PageData['kind'], lang: Lang, home: HomeData | null, project: ProjectDto | null): string {
  const name = home?.profile.name ?? '';
  switch (kind) {
    case 'home': return `${name} — ${home?.profile.headline ?? ''}`;
    case 'journey': return `${strings[lang]['page.journey']} — ${name}`;
    case 'projects': return `${strings[lang]['page.projects']} — ${name}`;
    case 'project': return `${project?.title ?? ''} — ${name}`;
    default: return `${strings[lang]['notFound.title']} — ${name}`;
  }
}

/** Keeps the tab title right on client-side navigation. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
