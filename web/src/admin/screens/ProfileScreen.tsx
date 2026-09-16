import { useEffect, useState } from 'react';
import { api } from '../api';
import { TextInput } from '../components/Field';
import { LocalizedField } from '../components/LocalizedField';
import { MediaPicker } from '../components/MediaPicker';
import { SaveBar } from '../components/SaveBar';
import { fieldErrors, generalError, useEditor, useUnsavedGuard } from '../useEditor';
import { useScreenText } from '../useScreenText';
import type { ProfileEdit } from '../types';

const labels = {
  en: {
    title: 'Profile & hero',
    lead: 'The person the site is about, and the first screen a visitor sees.',
    who: 'Who you are',
    hero: 'The first screen',
    story: 'The longer story',
    reach: 'Where to find you',
    pictures: 'Pictures',
    name: 'Name',
    headline: 'Headline',
    eyebrow: 'Eyebrow',
    heroTitle: 'Hero title',
    heroSubtitle: 'Hero subtitle',
    summary: 'Summary',
    location: 'Location',
    about: 'About',
    quote: 'Quote',
    email: 'Email',
    linkedIn: 'LinkedIn',
    gitHub: 'GitHub',
    heroImage: 'Hero image',
    portrait: 'Portrait',
    eyebrowHint: 'The small line above the hero title.',
    emailHint: 'Where the contact form sends its messages.',
    urlHint: 'A full address, starting with https://. Leave empty to hide the link.',
  },
  ar: {
    title: 'الملف الشخصي والواجهة',
    lead: 'صاحب الموقع، وأول شاشة يراها الزائر.',
    who: 'من أنت',
    hero: 'الشاشة الأولى',
    story: 'التفاصيل',
    reach: 'كيف يصلون إليك',
    pictures: 'الصور',
    name: 'الاسم',
    headline: 'العنوان الوظيفي',
    eyebrow: 'النص التمهيدي',
    heroTitle: 'عنوان الواجهة',
    heroSubtitle: 'العنوان الفرعي للواجهة',
    summary: 'الملخص',
    location: 'الموقع',
    about: 'النبذة',
    quote: 'الاقتباس',
    email: 'البريد الإلكتروني',
    linkedIn: 'لينكدإن',
    gitHub: 'غيت هَب',
    heroImage: 'صورة الواجهة',
    portrait: 'الصورة الشخصية',
    eyebrowHint: 'السطر الصغير فوق عنوان الواجهة.',
    emailHint: 'العنوان الذي ترسل إليه رسائل نموذج التواصل.',
    urlHint: 'عنوان كامل يبدأ بـ https://. اتركه فارغاً لإخفاء الرابط.',
  },
};

/** The API's own limits, so the box stops where the server would have refused. */
const limits = {
  name: 200,
  headline: 200,
  eyebrow: 200,
  heroTitle: 300,
  heroSubtitle: 600,
  summary: 4000,
  location: 200,
  about: 4000,
  quote: 300,
};

