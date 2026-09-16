import { Component, useEffect, useState, type ReactNode } from 'react';
import { Link, Route, Routes } from 'react-router';
import { onUnauthorized } from './api';
import { Shell } from './components/Shell';
import { useAdminLang } from './useAdminLang';
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

function Placeholder({ title }: { title: string }) {
  const { t } = useAdminLang();
  return (
    <section>
      <h1>{title}</h1>
      <p>{t('state.loading')}</p>
    </section>
  );
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
      <Boundary message={t('error.generic')}>
        <Routes>
          <Route path="/admin" element={<Placeholder title={t('nav.dashboard')} />} />
          <Route path="/admin/profile" element={<Placeholder title={t('nav.profile')} />} />
          <Route path="/admin/journey" element={<Placeholder title={t('nav.journey')} />} />
          <Route path="/admin/projects" element={<Placeholder title={t('nav.projects')} />} />
          <Route path="/admin/lists" element={<Placeholder title={t('nav.lists')} />} />
          <Route path="/admin/media" element={<Placeholder title={t('nav.media')} />} />
          <Route path="/admin/cv" element={<Placeholder title={t('nav.cv')} />} />
          <Route path="/admin/seo" element={<Placeholder title={t('nav.seo')} />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Boundary>
    </Shell>
  );
}
