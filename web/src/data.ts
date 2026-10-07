import { useCallback, useEffect, useState } from 'react';
import type { HomeData, Lang, PageData, ProjectDto } from './types';

export function readEmbedded(): PageData | null {
  const el = document.getElementById('page-data');
  return el?.textContent ? (JSON.parse(el.textContent) as PageData) : null;
}

// The admin shell page carries no content, so the public caches ignore it.
const page = typeof document !== 'undefined' ? readEmbedded() : null;
const embedded = page && page.kind !== 'admin' ? page : null;
const homeCache = new Map<Lang, HomeData>();
const projectCache = new Map<string, ProjectDto>();
const cacheUpdatedAt = new Map<string, number>();
const CACHE_MAX_AGE = 30_000;
const cacheKey = (lang: Lang, slug = '') => `${lang}:${slug}`;
if (embedded?.home) {
  homeCache.set(embedded.lang, embedded.home);
  cacheUpdatedAt.set(cacheKey(embedded.lang), Date.now());
}
if (embedded?.project) {
  projectCache.set(cacheKey(embedded.lang, embedded.project.slug), embedded.project);
  cacheUpdatedAt.set(cacheKey(embedded.lang, embedded.project.slug), Date.now());
}

/** The server's embedded data first; the API on client-side navigation. */
export function useHome(lang: Lang): HomeData | null {
  const [home, setHome] = useState<HomeData | null>(homeCache.get(lang) ?? null);
  const refresh = useCallback(async (force = false) => {
    const key = cacheKey(lang);
    if (!force && Date.now() - (cacheUpdatedAt.get(key) ?? 0) < CACHE_MAX_AGE) return;
    try {
      const reply = await fetch(`/api/public/${lang}/home`, { cache: 'no-store' });
      if (!reply.ok) return;
      const data = (await reply.json()) as HomeData;
      homeCache.set(lang, data);
      cacheUpdatedAt.set(key, Date.now());
      setHome(data);
    } catch {
      // Keep the last rendered content if the connection is unavailable.
    }
  }, [lang]);

  useEffect(() => {
    setHome(homeCache.get(lang) ?? null);
    const update = () => { void refresh(); };
    const refreshNow = () => { if (document.visibilityState === 'visible') void refresh(true); };
    update();
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshNow);
    const timer = window.setInterval(update, CACHE_MAX_AGE);
    return () => {
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshNow);
      window.clearInterval(timer);
    };
  }, [lang, refresh]);
  return home;
}

export function useProject(lang: Lang, slug: string): ProjectDto | null | undefined {
  const key = cacheKey(lang, slug);
  const [project, setProject] = useState<ProjectDto | null | undefined>(projectCache.get(key));
  const refresh = useCallback(async (force = false) => {
    if (!force && Date.now() - (cacheUpdatedAt.get(key) ?? 0) < CACHE_MAX_AGE) return;
    try {
      const reply = await fetch(`/api/public/${lang}/projects/${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (!reply.ok) {
        if (reply.status === 404) {
          projectCache.delete(key);
          cacheUpdatedAt.set(key, Date.now());
          setProject(null);
        }
        return;
      }
      const data = (await reply.json()) as ProjectDto;
      projectCache.set(key, data);
      cacheUpdatedAt.set(key, Date.now());
      setProject(data);
    } catch {
      // Leave the last successful project on screen while offline.
    }
  }, [key, lang, slug]);

  useEffect(() => {
    setProject(projectCache.get(key));
    const update = () => { void refresh(); };
    const refreshNow = () => { if (document.visibilityState === 'visible') void refresh(true); };
    update();
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshNow);
    const timer = window.setInterval(update, CACHE_MAX_AGE);
    return () => {
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshNow);
      window.clearInterval(timer);
    };
  }, [key, refresh]);
  return project;
}
