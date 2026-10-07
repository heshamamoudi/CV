import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { NumberInput, TextInput, TextArea } from '../components/Field';
import { MediaPicker } from '../components/MediaPicker';
import { SaveBar } from '../components/SaveBar';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from '../useEditor';
import { useScreenText } from '../useScreenText';
import type { AdminLang, AdminStringKey } from '../strings';
import type { LocalizedText, MediaView, PageSeoView, ProfileEdit, SeoView, SettingsView } from '../types';
import publicStrings from '../../i18n/strings.json';
import './seo.css';

const labels = {
  en: {
    lead: 'Shape how your portfolio appears in search and shared links.',
    title: 'Search & sharing',
    eyebrow: 'DISCOVERABILITY',
    overview: 'Your content is already doing the work.',
    overviewHint: 'Titles and descriptions come from your profile automatically. Edit a field to customize it, or return to the original at any time. Each page saves separately.',
    automatic: 'Automatic',
    custom: 'Custom',
    reset: 'Use automatic text',
    fromProfile: 'From your profile',
    preview: 'Link preview',
    previewHint: 'Preview updates as you edit. Search engines may display a different snippet.',
    noDescription: 'Add a profile summary or a page description.',
    noTitle: 'Add a profile name or a sharing title.',
    heroImage: 'Using your profile hero image',
    noImage: 'No sharing image yet',
    imageHint: 'Choose a landscape image for this page. Otherwise, the profile hero or portfolio brand card is used.',
    imageCustom: 'Page image selected',
    pages: 'Page metadata',
    openPage: 'View page',
    profileFailed: 'Automatic text could not be loaded. Your saved overrides are still available.',
    profileLoading: 'Loading automatic text…',
    integrations: 'Connections',
    integrationsHint: 'Optional services. Add the IDs from your own Google accounts to enable them.',
    connected: 'Configured',
    notConnected: 'Not configured',
    analytics: 'Google Analytics',
    verification: 'Search Console',
    inbox: 'Inbox preferences',
    draft: 'Unsaved changes',
    home: 'Home page',
    journey: 'Journey page',
    projects: 'Projects page',
    pageTitle: 'Link-sharing title',
    pageDescription: 'Page description',
    shareImage: 'Share image',
    emptyNote: 'Leave these empty and the page uses its own text.',
    titleHint: 'Up to 70 characters. This title appears in search results, shared links, and the browser tab.',
    descriptionHint: 'Custom text: up to 200 characters. Search snippets use the first 160.',
    settings: 'Analytics and settings',
    measurement: 'Google Analytics measurement id',
    measurementHint: 'In Google Analytics, open Admin, then Data streams. The ID appears beside the stream name. Leave it empty to disable analytics.',
    property: 'Google Analytics property id',
    propertyHint: 'In Google Analytics, open Admin and find the numeric ID under Property settings.',
    token: 'Search Console verification token',
    tokenHint: "Search Console's HTML tag method: the content value only, not the whole tag.",
    email: 'Notification email address',
    retention: 'Delete messages after (days)',
    retentionHint: 'Between 30 and 3650 days.',
    messagesHint: 'Inbox messages are retained for the selected number of days (default 180). Email delivery is not configured; replies open your mail app.',
  },
  ar: {
    title: 'البحث والمشاركة',
    eyebrow: 'الظهور في البحث',
    overview: 'محتواك يعمل من أجلك بالفعل.',
    overviewHint: 'تُستمد العناوين والأوصاف تلقائياً من ملفك الشخصي. عدّل أي حقل لتخصيصه، أو عُد للنص الأصلي في أي وقت. تُحفظ كل صفحة بشكل مستقل.',
    automatic: 'تلقائي',
    custom: 'مخصص',
    reset: 'استخدام النص التلقائي',
    fromProfile: 'من ملفك الشخصي',
    preview: 'معاينة الرابط',
    previewHint: 'تتحدث المعاينة أثناء التحرير. قد تعرض محركات البحث مقتطفاً مختلفاً.',
    noDescription: 'أضف ملخصاً لملفك الشخصي أو وصفاً للصفحة.',
    noTitle: 'أضف اسماً للملف الشخصي أو عنواناً للمشاركة.',
    heroImage: 'تُستخدم صورة واجهة ملفك الشخصي',
    noImage: 'لم تُضف صورة للمشاركة بعد',
    imageHint: 'اختر صورة أفقية ليكون الرابط أكثر وضوحاً. عند عدم تخصيص صورة، تُستخدم صورة واجهة ملفك الشخصي.',
    imageCustom: 'تم اختيار صورة للصفحة',
    pages: 'بيانات الصفحات',
    openPage: 'عرض الصفحة',
    profileFailed: 'تعذّر تحميل النص التلقائي. لا تزال تخصيصاتك المحفوظة متاحة.',
    profileLoading: 'جارٍ تحميل النص التلقائي…',
    integrations: 'الخدمات المرتبطة',
    integrationsHint: 'خدمات اختيارية. أضف المعرّفات من حساباتك في Google لتفعيلها.',
    connected: 'تم الإعداد',
    notConnected: 'لم يتم الإعداد',
    analytics: 'Google Analytics',
    verification: 'Search Console',
    inbox: 'تفضيلات صندوق الوارد',
    draft: 'تغييرات غير محفوظة',
    lead: 'ما تعرضه محركات البحث والروابط المشاركة. كل لوحة تُحفظ وحدها.',
    home: 'الصفحة الرئيسية',
    journey: 'صفحة المسيرة',
    projects: 'صفحة المشاريع',
    pageTitle: 'عنوان المشاركة عبر الروابط',
    pageDescription: 'وصف الصفحة',
    shareImage: 'صورة المشاركة',
    emptyNote: 'اترك الحقول فارغة لتستخدم الصفحة نصّها الخاص.',
    titleHint: 'بحد أقصى 70 حرفاً. يحدد العنوان عند مشاركة الروابط؛ ويستخدم تبويب المتصفح الاسم الإنجليزي في الملف الشخصي.',
    descriptionHint: 'بحد أقصى 200 حرف.',
    settings: 'التحليلات والإعدادات',
    measurement: 'معرّف قياس Google Analytics',
    measurementHint: 'في Google Analytics، افتح الإدارة ثم تدفقات البيانات. يظهر المعرّف بجانب اسم التدفق. اتركه فارغاً لإيقاف التحليلات.',
    property: 'معرّف خاصية Google Analytics',
    propertyHint: 'في Google Analytics، افتح الإدارة وابحث عن المعرّف الرقمي ضمن إعدادات الموقع.',
    token: 'رمز التحقق في Search Console',
    tokenHint: 'طريقة وسم HTML في Search Console: قيمة content فقط، لا الوسم كاملاً.',
    email: 'عنوان بريد الإشعارات',
    retention: 'حذف الرسائل بعد (أيام)',
    retentionHint: 'بين 30 و3650 يوماً.',
    messagesHint: 'تُحتفظ برسائل الصندوق للمدة المحددة (180 يوماً افتراضياً). إرسال الإشعارات بالبريد غير مهيأ؛ ويفتح الرد تطبيق البريد لديك.',
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

function SeoField({ page, name, value, fallback, onChange, error, text }: {
  page: PageKey; name: 'title' | 'description'; value: LocalizedText; fallback: LocalizedText;
  onChange: (value: LocalizedText) => void; error: (field: string) => string | undefined; text: ScreenText;
}) {
  const { s, t } = text;
  const Control = name === 'description' ? TextArea : TextInput;
  const max = name === 'title' ? 70 : 200;
  const hint = name === 'title'
    ? text.lang === 'ar' ? '\u062d\u062a\u0649 70 \u062d\u0631\u0641\u064b\u0627. \u064a\u0638\u0647\u0631 \u0647\u0630\u0627 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0641\u064a \u0646\u062a\u0627\u0626\u062c \u0627\u0644\u0628\u062d\u062b \u0648\u0645\u0639\u0627\u064a\u0646\u0627\u062a \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0648\u0639\u0644\u0627\u0645\u0629 \u062a\u0628\u0648\u064a\u0628 \u0627\u0644\u0645\u062a\u0635\u0641\u062d.'
      : s('titleHint')
    : s('descriptionHint');
  return (
    <fieldset className="seo-fieldset">
      <legend>{s(name === 'title' ? 'pageTitle' : 'pageDescription')}</legend>
      <p className="admin-hint">{hint}</p>
      <div className="admin-grid">
        {(['en', 'ar'] as const).map(lang => {
          const custom = Boolean(value[lang].trim());
          const effective = custom ? value[lang] : fallback[lang];
          return (
            <div className="seo-language-field" key={lang}>
              <Control id={`${page}-${name}-${lang}`} label={t(lang === 'en' ? 'field.english' : 'field.arabic')}
                value={effective} dir={lang === 'ar' ? 'rtl' : 'ltr'} lang={lang} rows={4}
                maxLength={max} error={error(`${name}.${lang}`)}
                hint={`${custom ? s('custom') : s('automatic')} · ${effective.length}${custom ? ` / ${max}` : ''}`}
                onChange={next => onChange({ ...value, [lang]: next })} />
              {custom ? <button className="seo-reset" type="button" onClick={() => onChange({ ...value, [lang]: '' })}
                aria-label={`${s('reset')}: ${t(lang === 'en' ? 'field.english' : 'field.arabic')}, ${s(name === 'title' ? 'pageTitle' : 'pageDescription')}`}>{s('reset')}</button> : null}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function PagePanel({ page, loaded, profile, media, onDirty, text }: {
  page: PageKey; loaded: PageSeoView | null; profile: ProfileEdit | null; media: MediaView[];
  onDirty: (part: string, dirty: boolean) => void; text: ScreenText;
}) {
  const { t, s } = text;
  const [previewLang, setPreviewLang] = useState<AdminLang>(text.lang);
  const panel = usePanel<PageSeoView>(loaded, page, onDirty, value =>
    api<void>(`/api/admin/seo/pages/${page}`, {
      method: 'PUT',
      body: { title: value.title, description: value.description, shareMediaId: value.shareMediaId },
    }),
  );
  const { editor } = panel;
  const value = editor.value;
  if (!value) return null;

  const field = fieldErrors(panel.error);
  const defaults = (lang: AdminLang) => profile ? {
    title: page === 'home' ? `${profile.name[lang]}, ${profile.headline[lang]}` : `${publicStrings[lang][`page.${page}`]}: ${profile.name[lang]}`,
    description: profile.summary[lang],
  } : { title: '', description: '' };
  const fallback = { en: defaults('en'), ar: defaults('ar') };
  const title = value.title[previewLang].trim() || fallback[previewLang].title;
  const description = value.description[previewLang].trim() || fallback[previewLang].description;
  const imageId = value.shareMediaId || profile?.heroMediaId;
  const image = media.find(item => item.id === imageId);
  const imageUrl = image?.previewUrl ?? (previewLang === 'ar' ? '/brand/og-card-ar.png' : '/brand/og-card.png');
  const imageSource = value.shareMediaId ? s('imageCustom') : profile?.heroMediaId ? s('heroImage') : text.lang === 'ar' ? '\u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u0643\u0629 \u0627\u0644\u0628\u0635\u0631\u064a\u0629 \u0627\u0644\u062a\u0644\u0642\u0627\u0626\u064a\u0629' : 'Using the portfolio brand card';
  const imageHint = text.lang === 'ar' ? '\u0627\u062e\u062a\u0631 \u0635\u0648\u0631\u0629 \u0623\u0641\u0642\u064a\u0629 \u0644\u0647\u0630\u0647 \u0627\u0644\u0635\u0641\u062d\u0629. \u0639\u0646\u062f \u0639\u062f\u0645 \u0627\u062e\u062a\u064a\u0627\u0631 \u0635\u0648\u0631\u0629\u060c \u062a\u064f\u0633\u062a\u062e\u062f\u0645 \u0635\u0648\u0631\u0629 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062e\u0635\u064a \u0623\u0648 \u0628\u0637\u0627\u0642\u0629 \u0627\u0644\u0647\u0648\u064a\u0629 \u0627\u0644\u0628\u0635\u0631\u064a\u0629.' : s('imageHint');
  const custom = Boolean(value.title.en.trim() || value.title.ar.trim() || value.description.en.trim() || value.description.ar.trim() || value.shareMediaId);
  const path = `/${previewLang}${page === 'home' ? '' : `/${page}`}`;

  return (
    <section className="seo-panel" id={`seo-${page}`} aria-labelledby={`seo-${page}-heading`}>
      <header className="seo-panel-heading">
        <span className="seo-page-number" aria-hidden="true">0{PAGES.indexOf(page) + 1}</span>
        <div><h2 id={`seo-${page}-heading`}>{s(page)}</h2><span className="seo-path" dir="ltr">/{page === 'home' ? '' : page}</span></div>
        <span className={`seo-status ${custom ? 'seo-status-custom' : ''}`}>{editor.dirty ? s('draft') : custom ? s('custom') : s('automatic')}</span>
      </header>
      <div className="seo-page-body">
        <div className="seo-editor">
          <SeoField page={page} name="title" value={value.title} fallback={{ en: fallback.en.title, ar: fallback.ar.title }}
            error={field} onChange={title => editor.set({ title })} text={text} />
          <SeoField page={page} name="description" value={value.description} fallback={{ en: fallback.en.description, ar: fallback.ar.description }}
            error={field} onChange={description => editor.set({ description })} text={text} />
          <div className="seo-image-field">
            <MediaPicker label={s('shareImage')} value={value.shareMediaId} onChange={shareMediaId => editor.set({ shareMediaId })} />
            <p className="seo-image-source">{imageSource}</p>
            <p className="admin-hint">{imageHint}</p>
          </div>
      {field('shareMediaId') ? (
        <p className="admin-error" role="alert">
          {field('shareMediaId')}
        </p>
      ) : null}
        </div>
        <aside className="seo-preview" aria-label={`${s(page)}: ${s('preview')}`}>
          <div className="seo-preview-heading"><span>{s('preview')}</span><div className="seo-preview-languages" role="group" aria-label={s('preview')}>
            {(['en', 'ar'] as const).map(lang => <button type="button" key={lang} aria-pressed={previewLang === lang} onClick={() => setPreviewLang(lang)}>{lang === 'en' ? 'EN' : 'ع'}</button>)}
          </div></div>
          <div className="seo-link-card" lang={previewLang} dir={previewLang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="seo-link-image"><img src={imageUrl} alt="" /></div>
            <div className="seo-link-text"><span className="seo-path" dir="ltr">{path}</span><h3>{title || s('noTitle')}</h3><p>{description.length > 200 ? `${description.slice(0, 199).trimEnd()}…` : description || s('noDescription')}</p></div>
          </div>
          <p className="admin-hint">{s('previewHint')}</p>
          <a href={path} target="_blank" rel="noreferrer">{s('openPage')}</a>
        </aside>
      </div>

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
    <section className="seo-panel seo-settings" id="seo-settings" aria-labelledby="seo-settings-heading">
      <header className="seo-panel-heading"><span className="seo-page-number" aria-hidden="true">04</span><div><h2 id="seo-settings-heading">{s('settings')}</h2><p className="admin-hint">{s('integrationsHint')}</p></div></header>
      <div className="seo-settings-grid">
      <div className="seo-settings-group">
      <div className="seo-service-heading"><h3>{s('analytics')}</h3><span className="seo-status">{value.gaMeasurementId ? s('connected') : s('notConnected')}</span></div>
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
      <p className="seo-connection-note">{s('verification')}: {value.searchConsoleToken ? s('connected') : s('notConnected')}</p>
      </div>
      <div className="seo-settings-group">
      <h3>{s('inbox')}</h3>
      <p className="admin-hint">{s('messagesHint')}</p>
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
      </div>
      </div>
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
  const [profile, setProfile] = useState<ProfileEdit | null>(null);
  const [profileState, setProfileState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [media, setMedia] = useState<MediaView[]>([]);
  const [profileReloads, setProfileReloads] = useState(0);
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

  useEffect(() => {
    const abort = new AbortController();
    setProfileState('loading');
    void api<ProfileEdit>('/api/admin/profile', { signal: abort.signal }).then(loaded => {
      if (!abort.signal.aborted) { setProfile(loaded); setProfileState('ready'); }
    }).catch(() => { if (!abort.signal.aborted) setProfileState('failed'); });
    void api<MediaView[]>('/api/admin/media', { signal: abort.signal }).then(loaded => {
      if (!abort.signal.aborted) setMedia(loaded);
    }).catch(() => { /* The picker remains available if preview thumbnails fail. */ });
    return () => abort.abort();
  }, [profileReloads]);

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
      <p className="seo-eyebrow">{s('eyebrow')}</p>
      <h1>{s('title')}</h1>
      <p className="admin-hint">{s('lead')}</p>
      <div className="seo-introduction"><div><h2>{s('overview')}</h2><p>{s('overviewHint')}</p></div></div>
      {profileState !== 'ready' ? <p className="seo-load-note" role="status">{s(profileState === 'failed' ? 'profileFailed' : 'profileLoading')} {profileState === 'failed' ? <button type="button" onClick={() => setProfileReloads(n => n + 1)}>{t('action.retry')}</button> : null}</p> : null}
      <nav className="seo-page-nav" aria-label={s('pages')}>
        {PAGES.map((key, index) => <a href={`#seo-${key}`} key={key}><span>0{index + 1}</span>{s(key)}</a>)}
        <a href="#seo-settings"><span>04</span>{s('integrations')}</a>
      </nav>
      {PAGES.map(key => (
        <PagePanel key={key} page={key} loaded={pages.get(key) ?? null} profile={profile} media={media} onDirty={onDirty} text={text} />
      ))}

      <SettingsPanel loaded={settings} onDirty={onDirty} text={text} />
    </section>
  );
}
