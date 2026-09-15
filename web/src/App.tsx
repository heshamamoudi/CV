import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import { isLang } from './paths';
import { useHome, useProject } from './data';
import type { HomeData, Lang } from './types';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { JourneyPage } from './pages/JourneyPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectPage } from './pages/ProjectPage';
import { NotFoundPage } from './pages/NotFoundPage';

function WithHome({ render }: { render: (home: HomeData) => JSX.Element }) {
  const { lang } = useParams();
  const safe: Lang = isLang(lang) ? lang : 'en';
  const home = useHome(safe);
  if (!isLang(lang)) return <Layout lang="en"><NotFoundPage lang="en" /></Layout>;
  return <Layout lang={safe}>{home ? render(home) : null}</Layout>;
}

function ProjectRoute() {
  const { lang, slug = '' } = useParams();
  const safe: Lang = isLang(lang) ? lang : 'en';
  const project = useProject(safe, slug);
  return (
    <Layout lang={safe}>
      {project === undefined ? null : project ? <ProjectPage project={project} /> : <NotFoundPage lang={safe} />}
    </Layout>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={navigator.language.startsWith('ar') ? '/ar' : '/en'} replace />} />
      <Route path="/:lang" element={<WithHome render={home => <HomePage home={home} />} />} />
      <Route path="/:lang/journey" element={<WithHome render={home => <JourneyPage home={home} />} />} />
      <Route path="/:lang/projects" element={<WithHome render={home => <ProjectsPage home={home} />} />} />
      <Route path="/:lang/projects/:slug" element={<ProjectRoute />} />
      <Route path="*" element={<Layout lang="en"><NotFoundPage lang="en" /></Layout>} />
    </Routes>
  );
}
