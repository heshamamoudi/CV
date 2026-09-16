import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { api } from '../api';
import { useScreenText } from '../useScreenText';
import type { MediaView } from '../types';
import '../screens/media.css';

export interface MediaPickerProps {
  label: string;
  /** The chosen image's id, or null for none. */
  value: string | null;
  onChange: (id: string | null) => void;
}

const labels = {
  en: {
    heading: 'Choose an image',
    empty: 'There are no images yet. Upload one on the Media screen.',
    failed: 'The library could not be loaded.',
  },
  ar: {
    heading: 'اختيار صورة',
    empty: 'لا توجد صور بعد. ارفع واحدة من شاشة الوسائط.',
    failed: 'تعذّر تحميل مكتبة الصور.',
  },
};

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * One image on one field. The picker owns nothing: it reports an id, or null,
 * and the screen decides what that means.
 */
export function MediaPicker({ label, value, onChange }: MediaPickerProps) {
  const { lang, t, s } = useScreenText(labels);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaView[] | null>(null);
  const [failed, setFailed] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  const read = useCallback(async (loud: boolean) => {
    try {
      const list = await api<MediaView[]>('/api/admin/media');
      setItems(list);
      setFailed(false);
    } catch {
      // Resolving the thumbnail is a nicety; only the dialog says so out loud.
      if (loud) setFailed(true);
    }
  }, []);

  // Enough of the library to show which image this field is pointing at.
  useEffect(() => {
    if (!value || items !== null) return;
    void read(false);
  }, [value, items, read]);

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    void read(true);
    dialog.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab' || !dialog.current) return;
      // A dialog that lets Tab wander onto the page behind it is not a dialog.
      const stops = [...dialog.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, read, close]);

  const chosen = (items ?? []).find(item => item.id === value) ?? null;
  const name = (item: MediaView) => item.alt[lang] || item.alt.en || item.alt.ar || item.fileName;

  return (
    <div className="admin-picker" role="group" aria-labelledby={`${id}-label`}>
      <span className="admin-label" id={`${id}-label`}>
        {label}
      </span>

      {chosen ? (
        <img src={chosen.previewUrl} alt="" width={chosen.width} height={chosen.height} />
      ) : null}
      <span>{value ? (chosen ? name(chosen) : value) : t('field.none')}</span>

      <button type="button" ref={trigger} aria-describedby={`${id}-label`} onClick={() => setOpen(true)}>
        {t('action.choose')}
      </button>
      <button type="button" aria-describedby={`${id}-label`} disabled={!value} onClick={() => onChange(null)}>
        {t('action.clear')}
      </button>

      {open ? (
        <div
          className="admin-modal"
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className="admin-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-heading`} tabIndex={-1} ref={dialog}>
            <h2 id={`${id}-heading`}>{s('heading')}</h2>

            {failed ? (
              <p className="admin-error" role="alert">
                {s('failed')}
              </p>
            ) : null}
            {items === null && !failed ? <p>{t('state.loading')}</p> : null}
            {items !== null && items.length === 0 ? <p>{s('empty')}</p> : null}

            <ul className="admin-picker-choices">
              {(items ?? []).map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={item.id === value}
                    onClick={() => {
                      onChange(item.id);
                      close();
                    }}
                  >
                    <img src={item.previewUrl} alt="" width={item.width} height={item.height} />
                    <span>{name(item)}</span>
                  </button>
                </li>
              ))}
            </ul>

            <button type="button" onClick={close}>
              {t('action.close')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
