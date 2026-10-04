import { Navigate, Route, Routes, useParams } from 'react-router';
import { isLang } from './paths';
import { useHome, useProject } from './data';
import { usePageTitle } from './title';
import type { HomeData, Lang, PageData } from './types';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { JourneyPage } from './pages/JourneyPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectPage } from './pages/ProjectPage';
import { NotFoundPage } from './pages/NotFoundPage';

function WithHome({ kind, render }: { kind: Exclude<PageData['kind'], 'admin' | 'project' | 'notfound'>; render: (home: HomeData) => JSX.Element }) {
  const { lang } = useParams();
  const safe: Lang = isLang(lang) ? lang : 'en';
  const home = useHome(safe);
  usePageTitle(isLang(lang) ? kind : 'notfound', safe, home);
  if (!isLang(lang)) return <Layout lang="en"><NotFoundPage lang="en" /></Layout>;
  return <Layout lang={safe} name={home?.profile.name}>{home ? render(home) : null}</Layout>;
}

function ProjectRoute() {
  const { lang, slug = '' } = useParams();
  const safe: Lang = isLang(lang) ? lang : 'en';
  const project = useProject(safe, slug);
  const home = useHome(safe);
  usePageTitle(project === undefined ? 'project' : project ? 'project' : 'notfound', safe, project === undefined ? null : home, project ?? null);
  return (
    <Layout lang={safe} name={home?.profile.name}>
      {project === undefined ? null : project ? <ProjectPage project={project} /> : <NotFoundPage lang={safe} />}
    </Layout>
  );
}

/** Unknown paths keep the language of their first segment, as the server's 404 does. */
function NotFoundRoute() {
  const first = window.location.pathname.split('/').filter(Boolean)[0];
  const lang: Lang = isLang(first) ? first : 'en';
  const home = useHome(lang);
  usePageTitle('notfound', lang, home);
  return <Layout lang={lang} name={home?.profile.name}><NotFoundPage lang={lang} /></Layout>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={navigator.language.startsWith('ar') ? '/ar' : '/en'} replace />} />
      <Route path="/:lang" element={<WithHome kind="home" render={home => <HomePage home={home} />} />} />
      <Route path="/:lang/journey" element={<WithHome kind="journey" render={home => <JourneyPage home={home} />} />} />
      <Route path="/:lang/projects" element={<WithHome kind="projects" render={home => <ProjectsPage home={home} />} />} />
      <Route path="/:lang/projects/:slug" element={<ProjectRoute />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}
