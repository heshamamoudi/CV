import { Component, useEffect, useState, type ReactNode } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router';
import { onUnauthorized } from './api';
import { Shell } from './components/Shell';
import { useAdminLang } from './useAdminLang';
import { DashboardScreen } from './screens/DashboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { JourneyScreen } from './screens/JourneyScreen';
import { ProjectsScreen } from './screens/ProjectsScreen';
import { ListsScreen } from './screens/ListsScreen';
import { MediaScreen } from './screens/MediaScreen';
import { CvScreen } from './screens/CvScreen';
import { SeoScreen } from './screens/SeoScreen';
import './admin.css';

class Boundary extends Component<{ children: ReactNode; message: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="admin-error" role="alert">
        {this.props.message}
      </p>
    );
  }
}

function NotFound() {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{t('error.notFound')}</h1>
      <p>
        <Link to="/admin">{t('nav.dashboard')}</Link>
      </p>
    </section>
  );
}

export default function AdminApp() {
  const { t } = useAdminLang();
  const { pathname } = useLocation();
  const [expired, setExpired] = useState(false);

  // Any screen's 401 means the same thing, and it is said once, here.
  useEffect(() => onUnauthorized(() => setExpired(true)), []);

  if (expired) {
    return (
      <Shell>
        <p className="admin-error" role="alert">
          {t('error.session')} <button type="button" onClick={() => window.location.reload()}>{t('action.retry')}</button>
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <Boundary key={pathname} message={t('error.generic')}>
        <Routes>
          <Route path="/admin" element={<DashboardScreen />} />
          <Route path="/admin/profile" element={<ProfileScreen />} />
          <Route path="/admin/journey" element={<JourneyScreen />} />
          <Route path="/admin/projects" element={<ProjectsScreen />} />
          <Route path="/admin/lists" element={<ListsScreen />} />
          <Route path="/admin/media" element={<MediaScreen />} />
          <Route path="/admin/cv" element={<CvScreen />} />
          <Route path="/admin/seo" element={<SeoScreen />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Boundary>
    </Shell>
  );
}
