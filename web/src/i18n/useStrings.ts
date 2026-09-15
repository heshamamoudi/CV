import strings from './strings.json';
import type { Lang } from '../types';

export type StringKey = keyof typeof strings.en;
export const useStrings = (lang: Lang) => (key: StringKey): string => strings[lang][key];
