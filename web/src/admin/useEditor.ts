import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './api';

export interface Editor<T> {
  value: T | null;
  /** Edit one part of the value; marks the screen dirty. */
  set: (change: Partial<T> | ((current: T) => T)) => void;
  dirty: boolean;
  reset: () => void;
  /** After a successful save (or a fresh load): this is now the saved state. */
  replace: (value: T) => void;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** One screen's editing state: what was loaded, what it is now, and whether that differs. */
export function useEditor<T>(loaded: T | null): Editor<T> {
  const [saved, setSaved] = useState<T | null>(loaded);
  const [value, setValue] = useState<T | null>(loaded);

  useEffect(() => {
    setSaved(loaded);
    setValue(loaded);
  }, [loaded]);

  const set = useCallback((change: Partial<T> | ((current: T) => T)) => {
    setValue(current => {
      if (current === null) return current;
      return typeof change === 'function' ? (change as (c: T) => T)(current) : { ...current, ...change };
    });
  }, []);

  const replace = useCallback((next: T) => {
    setSaved(next);
    setValue(next);
  }, []);

  return {
    value,
    set,
    dirty: value !== null && !same(value, saved),
    reset: useCallback(() => setValue(saved), [saved]),
    replace,
  };
}

/** Warns before losing edits - on a browser close, and on a link inside the admin app. */
export function useUnsavedGuard(dirty: boolean, message: string) {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (!dirty) return;
    const intercept = (event: MouseEvent) => {
      const link = (event.target as HTMLElement | null)?.closest?.('a[href^="/admin"]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      // eslint-disable-next-line no-alert -- the browser's own question is the one that can block navigation here
      if (!window.confirm(message)) event.preventDefault();
    };
    document.addEventListener('click', intercept, true);
    return () => document.removeEventListener('click', intercept, true);
  }, [dirty, message]);

  return dirtyRef;
}

/** The field-message lookup every screen hands to its inputs. */
export function fieldErrors(error: unknown): (field: string) => string | undefined {
  const problem = error instanceof ApiError ? error : null;
  return (field: string) => problem?.field(field);
}

/** What to show when the failure is not about one field. */
export function generalError(error: unknown, fallback: string): string | undefined {
  if (!error) return undefined;
  if (error instanceof ApiError) return Object.keys(error.errors).length > 0 ? undefined : error.message;
  return fallback;
}
