import { useAdminLang } from './useAdminLang';
import type { AdminLang } from './strings';

/**
 * A screen's own labels, kept in the screen's file. Shared words (Save, Delete,
 * English, Arabic…) live in strings.ts; anything only one screen says lives
 * with that screen, so screens can be worked on without colliding.
 */
export function useScreenText<T extends Record<string, string>>(labels: Record<AdminLang, T>) {
  const { lang, t } = useAdminLang();
  return { lang, t, s: (key: keyof T) => labels[lang][key] };
}
