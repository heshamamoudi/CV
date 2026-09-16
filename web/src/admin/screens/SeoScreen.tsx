import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { NumberInput, TextInput } from '../components/Field';
import { LocalizedField } from '../components/LocalizedField';
import { MediaPicker } from '../components/MediaPicker';
import { SaveBar } from '../components/SaveBar';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from '../useEditor';
import { useScreenText } from '../useScreenText';
import type { AdminLang, AdminStringKey } from '../strings';
import type { PageSeoView, SeoView, SettingsView } from '../types';
import './seo.css';

const labels = {
  en: {
    lead: 'What search engines and shared links show. Each panel saves on its own.',
    home: 'Home page',
    journey: 'Journey page',
    projects: 'Projects page',
    pageTitle: 'Page title',
    pageDescription: 'Page description',
    shareImage: 'Share image',
    emptyNote: 'Leave these empty and the page uses its own text.',
    titleHint: 'At most 70 characters.',
    descriptionHint: 'At most 200 characters.',
    settings: 'Analytics and settings',
    measurement: 'Google Analytics measurement id',
    measurementHint: 'GA4 admin → data streams, beside the stream name. Empty means no analytics.',
    property: 'Google Analytics property id',
    propertyHint: 'GA4 admin → property settings, the numeric id under the property name.',
    token: 'Search Console verification token',
    tokenHint: "Search Console's HTML tag method: the content value only, not the whole tag.",
    email: 'Where to send message notifications',
    retention: 'Delete messages after (days)',
    retentionHint: 'Between 30 and 3650 days.',
  },
  ar: {
    lead: 'ما تعرضه محركات البحث والروابط المشاركة. كل لوحة تُحفظ وحدها.',
    home: 'الصفحة الرئيسية',
    journey: 'صفحة المسيرة',
    projects: 'صفحة المشاريع',
    pageTitle: 'عنوان الصفحة',
    pageDescription: 'وصف الصفحة',
    shareImage: 'صورة المشاركة',
    emptyNote: 'اترك الحقول فارغة لتستخدم الصفحة نصّها الخاص.',
    titleHint: 'بحد أقصى 70 حرفاً.',
    descriptionHint: 'بحد أقصى 200 حرف.',
    settings: 'التحليلات والإعدادات',
    measurement: 'معرّف قياس Google Analytics',
    measurementHint: 'إدارة GA4 ← تدفقات البيانات، بجانب اسم التدفق. الفراغ يعني بلا تحليلات.',
    property: 'معرّف خاصية Google Analytics',
    propertyHint: 'إدارة GA4 ← إعدادات الخاصية، المعرّف الرقمي تحت اسم الخاصية.',
    token: 'رمز التحقق في Search Console',
    tokenHint: 'طريقة وسم HTML في Search Console: قيمة content فقط، لا الوسم كاملاً.',
    email: 'عنوان إشعارات الرسائل',
    retention: 'حذف الرسائل بعد (أيام)',
    retentionHint: 'بين 30 و3650 يوماً.',
  },
};

/** What `useScreenText` hands back, so the panels can take it as one prop. */
interface ScreenText {
  lang: AdminLang;
  t: (key: AdminStringKey) => string;
  s: (key: keyof typeof labels.en) => string;
}

type PageKey = PageSeoView['key'];

/** One saveable panel: its own editing state, its own request, its own field errors. */
function usePanel<T>(loaded: T | null, part: string, onDirty: (part: string, dirty: boolean) => void, send: (value: T) => Promise<void>) {
  const editor = useEditor<T>(loaded);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const { dirty } = editor;
  useEffect(() => {
    onDirty(part, dirty);
  }, [onDirty, part, dirty]);

  async function save() {
    const value = editor.value;
    if (!value) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await send(value);
      editor.replace(value);
      setSaved(true);
    } catch (failure: unknown) {
      setError(failure);
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    editor.reset();
    setError(null);
  }

  return { editor, saving, saved, error, save, reset };
}

function PagePanel({ page, loaded, onDirty, text }: { page: PageKey; loaded: PageSeoView | null; onDirty: (part: string, dirty: boolean) => void; text: ScreenText }) {
  const { t, s } = text;
  const panel = usePanel<PageSeoView>(loaded, page, onDirty, value =>
    api<void>(`/api/admin/seo/pages/${page}`, {
      method: 'PUT',
      body: { title: value.title, description: value.description, shareMediaId: value.shareMediaId },
    }),
  );
  const { editor } = panel;
  const value = editor.value;
  if (!value) return null;

  // Ids must be unique across the three panels, so the field name is prefixed; the
  // server still talks about "title.ar", so the prefix is stripped back off here.
  const field = fieldErrors(panel.error);
  const scoped = (name: string) => field(name.slice(page.length + 1));

  return (
    <section className="seo-panel" aria-labelledby={`seo-${page}-heading`}>
      <h2 id={`seo-${page}-heading`}>{s(page)}</h2>
      <p className="admin-hint">{s('emptyNote')}</p>

      <LocalizedField
        name={`${page}-title`}
        label={s('pageTitle')}
        hint={s('titleHint')}
        maxLength={70}
        value={value.title}
        error={scoped}
        onChange={title => editor.set({ title })}
      />
      <LocalizedField
        name={`${page}-description`}
        label={s('pageDescription')}
        hint={s('descriptionHint')}
        maxLength={200}
        multiline
        rows={3}
        value={value.description}
        error={scoped}
        onChange={description => editor.set({ description })}
      />
      <MediaPicker label={s('shareImage')} value={value.shareMediaId} onChange={shareMediaId => editor.set({ shareMediaId })} />
      {field('shareMediaId') ? (
        <p className="admin-error" role="alert">
          {field('shareMediaId')}
        </p>
      ) : null}

      <SaveBar
        dirty={editor.dirty}
        saving={panel.saving}
        saved={panel.saved}
        error={generalError(panel.error, t('error.generic'))}
        onSave={() => void panel.save()}
        onReset={panel.reset}
      />
    </section>
  );
}

