import { useEffect, useSyncExternalStore } from 'react';
import { adminStrings, type AdminLang, type AdminStringKey } from './strings';

const KEY = 'admin-lang';
const listeners = new Set<() => void>();

function stored(): AdminLang {
  try {
    return localStorage.getItem(KEY) === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en'; // private mode: the choice simply does not persist
  }
}

let current: AdminLang = stored();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setAdminLang(lang: AdminLang) {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* not persisted, still applied */
  }
  for (const listener of [...listeners]) listener();
}

/** The interface language. Which language's *content* is edited never changes: both are always on screen. */
export function useAdminLang() {
  const lang = useSyncExternalStore(subscribe, () => current, () => 'en' as AdminLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  return {
    lang,
    setLang: setAdminLang,
    t: (key: AdminStringKey) => adminStrings[lang][key],
  };
}
