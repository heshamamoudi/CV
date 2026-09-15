import { Link } from 'react-router-dom';
import type { HomeData } from '../types';
import { useStrings } from '../i18n/useStrings';
import { JourneyList } from '../components/JourneyList';

export function HomePage({ home }: { home: HomeData }) {
  const t = useStrings(home.lang);
  const p = home.profile;
  return (
    <>
      <section id="hero">
        <p>{p.eyebrow}</p>
        <h1>{p.name}</h1>
        <p>{p.headline}</p>
        <h2>{p.heroTitle}</h2>
        <p>{p.heroSubtitle}</p>
      </section>
      <section id="journey">
        <h2>{t('section.journey')}</h2>
        <JourneyList journey={home.journey} lang={home.lang} />
      </section>
      {home.featuredProject && (
        <section id="project">
          <h2>{t('section.project')}</h2>
          <article>
            <h3><Link to={`/${home.lang}/projects/${home.featuredProject.slug}`}>{home.featuredProject.title}</Link></h3>
            <p>{home.featuredProject.summary}</p>
          </article>
        </section>
      )}
      <section id="tech">
        <h2>{t('section.tech')}</h2>
        {home.technologies.map(g => (
          <div key={g.category}>
            <h3>{g.category}</h3>
            <ul>{g.items.map(i => <li key={i}>{i}</li>)}</ul>
          </div>
        ))}
      </section>
      <section id="about">
        <h2>{t('section.about')}</h2>
        <p>{p.about}</p>
        <p>{p.summary}</p>
      </section>
      <section id="contact">
        <h2>{t('section.contact')}</h2>
        <address>
          <a href={`mailto:${p.email}`}>{p.email}</a> <a href={p.linkedInUrl} rel="me">LinkedIn</a>{' '}
          <a href={p.gitHubUrl} rel="me">GitHub</a> {p.location}
        </address>
      </section>
    </>
  );
}
