import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { api, ApiError } from '../api';
import { fieldErrors } from '../useEditor';
import { useScreenText } from '../useScreenText';
import { Confirm } from '../components/Confirm';
import { LocalizedField } from '../components/LocalizedField';
import { ResizeError, resizeForUpload, type ResizeErrorCode, type ResizedUpload } from '../resize';
import type { LocalizedText, MediaView } from '../types';
import './media.css';

const labels = {
  en: {
    title: 'Media',
    how: 'Every image is resized here, in your browser, to 640, 1280 and 1920 pixels wide before it is sent. Nothing over 25 MB.',
    choose: 'Choose images',
    drop: 'or drop them here',
    dropping: 'Let go to upload',
    clearFinished: 'Clear finished',
    stepWaiting: 'Waiting',
    stepResizing: 'Resizing',
    stepUploading: 'Uploading',
    stepDone: 'Uploaded',
    stepFailed: 'Not uploaded',
    empty: 'No images yet. Upload one above.',
    alt: 'Alt text',
    altHint: 'What the picture shows, for someone who cannot see it. Empty is fine for decoration.',
    widths: 'Widths',
    size: 'Original size',
    deleteQuestion: 'Delete “{name}”? It cannot be brought back.',
    inUse: 'This image is in use. Take it off the profile, project or SEO page that uses it, then delete it.',
    notAnImage: 'That is not an image. Pick a JPEG, PNG or WebP picture.',
    tooLarge: 'That image is over 25 MB. Export a smaller copy and try again.',
    unreadable: 'That image could not be read. It may be damaged, or in a format this browser cannot open.',
    noCanvas: 'This browser could not resize the image.',
    stillTooBig: 'The {width} pixel copy is still over 3 MB even at a lower quality. Try a less detailed image.',
  },
  ar: {
    title: 'الوسائط',
    how: 'يُعاد تحجيم كل صورة هنا، في متصفحك، إلى عرض 640 و1280 و1920 بكسل قبل إرسالها. لا شيء أكبر من 25 ميغابايت.',
    choose: 'اختيار الصور',
    drop: 'أو أفلتها هنا',
    dropping: 'أفلت للرفع',
    clearFinished: 'إخفاء المنتهية',
    stepWaiting: 'في الانتظار',
    stepResizing: 'جارٍ تغيير الحجم',
    stepUploading: 'جارٍ الرفع',
    stepDone: 'تم الرفع',
    stepFailed: 'لم يتم الرفع',
    empty: 'لا توجد صور بعد. ارفع واحدة من الأعلى.',
    alt: 'النص البديل',
    altHint: 'ما تُظهره الصورة، لمن لا يستطيع رؤيتها. يمكن تركه فارغاً للصور الزخرفية.',
    widths: 'العروض',
    size: 'الحجم الأصلي',
    deleteQuestion: 'حذف «{name}»؟ لا يمكن استرجاعها.',
    inUse: 'هذه الصورة مستخدمة. أزلها من الملف الشخصي أو المشروع أو صفحة تهيئة محركات البحث التي تستخدمها، ثم احذفها.',
    notAnImage: 'هذا ليس ملف صورة. اختر صورة JPEG أو PNG أو WebP.',
    tooLarge: 'حجم الصورة يتجاوز 25 ميغابايت. صدّر نسخة أصغر وحاول مجدداً.',
    unreadable: 'تعذّرت قراءة الصورة. قد تكون تالفة، أو بصيغة لا يفتحها هذا المتصفح.',
    noCanvas: 'تعذّر على هذا المتصفح تغيير حجم الصورة.',
    stillTooBig: 'نسخة {width} بكسل ما زالت أكبر من 3 ميغابايت حتى بجودة أقل. جرّب صورة أقل تفصيلاً.',
  },
};

type Step = 'waiting' | 'resizing' | 'uploading' | 'done' | 'failed';

/** Why something did not work - kept as a reason, not a sentence, so switching the interface language re-says it. */
type Trouble =
  | { kind: 'resize'; code: ResizeErrorCode; width?: number }
  | { kind: 'in-use' }
  | { kind: 'said'; text: string }
  | { kind: 'generic' };

interface Upload {
  key: number;
  name: string;
  step: Step;
  progress: number;
  trouble?: Trouble;
}