function SettingsPanel({ loaded, onDirty, text }: { loaded: SettingsView | null; onDirty: (part: string, dirty: boolean) => void; text: ScreenText }) {
  const { t, s } = text;
  const panel = usePanel<SettingsView>(loaded, 'settings', onDirty, value => api<void>('/api/admin/seo/settings', { method: 'PUT', body: value }));
  const { editor } = panel;
  const value = editor.value;
  if (!value) return null;

  const field = fieldErrors(panel.error);

  return (
    <section className="seo-panel" aria-labelledby="seo-settings-heading">
      <h2 id="seo-settings-heading">{s('settings')}</h2>

      <TextInput
        id="seo-ga-measurement"
        label={s('measurement')}
        hint={s('measurementHint')}
        placeholder="G-XXXXXXXXXX"
        dir="ltr"
        value={value.gaMeasurementId}
        error={field('gaMeasurementId')}
        onChange={gaMeasurementId => editor.set({ gaMeasurementId })}
      />
      <TextInput
        id="seo-ga-property"
        label={s('property')}
        hint={s('propertyHint')}
        dir="ltr"
        value={value.gaPropertyId}
        error={field('gaPropertyId')}
        onChange={gaPropertyId => editor.set({ gaPropertyId })}
      />
      <TextInput
        id="seo-search-console"
        label={s('token')}
        hint={s('tokenHint')}
        dir="ltr"
        value={value.searchConsoleToken}
        error={field('searchConsoleToken')}
        onChange={searchConsoleToken => editor.set({ searchConsoleToken })}
      />
      <TextInput
        id="seo-notification-email"
        label={s('email')}
        dir="ltr"
        value={value.notificationEmail}
        error={field('notificationEmail')}
        onChange={notificationEmail => editor.set({ notificationEmail })}
      />
      <NumberInput
        id="seo-retention"
        label={s('retention')}
        hint={s('retentionHint')}
        min={30}
        max={3650}
        value={value.messageRetentionDays}
        error={field('messageRetentionDays')}
        onChange={messageRetentionDays => editor.set({ messageRetentionDays })}
      />

      <SaveBar
        dirty={editor.dirty}
        saving={panel.saving}
        saved={panel.saved}
        error={generalError(panel.error, t('error.generic'))}
        onSave={() => void panel.save()}
        onReset={panel.reset}
      />
    </section>
  );
}

const PAGES: readonly PageKey[] = ['home', 'journey', 'projects'];

export function SeoScreen() {
  const text = useScreenText(labels);
  const { t, s } = text;
  const [seo, setSeo] = useState<SeoView | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [reloads, setReloads] = useState(0);
  const [dirtyParts, setDirtyParts] = useState<readonly string[]>([]);

  useUnsavedGuard(dirtyParts.length > 0, t('guard.leave'));

  const onDirty = useCallback((part: string, dirty: boolean) => {
    setDirtyParts(current => (dirty ? (current.includes(part) ? current : [...current, part]) : current.filter(other => other !== part)));
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    setLoadError(null);
    api<SeoView>('/api/admin/seo', { signal: abort.signal })
      .then(loaded => setSeo(loaded))
      .catch((failed: unknown) => {
        if (!abort.signal.aborted) setLoadError(failed);
      });
    return () => abort.abort();
  }, [reloads]);

  // Stable per load, so each panel's editor is not reset on every render.
  const pages = useMemo(
    () => new Map(PAGES.map(key => [key, seo?.pages.find(page => page.key === key) ?? null])),
    [seo],
  );
  const settings = useMemo(() => seo?.settings ?? null, [seo]);

  if (loadError && !seo) {
    return (
      <section className="admin-seo">
        <h1>{t('nav.seo')}</h1>
        <p className="admin-error" role="alert">
          {t('error.load')}
        </p>
        <button type="button" onClick={() => setReloads(n => n + 1)}>
          {t('action.retry')}
        </button>
      </section>
    );
  }

  if (!seo) {
    return (
      <section className="admin-seo">
        <h1>{t('nav.seo')}</h1>
        <p>{t('state.loading')}</p>
      </section>
    );
  }

  return (
    <section className="admin-seo">
      <h1>{t('nav.seo')}</h1>
      <p className="admin-hint">{s('lead')}</p>

      {PAGES.map(key => (
        <PagePanel key={key} page={key} loaded={pages.get(key) ?? null} onDirty={onDirty} text={text} />
      ))}

      <SettingsPanel loaded={settings} onDirty={onDirty} text={text} />
    </section>
  );
}
