import type { Lang } from './types';

export const otherLang = (lang: Lang): Lang => (lang === 'ar' ? 'en' : 'ar');
export const twinPath = (path: string, lang: Lang): string => '/' + otherLang(lang) + path.slice(1 + lang.length);
export const isLang = (value: string | undefined): value is Lang => value === 'en' || value === 'ar';