/** One image's own state: saving its alt text, and what went wrong if it did. */
interface Note {
  busy?: boolean;
  saved?: boolean;
  trouble?: Trouble;
  error?: unknown;
}

function troubleOf(error: unknown): Trouble {
  if (error instanceof ResizeError) return { kind: 'resize', code: error.code, width: error.width };
  if (error instanceof ApiError) {
    // The server's only 409 here is "in use", and that needs saying in the owner's words.
    if (error.status === 409) return { kind: 'in-use' };
    if (Object.keys(error.errors).length > 0) return { kind: 'generic' };
    return { kind: 'said', text: error.message };
  }
  return { kind: 'generic' };
}

/** Exactly what MediaAdmin.cs reads out of the form, and nothing it does not. */
function uploadForm(file: File, resized: ResizedUpload): FormData {
  const form = new FormData();
  form.append('fileName', file.name);
  form.append('width', String(resized.width));
  form.append('height', String(resized.height));
  // Alt text is written afterwards, against the image that now has an id.
  form.append('altEn', '');
  form.append('altAr', '');

  const extension = resized.type === 'image/jpeg' ? 'jpg' : 'webp';
  const stem = file.name.replace(/\.[^.]+$/, '') || 'image';
  for (const rendition of resized.renditions) {
    form.append(`w${rendition.width}`, rendition.blob, `${stem}-${rendition.width}.${extension}`);
  }
  return form;
}

