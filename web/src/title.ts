import { useEffect } from 'react';
import type { HomeData, Lang, PageData, ProjectDto } from './types';

/** Public routes share the portfolio's single site title. */
export function pageTitle(kind: PageData['kind'], lang: Lang, home: HomeData | null, project: ProjectDto | null): string {
  void kind;
  void lang;
  void project;
  return home?.siteTitle || 'Hesham Amoudi';
}

/** Keeps the tab title right on client-side navigation. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
