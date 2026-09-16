import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { api } from '../api';
import { Confirm } from '../components/Confirm';
import { Field } from '../components/Field';
import { SaveBar } from '../components/SaveBar';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from '../useEditor';
import { useScreenText } from '../useScreenText';
import type { AdminLang } from '../strings';
import type { CvFileView } from '../types';
import './cv.css';

/** The server's own cap. Refusing here saves the owner a ten-megabyte round trip. */
const MAX_BYTES = 10 * 1024 * 1024;
const LANGUAGES: readonly AdminLang[] = ['en', 'ar'];

/** A file the owner has chosen but not yet sent. */
interface Picked {
  name: string;
  size: number;
  file: File;
}

type CvDraft = Record<AdminLang, Picked | null>;
/** One stable object: useEditor treats a new "loaded" value as a fresh load and would drop the pick. */
const NOTHING_PICKED: CvDraft = { en: null, ar: null };

const labels = {
  en: {
    lead: 'One PDF per language. Visitors download it from the CV link on the site.',
    noFile: 'No file yet',
    uploadedOn: 'Uploaded {date}',
    open: 'Open the {lang} download',
    uploadLabel: 'Upload the {lang} file',
    replaceLabel: 'Replace the {lang} file',
    rules: 'PDF only, at most 10 MB.',
    notPdf: 'That file is not a PDF. Choose a PDF and try again.',
    tooBig: 'That file is larger than 10 MB. Save a smaller PDF and try again.',
    picked: 'Ready to upload: {name} ({size}). Press Save.',
    fallback: 'No {lang} CV yet, so visitors who ask for it are given the {other} file.',
    none: 'No CV in either language yet, so the download link is a 404 today.',
    deleteTrigger: 'Delete the {lang} CV',
    deleteQuestion: 'Delete the {lang} CV for good? Visitors would then be given the other language.',
  },
  ar: {
    lead: 'ملف PDF واحد لكل لغة. يُنزّله الزوّار من رابط السيرة الذاتية في الموقع.',
    noFile: 'لا يوجد ملف بعد',
    uploadedOn: 'رُفع في {date}',
    open: 'فتح تنزيل {lang}',
    uploadLabel: 'رفع ملف {lang}',
    replaceLabel: 'استبدال ملف {lang}',
    rules: 'ملف PDF فقط، وبحجم لا يتجاوز 10 ميغابايت.',
    notPdf: 'هذا الملف ليس PDF. اختر ملف PDF وحاول مرة أخرى.',
    tooBig: 'حجم هذا الملف أكبر من 10 ميغابايت. احفظ نسخة أصغر وحاول مرة أخرى.',
    picked: 'جاهز للرفع: {name} ({size}). اضغط حفظ.',
    fallback: 'لا توجد سيرة ذاتية بـ{lang} بعد، لذا يُعطى من يطلبها ملف {other}.',
    none: 'لا توجد سيرة ذاتية بأي لغة بعد، لذا يعطي رابط التنزيل صفحة 404 اليوم.',
    deleteTrigger: 'حذف السيرة الذاتية بـ{lang}',
    deleteQuestion: 'حذف السيرة الذاتية بـ{lang} نهائياً؟ سيُعطى الزوّار عندها اللغة الأخرى.',
  },
};

const fill = (text: string, parts: Record<string, string>) =>
  Object.entries(parts).reduce((done, [key, value]) => done.replace(`{${key}}`, value), text);

