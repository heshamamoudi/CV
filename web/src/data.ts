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
const notFoundProjects = new Set<string>();
const cacheUpdatedAt = new Map<string, number>();
const cacheRequestVersions = new Map<string, number>();
const cacheCommittedVersions = new Map<string, number>();
const cacheSubscribers = new Map<string, Set<() => void>>();
const CACHE_MAX_AGE = 30_000;
const cacheKey = (lang: Lang, slug = '') => `${lang}:${slug}`;
const beginCacheRequest = (key: string) => {
  const next = (cacheRequestVersions.get(key) ?? 0) + 1;
  cacheRequestVersions.set(key, next);
  return next;
};
const subscribeToCache = (key: string, listener: () => void) => {
  let listeners = cacheSubscribers.get(key);
  if (!listeners) cacheSubscribers.set(key, listeners = new Set());
  listeners.add(listener);
  return () => {
    listeners?.delete(listener);
    if (listeners?.size === 0) cacheSubscribers.delete(key);
  };
};
const notifyCacheSubscribers = (key: string) => {
  for (const listener of cacheSubscribers.get(key) ?? []) listener();
};
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
  const refresh = useCallback(async (force = false, signal?: AbortSignal) => {
    const key = cacheKey(lang);
    if (!force && Date.now() - (cacheUpdatedAt.get(key) ?? 0) < CACHE_MAX_AGE) {
      setHome(homeCache.get(lang) ?? null);
      return;
    }
    const currentRequest = beginCacheRequest(key);
    try {
      const reply = await fetch(`/api/public/${lang}/home`, { cache: 'no-store', signal });
      if (!reply.ok) return;
      const data = (await reply.json()) as HomeData;
      if (signal?.aborted || currentRequest < (cacheCommittedVersions.get(key) ?? 0)) return;
      cacheCommittedVersions.set(key, currentRequest);
      homeCache.set(lang, data);
      cacheUpdatedAt.set(key, Date.now());
      notifyCacheSubscribers(key);
    } catch {
      // Keep the last rendered content if the connection is unavailable.
    }
  }, [lang]);

  useEffect(() => {
    setHome(homeCache.get(lang) ?? null);
    const unsubscribe = subscribeToCache(cacheKey(lang), () => setHome(homeCache.get(lang) ?? null));
    const controller = new AbortController();
    const update = () => { void refresh(false, controller.signal); };
    const refreshNow = () => { if (document.visibilityState === 'visible') void refresh(true, controller.signal); };
    update();
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshNow);
    const timer = window.setInterval(update, CACHE_MAX_AGE);
    return () => {
      controller.abort();
      unsubscribe();
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshNow);
      window.clearInterval(timer);
    };
  }, [lang, refresh]);
  return home;
}

export function useProject(lang: Lang, slug: string): ProjectDto | null | undefined {
  const key = cacheKey(lang, slug);
  const [project, setProject] = useState<ProjectDto | null | undefined>(
    projectCache.get(key) ?? (notFoundProjects.has(key) ? null : undefined),
  );
  const refresh = useCallback(async (force = false, signal?: AbortSignal) => {
    if (!force && Date.now() - (cacheUpdatedAt.get(key) ?? 0) < CACHE_MAX_AGE) {
      setProject(projectCache.get(key) ?? (notFoundProjects.has(key) ? null : undefined));
      return;
    }
    const currentRequest = beginCacheRequest(key);
    try {
      const reply = await fetch(`/api/public/${lang}/projects/${encodeURIComponent(slug)}`, { cache: 'no-store', signal });
      if (!reply.ok) {
        if (reply.status === 404) {
          if (signal?.aborted || currentRequest < (cacheCommittedVersions.get(key) ?? 0)) return;
          cacheCommittedVersions.set(key, currentRequest);
          projectCache.delete(key);
          notFoundProjects.add(key);
          cacheUpdatedAt.set(key, Date.now());
          notifyCacheSubscribers(key);
        }
        return;
      }
      const data = (await reply.json()) as ProjectDto;
      if (signal?.aborted || currentRequest < (cacheCommittedVersions.get(key) ?? 0)) return;
      cacheCommittedVersions.set(key, currentRequest);
      projectCache.set(key, data);
      notFoundProjects.delete(key);
      cacheUpdatedAt.set(key, Date.now());
      notifyCacheSubscribers(key);
    } catch {
      // Leave the last successful project on screen while offline.
    }
  }, [key, lang, slug]);

  useEffect(() => {
    setProject(projectCache.get(key) ?? (notFoundProjects.has(key) ? null : undefined));
    const unsubscribe = subscribeToCache(key, () =>
      setProject(projectCache.get(key) ?? (notFoundProjects.has(key) ? null : undefined)),
    );
    const controller = new AbortController();
    const update = () => { void refresh(false, controller.signal); };
    const refreshNow = () => { if (document.visibilityState === 'visible') void refresh(true, controller.signal); };
    update();
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshNow);
    const timer = window.setInterval(update, CACHE_MAX_AGE);
    return () => {
      controller.abort();
      unsubscribe();
      window.removeEventListener('focus', refreshNow);
      document.removeEventListener('visibilitychange', refreshNow);
      window.clearInterval(timer);
    };
  }, [key, refresh]);
  return project;
}
