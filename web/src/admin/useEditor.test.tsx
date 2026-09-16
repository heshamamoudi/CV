import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ApiError } from './api';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from './useEditor';

interface Draft {
  headline: { en: string; ar: string };
  email: string;
}

const loaded: Draft = { headline: { en: 'Lead', ar: 'قائد' }, email: 'owner@example.com' };

describe('the editing state of a screen', () => {
  it('is clean until something actually changes', () => {
    const { result } = renderHook(() => useEditor<Draft>(loaded));
    expect(result.current.dirty).toBe(false);

    act(() => result.current.set({ email: 'someone@else.com' }));
    expect(result.current.dirty).toBe(true);
    expect(result.current.value?.email).toBe('someone@else.com');

    act(() => result.current.set({ email: 'owner@example.com' }));
    expect(result.current.dirty).toBe(false);
  });

  it('puts an edit back', () => {
    const { result } = renderHook(() => useEditor<Draft>(loaded));

    act(() => result.current.set(current => ({ ...current, headline: { en: 'Changed', ar: current.headline.ar } })));
    act(() => result.current.reset());

    expect(result.current.value).toEqual(loaded);
    expect(result.current.dirty).toBe(false);
  });

  it('treats what the server accepted as the new saved state', () => {
    const { result } = renderHook(() => useEditor<Draft>(loaded));
    const next = { ...loaded, email: 'new@example.com' };

    act(() => result.current.set({ email: 'new@example.com' }));
    act(() => result.current.replace(next));

    expect(result.current.dirty).toBe(false);
    expect(result.current.value).toEqual(next);
  });
});

describe('the unsaved-changes guard', () => {
  it('watches the window only while there is something to lose', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = renderHook(({ dirty }) => useUnsavedGuard(dirty, 'Leave anyway?'), { initialProps: { dirty: false } });
    expect(add).not.toHaveBeenCalledWith('beforeunload', expect.anything());

    rerender({ dirty: true });
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    unmount();
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    add.mockRestore();
    remove.mockRestore();
  });

  it('asks before following an admin link, and lets the answer decide', () => {
    renderHook(() => useUnsavedGuard(true, 'Leave anyway?'));
    const link = document.createElement('a');
    link.href = '/admin/journey';
    document.body.append(link);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const blocked = link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(confirm).toHaveBeenCalledWith('Leave anyway?');
    expect(blocked).toBe(false);

    confirm.mockReturnValue(true);
    const allowed = link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(allowed).toBe(true);

    confirm.mockRestore();
    link.remove();
  });
});

describe('reading a failure', () => {
  it('routes field messages to fields and everything else to the bar', () => {
    const validation = new ApiError(400, 'One or more validation errors occurred.', { 'headline.ar': ['at most 200 characters'] });
    const outage = new ApiError(502, 'Request failed (502)');

    expect(fieldErrors(validation)('headline.ar')).toBe('at most 200 characters');
    expect(generalError(validation, 'Something went wrong.')).toBeUndefined();
    expect(generalError(outage, 'Something went wrong.')).toBe('Request failed (502)');
    expect(generalError(new TypeError('offline'), 'Something went wrong.')).toBe('Something went wrong.');
    expect(generalError(null, 'Something went wrong.')).toBeUndefined();
  });
});
