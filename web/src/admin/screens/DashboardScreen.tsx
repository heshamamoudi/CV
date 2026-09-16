import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api';
import { generalError } from '../useEditor';
import { useScreenText } from '../useScreenText';
import type { AdminLang } from '../strings';
import type { CompletenessItem } from '../types';
import './dashboard.css';

const labels = {
  en: {
    title: 'Dashboard',
    signedIn: 'Signed in as {email}',
    publicLead: 'The site as a visitor sees it:',
    publicEn: 'English site',
    publicAr: 'Arabic site',
    complete: 'Everything is written in both languages.',
    completeHint: 'Nothing is being hidden from the English or the Arabic site.',
    lead: 'These are written in one language but not the other. The site hides the missing half.',
    count: '{n} to finish',
    // {field} arrives already in plain words, e.g. "headline" or "highlight 2".
    missingEn: 'English {field}',
    missingAr: 'Arabic {field}',
    'area.profile': 'Profile',
    'area.journey': 'Journey',
    'area.projects': 'Projects',
    'area.technologies': 'Technologies',
    'area.certificates': 'Certificates',
    'area.education': 'Education',
    'area.languages': 'Languages',
    'area.media': 'Images',
  },
  ar: {
    title: 'اللوحة',
    signedIn: 'مسجّل الدخول باسم {email}',
    publicLead: 'الموقع كما يراه الزائر:',
    publicEn: 'الموقع بالإنجليزية',
    publicAr: 'الموقع بالعربية',
    complete: 'كل شيء مكتوب باللغتين.',
    completeHint: 'لا شيء مخفي عن الموقع الإنجليزي أو العربي.',
    lead: 'هذه مكتوبة بلغة واحدة دون الأخرى، والموقع يخفي النصف الناقص.',
    count: '{n} بحاجة إلى استكمال',
    missingEn: '{field} بالإنجليزية',
    missingAr: '{field} بالعربية',
    'area.profile': 'الملف الشخصي',
    'area.journey': 'المسيرة',
    'area.projects': 'المشاريع',
    'area.technologies': 'التقنيات',
    'area.certificates': 'الشهادات',
    'area.education': 'التعليم',
    'area.languages': 'اللغات',
    'area.media': 'الصور',
  },
};

type Area = CompletenessItem['area'];

/** The order the nav uses, so the dashboard reads the same way round as the menu. */
const areas: Area[] = ['profile', 'journey', 'projects', 'technologies', 'certificates', 'education', 'languages', 'media'];

const screenFor: Record<Area, string> = {
  profile: '/admin/profile',
  journey: '/admin/journey',
  projects: '/admin/projects',
  technologies: '/admin/lists?list=technologies',
  certificates: '/admin/lists?list=certificates',
  education: '/admin/lists?list=education',
  languages: '/admin/lists?list=languages',
  media: '/admin/media',
};

/** Only these screens open one item from the address; the rest open the right tab and no more. */
const opensOneItem = new Set<Area>(['journey', 'projects']);

function linkFor(item: CompletenessItem): string {
  const target = screenFor[item.area];
  return item.id && opensOneItem.has(item.area) ? `${target}?id=${encodeURIComponent(item.id)}` : target;
}

/** The API's field names, in the words the owner uses. Numbered fields are named in the singular. */
const fieldWords: Record<AdminLang, Record<string, string>> = {
  en: {
    name: 'name',
    headline: 'headline',
    eyebrow: 'eyebrow',
    heroTitle: 'hero title',
    heroSubtitle: 'hero subtitle',
    summary: 'summary',
    location: 'location',
    about: 'about text',
    quote: 'quote',
    title: 'title',
    organisation: 'organisation',
    highlights: 'highlight',
    body: 'body',
    category: 'category',
    issuer: 'issuer',
    degree: 'degree',
    institution: 'institution',
    level: 'level',
    alt: 'alt text',
  },
  ar: {
    name: 'الاسم',
    headline: 'العنوان الوظيفي',
    eyebrow: 'النص التمهيدي',
    heroTitle: 'عنوان الواجهة',
    heroSubtitle: 'العنوان الفرعي للواجهة',
    summary: 'الملخص',
    location: 'الموقع',
    about: 'النبذة',
    quote: 'الاقتباس',
    title: 'العنوان',
    organisation: 'الجهة',
    highlights: 'النقطة',
    body: 'النص',
    category: 'التصنيف',
    issuer: 'الجهة المانحة',
    degree: 'الدرجة العلمية',
    institution: 'المؤسسة التعليمية',
    level: 'المستوى',
    alt: 'النص البديل',
  },
};

