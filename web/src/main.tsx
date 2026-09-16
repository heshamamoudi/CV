import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { readEmbedded } from './data';
import './styles.css';

// A separate chunk: a visitor to /en never downloads the admin app.
const AdminApp = lazy(() => import('./admin/AdminApp'));
const isAdmin = readEmbedded()?.kind === 'admin';

// The server has already written the page into #root. React replaces it with
// the same content built from the same embedded data, then owns navigation.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      {isAdmin ? (
        <Suspense fallback={null}>
          <AdminApp />
        </Suspense>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </StrictMode>,
);
