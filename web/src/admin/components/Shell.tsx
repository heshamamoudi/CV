import { useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router';
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
];

export function Shell({ children }: { children: ReactNode }) {
  const { lang, setLang, t } = useAdminLang();
  const [email, setEmail] = useState('');

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
        <strong>{t('app.title')}</strong>
        <nav className="admin-nav">
          {pages.map(page => (
            <NavLink key={page.to} to={page.to} end={page.to === '/admin'}>
              {t(page.key)}
            </NavLink>
          ))}
        </nav>
        <div className="admin-who">
          {email ? <span className="admin-email">{email}</span> : null}
          <a href="/en">{t('app.public')}</a>
          <button type="button" onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}>
            {t('lang.switch')}
          </button>
        </div>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