/** Kilobytes until a megabyte is the honest unit; nobody reads "10485760". */
function shownSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shownDate(iso: string, lang: AdminLang): string {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return iso;
  return when.toLocaleDateString(lang === 'ar' ? 'ar' : 'en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** What is wrong with this file, before a byte of it leaves the browser. */
function refusal(file: File): 'notPdf' | 'tooBig' | null {
  const pdf = file.type === 'application/pdf' || (file.type === '' && file.name.toLowerCase().endsWith('.pdf'));
  if (!pdf) return 'notPdf';
  if (file.size > MAX_BYTES) return 'tooBig';
  return null;
}

export function CvScreen() {
  const { lang, t, s } = useScreenText(labels);
  const [files, setFiles] = useState<CvFileView[] | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloads, setReloads] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  /** The server's refusal, per language, so each row shows its own. */
  const [failures, setFailures] = useState<Partial<Record<AdminLang, unknown>>>({});
  /** The browser's own refusal, per language. */
  const [refusals, setRefusals] = useState<Partial<Record<AdminLang, 'notPdf' | 'tooBig'>>>({});
  /** Bumped to remount the file inputs, which is the only way to clear what they show. */
  const [inputSeq, setInputSeq] = useState(0);

  const editor = useEditor<CvDraft>(NOTHING_PICKED);
  const draft = editor.value ?? NOTHING_PICKED;
  useUnsavedGuard(editor.dirty, t('guard.leave'));

  const reload = useCallback(() => setReloads(n => n + 1), []);

  useEffect(() => {
    const abort = new AbortController();
    setLoadError(null);
    api<CvFileView[]>('/api/admin/cv', { signal: abort.signal })
      .then(list => setFiles(list))
      .catch((failed: unknown) => {
        if (!abort.signal.aborted) setLoadError(failed);
      });
    return () => abort.abort();
  }, [reloads]);

  function pick(language: AdminLang, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSaved(false);
    setFailures(current => ({ ...current, [language]: undefined }));
    const wrong = refusal(file);
    setRefusals(current => ({ ...current, [language]: wrong ?? undefined }));
    editor.set({ [language]: wrong ? null : { name: file.name, size: file.size, file } } as Partial<CvDraft>);
    if (wrong) setInputSeq(n => n + 1); // a refused file must not sit in the input looking accepted
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const failed: Partial<Record<AdminLang, unknown>> = {};
    let sent = false;

    for (const language of LANGUAGES) {
      const picked = draft[language];
      if (!picked) continue;
      const form = new FormData();
      form.append('file', picked.file, picked.name);
      try {
        await api<void>(`/api/admin/cv/${language}`, { method: 'PUT', form });
        sent = true;
      } catch (failure: unknown) {
        failed[language] = failure;
      }
    }

    setFailures(failed);
    setSaving(false);
    setSaved(Object.keys(failed).length === 0);
    // Whatever the server took is no longer pending; whatever it refused stays, so nothing is lost.
    editor.replace({ en: failed.en ? draft.en : null, ar: failed.ar ? draft.ar : null });
    setInputSeq(n => n + 1);
    if (sent) reload();
  }

  function undo() {
    editor.reset();
    setRefusals({});
    setFailures({});
    setInputSeq(n => n + 1);
  }

  async function remove(language: AdminLang) {
    try {
      await api<void>(`/api/admin/cv/${language}`, { method: 'DELETE' });
      setFailures(current => ({ ...current, [language]: undefined }));
      reload();
    } catch (failure: unknown) {
      setFailures(current => ({ ...current, [language]: failure }));
    }
  }

  if (loadError && !files) {
    return (
      <section className="admin-cv">
        <h1>{t('nav.cv')}</h1>
        <p className="admin-error" role="alert">
          {t('error.load')}
        </p>
        <button type="button" onClick={reload}>
          {t('action.retry')}
        </button>
      </section>
    );
  }

  if (!files) {
    return (
      <section className="admin-cv">
        <h1>{t('nav.cv')}</h1>
        <p>{t('state.loading')}</p>
      </section>
    );
  }

  const nameOf = (language: AdminLang) => (language === 'en' ? t('field.english') : t('field.arabic'));

  return (
    <section className="admin-cv">
      <h1>{t('nav.cv')}</h1>
      <p className="admin-hint">{s('lead')}</p>
      {files.length === 0 ? <p className="cv-warning">{s('none')}</p> : null}

      {LANGUAGES.map(language => {
        const existing = files.find(file => file.lang === language);
        const other = files.find(file => file.lang !== language);
        const picked = draft[language];
        const refused = refusals[language];
        const error = refused ? s(refused) : fieldErrors(failures[language])('file');
        const inputId = `cv-${language}-file`;

        return (
          <section className="cv-row" key={language} aria-labelledby={`cv-${language}-heading`}>
            <h2 id={`cv-${language}-heading`}>{nameOf(language)}</h2>

            {existing ? (
              <p className="cv-file">
                <strong>{existing.fileName}</strong>
                <span>{shownSize(existing.size)}</span>
                <span>{fill(s('uploadedOn'), { date: shownDate(existing.uploadedAt, lang) })}</span>
                <a href={`/${language}/cv`} target="_blank" rel="noopener noreferrer">
                  {fill(s('open'), { lang: nameOf(language) })}
                </a>
              </p>
            ) : (
              <p className="cv-file">
                <span>{s('noFile')}</span>
              </p>
            )}

            {!existing && other ? (
              <p className="cv-warning">{fill(s('fallback'), { lang: nameOf(language), other: nameOf(other.lang) })}</p>
            ) : null}

            <Field
              id={inputId}
              label={fill(s(existing ? 'replaceLabel' : 'uploadLabel'), { lang: nameOf(language) })}
              hint={s('rules')}
              error={error}
            >
              <input
                key={inputSeq}
                id={inputId}
                type="file"
                accept="application/pdf,.pdf"
                aria-invalid={error ? true : undefined}
                aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ''}`}
                onChange={event => pick(language, event)}
              />
            </Field>

            {picked ? <p className="cv-picked">{fill(s('picked'), { name: picked.name, size: shownSize(picked.size) })}</p> : null}

            {existing ? (
              <Confirm
                question={fill(s('deleteQuestion'), { lang: nameOf(language) })}
                triggerLabel={fill(s('deleteTrigger'), { lang: nameOf(language) })}
                onConfirm={() => void remove(language)}
              />
            ) : null}
          </section>
        );
      })}

      <SaveBar
        dirty={editor.dirty}
        saving={saving}
        saved={saved}
        error={generalError(failures.en ?? failures.ar ?? loadError, t('error.generic'))}
        onSave={() => void save()}
        onReset={undo}
      />
    </section>
  );
}