export function ProfileScreen() {
  const { t, s } = useScreenText(labels);
  const [loaded, setLoaded] = useState<ProfileEdit | null>(null);
  const [loadFailure, setLoadFailure] = useState<{ error: unknown } | null>(null);
  const [saveFailure, setSaveFailure] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const editor = useEditor<ProfileEdit>(loaded);
  useUnsavedGuard(editor.dirty, t('guard.leave'));

  useEffect(() => {
    let live = true;
    setLoaded(null);
    setLoadFailure(null);
    api<ProfileEdit>('/api/admin/profile')
      .then(profile => live && setLoaded(profile))
      .catch((error: unknown) => {
        if (live) setLoadFailure({ error });
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  const value = editor.value;

  const save = async () => {
    if (!value || saving) return;
    setSaving(true);
    setSaveFailure(null);
    setSaved(false);
    try {
      await api<void>('/api/admin/profile', { method: 'PUT', body: value });
      // What the server accepted is now the saved state; the boxes keep exactly what was sent.
      editor.replace(value);
      setSaved(true);
    } catch (error: unknown) {
      setSaveFailure(error);
    } finally {
      setSaving(false);
    }
  };

  if (loadFailure) {
    return (
      <section>
        <h1>{s('title')}</h1>
        <p className="admin-dash-failed">
          <span className="admin-error" role="alert">
            {generalError(loadFailure.error, t('error.generic')) ?? t('error.load')}
          </span>{' '}
          <button type="button" onClick={() => setAttempt(n => n + 1)}>
            {t('action.retry')}
          </button>
        </p>
      </section>
    );
  }

  if (!value) {
    return (
      <section>
        <h1>{s('title')}</h1>
        <p>{t('state.loading')}</p>
      </section>
    );
  }

  const error = fieldErrors(saveFailure);

  return (
    <section className="admin-profile">
      <h1>{s('title')}</h1>
      <p className="admin-hint">{s('lead')}</p>

      <h2>{s('who')}</h2>
      <LocalizedField
        name="name"
        label={s('name')}
        value={value.name}
        onChange={next => editor.set({ name: next })}
        error={error}
        maxLength={limits.name}
      />
      <LocalizedField
        name="headline"
        label={s('headline')}
        value={value.headline}
        onChange={next => editor.set({ headline: next })}
        error={error}
        maxLength={limits.headline}
      />
      <LocalizedField
        name="location"
        label={s('location')}
        value={value.location}
        onChange={next => editor.set({ location: next })}
        error={error}
        maxLength={limits.location}
      />

      <h2>{s('hero')}</h2>
      <LocalizedField
        name="eyebrow"
        label={s('eyebrow')}
        value={value.eyebrow}
        onChange={next => editor.set({ eyebrow: next })}
        error={error}
        hint={s('eyebrowHint')}
        maxLength={limits.eyebrow}
      />
      <LocalizedField
        name="heroTitle"
        label={s('heroTitle')}
        value={value.heroTitle}
        onChange={next => editor.set({ heroTitle: next })}
        error={error}
        maxLength={limits.heroTitle}
      />
      <LocalizedField
        name="heroSubtitle"
        label={s('heroSubtitle')}
        value={value.heroSubtitle}
        onChange={next => editor.set({ heroSubtitle: next })}
        error={error}
        multiline
        rows={2}
        maxLength={limits.heroSubtitle}
      />

      <h2>{s('story')}</h2>
      <LocalizedField
        name="summary"
        label={s('summary')}
        value={value.summary}
        onChange={next => editor.set({ summary: next })}
        error={error}
        multiline
        rows={4}
        maxLength={limits.summary}
      />
      <LocalizedField
        name="about"
        label={s('about')}
        value={value.about}
        onChange={next => editor.set({ about: next })}
        error={error}
        multiline
        rows={8}
        maxLength={limits.about}
      />
      <LocalizedField
        name="quote"
        label={s('quote')}
        value={value.quote}
        onChange={next => editor.set({ quote: next })}
        error={error}
        multiline
        rows={2}
        maxLength={limits.quote}
      />

      <h2>{s('reach')}</h2>
      <div className="admin-grid">
        <TextInput
          id="email"
          label={s('email')}
          value={value.email}
          onChange={next => editor.set({ email: next })}
          error={error('email')}
          hint={s('emailHint')}
          dir="ltr"
          maxLength={320}
        />
        <TextInput
          id="linkedInUrl"
          label={s('linkedIn')}
          value={value.linkedInUrl}
          onChange={next => editor.set({ linkedInUrl: next })}
          error={error('linkedInUrl')}
          hint={s('urlHint')}
          dir="ltr"
          maxLength={500}
        />
        <TextInput
          id="gitHubUrl"
          label={s('gitHub')}
          value={value.gitHubUrl}
          onChange={next => editor.set({ gitHubUrl: next })}
          error={error('gitHubUrl')}
          hint={s('urlHint')}
          dir="ltr"
          maxLength={500}
        />
      </div>

      <h2>{s('pictures')}</h2>
      <div className="admin-grid">
        <MediaPicker label={s('heroImage')} value={value.heroMediaId} onChange={id => editor.set({ heroMediaId: id })} />
        <MediaPicker label={s('portrait')} value={value.portraitMediaId} onChange={id => editor.set({ portraitMediaId: id })} />
      </div>
      {error('heroMediaId') ? (
        <p className="admin-error" role="alert">
          {error('heroMediaId')}
        </p>
      ) : null}
      {error('portraitMediaId') ? (
        <p className="admin-error" role="alert">
          {error('portraitMediaId')}
        </p>
      ) : null}

      <SaveBar
        dirty={editor.dirty}
        saving={saving}
        saved={saved}
        error={generalError(saveFailure, t('error.generic'))}
        onSave={save}
        onReset={editor.reset}
      />
    </section>
  );
}