export function MediaScreen() {
  const { lang, t, s } = useScreenText(labels);
  const [items, setItems] = useState<MediaView[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [drafts, setDrafts] = useState<Record<string, LocalizedText>>({});
  const [notes, setNotes] = useState<Record<string, Note>>({});
  const [dropping, setDropping] = useState(false);

  // Uploads run one after another: resizing three renditions of several large
  // photos at once is how a tab runs out of memory.
  const queue = useRef<Promise<void>>(Promise.resolve());
  const keys = useRef(0);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      setItems(await api<MediaView[]>('/api/admin/media'));
    } catch {
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const note = (id: string, change: Note) => setNotes(all => ({ ...all, [id]: { ...all[id], ...change } }));

  const step = (key: number, change: Partial<Upload>) =>
    setUploads(all => all.map(upload => (upload.key === key ? { ...upload, ...change } : upload)));

  const send = async (key: number, file: File) => {
    try {
      step(key, { step: 'resizing', progress: 0.2 });
      const resized = await resizeForUpload(file);
      step(key, { step: 'uploading', progress: 0.6 });
      const created = await api<MediaView>('/api/admin/media', { form: uploadForm(file, resized) });
      setItems(all => [created, ...(all ?? [])]);
      step(key, { step: 'done', progress: 1 });
    } catch (error) {
      step(key, { step: 'failed', progress: 1, trouble: troubleOf(error) });
    }
  };

  const accept = (files: File[]) => {
    if (files.length === 0) return;
    const started = files.map<Upload>(file => ({ key: ++keys.current, name: file.name, step: 'waiting', progress: 0.05 }));
    setUploads(all => [...all, ...started]);
    for (const [index, file] of files.entries()) {
      const key = started[index].key;
      queue.current = queue.current.then(() => send(key, file));
    }
  };

  const saveAlt = async (item: MediaView) => {
    const alt = drafts[item.id] ?? item.alt;
    note(item.id, { busy: true, saved: false, trouble: undefined, error: undefined });
    try {
      await api<void>(`/api/admin/media/${item.id}`, { method: 'PUT', body: alt });
      setItems(all => (all ?? []).map(m => (m.id === item.id ? { ...m, alt } : m)));
      setDrafts(all => {
        const next = { ...all };
        delete next[item.id];
        return next;
      });
      note(item.id, { busy: false, saved: true });
    } catch (error) {
      note(item.id, { busy: false, error, trouble: troubleOf(error) });
    }
  };

  const remove = async (item: MediaView) => {
    note(item.id, { busy: true, saved: false, trouble: undefined });
    try {
      await api<void>(`/api/admin/media/${item.id}`, { method: 'DELETE' });
      setItems(all => (all ?? []).filter(m => m.id !== item.id));
    } catch (error) {
      note(item.id, { busy: false, trouble: troubleOf(error) });
    }
  };

  const stepText = (value: Step): string => {
    if (value === 'waiting') return s('stepWaiting');
    if (value === 'resizing') return s('stepResizing');
    if (value === 'uploading') return s('stepUploading');
    if (value === 'done') return s('stepDone');
    return s('stepFailed');
  };

  const say = (trouble: Trouble): string => {
    switch (trouble.kind) {
      case 'in-use':
        return s('inUse');
      case 'said':
        return trouble.text;
      case 'generic':
        return t('error.generic');
      case 'resize':
        switch (trouble.code) {
          case 'not-an-image':
            return s('notAnImage');
          case 'too-large':
            return s('tooLarge');
          case 'unreadable':
            return s('unreadable');
          case 'no-canvas':
            return s('noCanvas');
          case 'rendition-too-large':
            return s('stillTooBig').replace('{width}', String(trouble.width ?? ''));
        }
    }
  };

  return (
    <section>
      <h1>{s('title')}</h1>
      <p className="admin-hint">{s('how')}</p>

      <div
        className={dropping ? 'admin-drop admin-drop-over' : 'admin-drop'}
        onDragOver={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDropping(true);
        }}
        onDragLeave={() => setDropping(false)}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDropping(false);
          accept(Array.from(event.dataTransfer?.files ?? []));
        }}
      >
        <label htmlFor="media-upload">{s('choose')}</label>
        <input
          id="media-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={event => {
            accept(Array.from(event.target.files ?? []));
            // So the same file can be picked twice in a row.
            event.target.value = '';
          }}
        />
        <span className="admin-hint">{dropping ? s('dropping') : s('drop')}</span>
      </div>

      {uploads.length > 0 ? (
        <div className="admin-uploads">
          <ul aria-live="polite">
            {uploads.map(upload => (
              <li key={upload.key}>
                <span className="admin-upload-name">{upload.name}</span>
                <progress max={1} value={upload.progress} aria-label={`${stepText(upload.step)}: ${upload.name}`} />
                <span>{stepText(upload.step)}</span>
                {upload.trouble ? <span className="admin-error">{say(upload.trouble)}</span> : null}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setUploads(all => all.filter(u => u.step !== 'done' && u.step !== 'failed'))}>
            {s('clearFinished')}
          </button>
        </div>
      ) : null}

      {loadFailed ? (
        <p className="admin-error" role="alert">
          {t('error.load')}{' '}
          <button type="button" onClick={() => void load()}>
            {t('action.retry')}
          </button>
        </p>
      ) : null}

      {items === null && !loadFailed ? <p>{t('state.loading')}</p> : null}
      {items !== null && items.length === 0 && !loadFailed ? <p>{s('empty')}</p> : null}

      <ul className="admin-media-grid">
        {(items ?? []).map(item => {
          const draft = drafts[item.id] ?? item.alt;
          const changed = draft.en !== item.alt.en || draft.ar !== item.alt.ar;
          const state: Note = notes[item.id] ?? {};
          const error = fieldErrors(state.error);
          return (
            <li key={item.id} className="admin-media-item">
              <img
                src={item.previewUrl}
                alt={item.alt[lang] || item.alt.en || item.alt.ar || item.fileName}
                width={item.width}
                height={item.height}
                loading="lazy"
              />
              <p className="admin-media-name">{item.fileName}</p>
              <p className="admin-hint">
                {s('size')}: {item.width}×{item.height} · {s('widths')}: {item.widths.join(', ')}
              </p>

              <LocalizedField
                name={`alt-${item.id}`}
                label={s('alt')}
                hint={s('altHint')}
                value={draft}
                maxLength={300}
                onChange={next => setDrafts(all => ({ ...all, [item.id]: next }))}
                error={field => error(field.endsWith('.ar') ? 'alt.ar' : 'alt.en')}
              />

              <p className="admin-media-actions">
                <button type="button" onClick={() => void saveAlt(item)} disabled={!changed || state.busy === true}>
                  {state.busy ? t('state.saving') : t('action.save')}
                </button>
                <Confirm
                  question={s('deleteQuestion').replace('{name}', item.fileName)}
                  triggerLabel={t('action.delete')}
                  onConfirm={() => void remove(item)}
                />
                {state.saved && !changed ? (
                  <span className="admin-ok" role="status">
                    {t('state.saved')}
                  </span>
                ) : null}
              </p>

              {state.trouble ? (
                <p className="admin-error" role="alert">
                  {say(state.trouble)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
