import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { BrandMark } from '../../components/BrandMark';
import { api } from '../api';
import { useAdminLang } from '../useAdminLang';
import type { AdminStringKey } from '../strings';

const pages: { to: string; key: AdminStringKey }[] = [
  { to: '/admin', key: 'nav.dashboard' },
  { to: '/admin/profile', key: 'nav.profile' },
  { to: '/admin/journey', key: 'nav.journey' },
  { to: '/admin/projects', key: 'nav.projects' },
  { to: '/admin/lists', key: 'nav.lists' },
  { to: '/admin/media', key: 'nav.media' },
  { to: '/admin/cv', key: 'nav.cv' },
  { to: '/admin/seo', key: 'nav.seo' },
  { to: '/admin/messages', key: 'nav.messages' },
];

export function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, t } = useAdminLang();
  const [email, setEmail] = useState('');
  const { pathname } = useLocation();
  const page = pages.find(page => page.to === pathname);
  const previewPath = pathname === '/admin/journey' ? '/journey' : pathname === '/admin/projects' ? '/projects' : pathname === '/admin/lists' ? '#about' : pathname === '/admin/messages' ? '#contact' : '';

  useEffect(() => {
    let live = true;
    api<{ email: string }>('/api/admin/me')
      .then(me => live && setEmail(me.email))
      .catch(() => { /* the app shows the session panel; the header simply stays quiet */ });
    return () => { live = false; };
  }, []);

  return (
    <div className="admin">
      <header className="admin-header">
        <NavLink className="admin-brand" to="/admin" aria-label={t('app.title')}>
          <BrandMark /><span><strong>{t('app.title')}</strong><small>{lang === 'ar' ? 'مساحة المحتوى' : 'CONTENT STUDIO'}</small></span>
        </NavLink>
        <nav className="admin-nav" aria-label={t('app.title')}>
          {pages.map((page, index) => (
            <NavLink key={page.to} to={page.to} end={page.to === '/admin'}>
              <span className="admin-nav-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{t(page.key)}
            </NavLink>
          ))}
        </nav>
        <div className="admin-who">
          {email ? <span className="admin-email">{email}</span> : null}
          <a href={`/${lang}`} target="_blank" rel="noopener noreferrer">{t('app.public')} ↗</a>
          <button type="button" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {t('lang.switch')}
          </button>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-screenbar">
          <span>{lang === 'ar' ? 'المحتوى' : 'CONTENT'} <b>/ {page ? t(page.key) : '404'}</b></span>
          <a href={`/${lang}${previewPath}`} target="_blank" rel="noopener noreferrer">{lang === 'ar' ? 'معاينة الموقع المحفوظ' : 'Preview saved site'} ↗</a>
        </div>
        {children}
      </main>
    </div>
  );
}