/** "highlights[1].en", as the API writes it. */
const missingPattern = /^([A-Za-z]+)(?:\[(\d+)\])?\.(en|ar)$/;

export function DashboardScreen() {
  const { lang, t, s } = useScreenText(labels);
  const [items, setItems] = useState<CompletenessItem[] | null>(null);
  const [email, setEmail] = useState('');
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setItems(null);
    setFailure(null);
    Promise.all([
      api<CompletenessItem[]>('/api/admin/completeness'),
      // Who is signed in is worth showing, never worth failing the whole page for.
      api<{ email: string | null }>('/api/admin/me').catch(() => ({ email: null })),
    ])
      .then(([list, me]) => {
        if (!live) return;
        setItems(list);
        setEmail(me.email ?? '');
      })
      .catch((error: unknown) => {
        if (live) setFailure({ error });
      });
    return () => {
      live = false;
    };
  }, [attempt]);

  const grouped = useMemo(() => {
    const byArea = new Map<Area, CompletenessItem[]>();
    for (const item of items ?? []) {
      const seen = byArea.get(item.area);
      if (seen) seen.push(item);
      else byArea.set(item.area, [item]);
    }
    return areas.filter(area => byArea.has(area)).map(area => ({ area, items: byArea.get(area) ?? [] }));
  }, [items]);

  /** "highlights[1].en" → "English highlight 2" / "النقطة 2 بالإنجليزية". */
  const inWords = (entry: string): string => {
    const match = missingPattern.exec(entry);
    if (!match) return entry;
    const [, field, index, side] = match;
    const word = fieldWords[lang][field] ?? field;
    const named = index === undefined ? word : `${word} ${Number(index) + 1}`;
    return s(side === 'ar' ? 'missingAr' : 'missingEn').replace('{field}', named);
  };

  return (
    <section className="admin-dash">
      <h1>{s('title')}</h1>
      {email ? <p className="admin-hint">{s('signedIn').replace('{email}', email)}</p> : null}
      <p className="admin-hint">
        {s('publicLead')} <a href="/en">{s('publicEn')}</a> · <a href="/ar">{s('publicAr')}</a>
      </p>

      {failure ? (
        <p className="admin-dash-failed">
          <span className="admin-error" role="alert">
            {generalError(failure.error, t('error.generic')) ?? t('error.load')}
          </span>{' '}
          <button type="button" onClick={() => setAttempt(n => n + 1)}>
            {t('action.retry')}
          </button>
        </p>
      ) : items === null ? (
        <p>{t('state.loading')}</p>
      ) : grouped.length === 0 ? (
        <div className="admin-dash-done">
          <p className="admin-ok">{s('complete')}</p>
          <p className="admin-hint">{s('completeHint')}</p>
        </div>
      ) : (
        <>
          <p>{s('lead')}</p>
          {grouped.map(group => (
            <section key={group.area} className="admin-dash-area">
              <h2>{s(`area.${group.area}`)}</h2>
              <p className="admin-hint">{s('count').replace('{n}', String(group.items.length))}</p>
              <ul className="admin-dash-items">
                {group.items.map(item => (
                  <li key={`${item.area}:${item.id ?? 'one'}`}>
                    <Link to={linkFor(item)}>{item.label}</Link>
                    <span className="admin-dash-missing">{item.missing.map(inWords).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </section>
  );
}
