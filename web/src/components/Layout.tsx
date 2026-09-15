import { useEffect, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Lang } from '../types';
import { useStrings } from '../i18n/useStrings';
import { otherLang, twinPath } from '../paths';

export function Layout({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t = useStrings(lang);
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  return (
    <>
      <header>
        <nav>
          <Link to={`/${lang}`}>{t('nav.home')}</Link>
          <Link to={`/${lang}/journey`}>{t('nav.journey')}</Link>
          <Link to={`/${lang}/projects`}>{t('nav.projects')}</Link>
          <Link to={twinPath(pathname.replace(/\/$/, ''), lang)} hrefLang={otherLang(lang)}>{t('language.other')}</Link>
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
