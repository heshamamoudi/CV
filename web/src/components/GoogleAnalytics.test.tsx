import { render, waitFor } from '@testing-library/react';
import { GoogleAnalytics } from './GoogleAnalytics';

beforeEach(() => {
  document.head.querySelectorAll('meta[name="ga-measurement-id"], script[data-portfolio-analytics]').forEach(node => node.remove());
  const meta = document.createElement('meta');
  meta.name = 'ga-measurement-id';
  meta.content = 'G-2K5BFWH1Z8';
  document.head.append(meta);
  window.dataLayer = undefined;
  window.gtag = undefined;
  window.__portfolioGaId = undefined;
  window.__portfolioGaPage = undefined;
});

afterEach(() => {
  document.head.querySelectorAll('meta[name="ga-measurement-id"], script[data-portfolio-analytics]').forEach(node => node.remove());
  window.dataLayer = undefined;
  window.gtag = undefined;
  window.__portfolioGaId = undefined;
  window.__portfolioGaPage = undefined;
});

it('keeps the Google tag off until acceptance, then tracks routes and revocation', async () => {
  const view = render(<GoogleAnalytics consent={null} pathname="/en" />);
  expect(document.querySelector('script[data-portfolio-analytics]')).toBeNull();
  expect(window.dataLayer).toBeUndefined();

  view.rerender(<GoogleAnalytics consent="accepted" pathname="/en" />);
  await waitFor(() => expect(window.dataLayer?.some(event => event[0] === 'event' && event[1] === 'page_view')).toBe(true));
  expect(window.dataLayer?.every(event => Object.prototype.toString.call(event) === '[object Arguments]')).toBe(true);
  expect(document.querySelector<HTMLScriptElement>('script[data-portfolio-analytics]')?.src)
    .toBe('https://www.googletagmanager.com/gtag/js?id=G-2K5BFWH1Z8');

  view.rerender(<GoogleAnalytics consent="accepted" pathname="/en/projects" />);
  await waitFor(() => expect(window.dataLayer?.some(event => event[0] === 'event' && event[1] === 'page_view' &&
    (event[2] as { page_path?: string }).page_path === '/en/projects')).toBe(true));

  view.rerender(<GoogleAnalytics consent="rejected" pathname="/en/projects" />);
  await waitFor(() => expect(window.dataLayer?.some(event => event[0] === 'consent' && event[1] === 'update' &&
    (event[2] as { analytics_storage?: string }).analytics_storage === 'denied')).toBe(true));
});
