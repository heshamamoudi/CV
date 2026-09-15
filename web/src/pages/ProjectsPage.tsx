import { Link } from 'react-router';
import type { HomeData } from '../types';
import { useStrings } from '../i18n/useStrings';

export function ProjectsPage({ home }: { home: HomeData }) {
  const t = useStrings(home.lang);
  return (
    <>
      <h1>{t('page.projects')}</h1>
      {home.projects.map(p => (
        <article key={p.slug}>
          <h3><Link to={`/${home.lang}/projects/${p.slug}`}>{p.title}</Link></h3>
          <p>{p.summary}</p>
        </article>
      ))}
    </>
  );
}
