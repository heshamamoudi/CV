import { useEffect, useState } from 'react';
import type { HomeData, Lang, PageData, ProjectDto } from './types';

export function readEmbedded(): PageData | null {
  const el = document.getElementById('page-data');
  return el?.textContent ? (JSON.parse(el.textContent) as PageData) : null;
}

const embedded = typeof document !== 'undefined' ? readEmbedded() : null;
const homeCache = new Map<Lang, HomeData>();
if (embedded?.home) homeCache.set(embedded.lang, embedded.home);

/** The server's embedded data first; the API on client-side navigation. */
export function useHome(lang: Lang): HomeData | null {
  const [home, setHome] = useState<HomeData | null>(homeCache.get(lang) ?? null);
  useEffect(() => {
    if (homeCache.has(lang)) { setHome(homeCache.get(lang)!); return; }
    let live = true;
    fetch(`/api/public/${lang}/home`).then(r => (r.ok ? r.json() : null)).then((data: HomeData | null) => {
      if (data) homeCache.set(lang, data);
      if (live) setHome(data);
    });
    return () => { live = false; };
  }, [lang]);
  return home;
}

export function useProject(lang: Lang, slug: string): ProjectDto | null | undefined {
  const initial = embedded?.project && embedded.lang === lang && embedded.project.slug === slug ? embedded.project : undefined;
  const [project, setProject] = useState<ProjectDto | null | undefined>(initial);
  useEffect(() => {
    if (initial) return;
    let live = true;
    fetch(`/api/public/${lang}/projects/${encodeURIComponent(slug)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((data: ProjectDto | null) => { if (live) setProject(data); });
    return () => { live = false; };
  }, [lang, slug, initial]);
  return project;
}
