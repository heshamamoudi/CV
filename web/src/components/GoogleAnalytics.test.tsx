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
  window.__portfolioGaPageLocation = undefined;
  window.__portfolioGaSection = undefined;
  window.__portfolioAnalyticsEnabled = false;
  window.history.replaceState({}, '', '/en');
});

afterEach(() => {
  document.head.querySelectorAll('meta[name="ga-measurement-id"], script[data-portfolio-analytics]').forEach(node => node.remove());
  window.dataLayer = undefined;
  window.gtag = undefined;
  window.__portfolioGaId = undefined;
  window.__portfolioGaPage = undefined;
  window.__portfolioGaPageLocation = undefined;
  window.__portfolioGaSection = undefined;
  window.__portfolioAnalyticsEnabled = false;
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

  view.rerender(<GoogleAnalytics consent="accepted" pathname="/en/projects" />);
  await waitFor(() => expect(window.dataLayer?.filter(event => event[0] === 'consent' && event[1] === 'update')
    .at(-1)?.[2]).toMatchObject({ analytics_storage: 'granted' }));
  expect(window.__portfolioAnalyticsEnabled).toBe(true);
  expect(document.querySelectorAll('script[data-portfolio-analytics]')).toHaveLength(1);
});

it('tracks section navigation and safe campaign parameters without duplicate hash pageviews', async () => {
  window.history.replaceState({}, '', '/en?utm_source=newsletter&gclid=click-id&email=private@example.com');
  const view = render(<GoogleAnalytics consent="accepted" pathname="/en" hash="#work" />);
  await waitFor(() => expect(window.dataLayer?.some(event => event[0] === 'event' && event[1] === 'section_navigation' &&
    (event[2] as { section_name?: string; site_language?: string }).section_name === 'work')).toBe(true));
  const pageView = window.dataLayer?.find(event => event[0] === 'event' && event[1] === 'page_view')?.[2] as
    { page_location?: string; site_language?: string };
  expect(pageView.page_location).toContain('utm_source=newsletter');
  expect(pageView.page_location).toContain('gclid=click-id');
  expect(pageView.page_location).not.toContain('email=');
  expect(pageView.site_language).toBe('en');

  view.rerender(<GoogleAnalytics consent="accepted" pathname="/en" hash="#journey" />);
  await waitFor(() => expect(window.dataLayer?.some(event => event[0] === 'event' && event[1] === 'section_navigation' &&
    (event[2] as { section_name?: string }).section_name === 'journey')).toBe(true));
  expect(window.dataLayer?.filter(event => event[0] === 'event' && event[1] === 'page_view')).toHaveLength(1);
  view.rerender(<GoogleAnalytics consent="accepted" pathname="/ar" hash="#work" />);
  await waitFor(() => expect(window.dataLayer?.filter(event => event[0] === 'event' && event[1] === 'page_view')).toHaveLength(2));
  expect(window.dataLayer?.some(event => event[0] === 'event' && event[1] === 'section_navigation' &&
    (event[2] as { section_name?: string; site_language?: string }).section_name === 'work' &&
    (event[2] as { site_language?: string }).site_language === 'ar')).toBe(true);
  view.rerender(<GoogleAnalytics consent="accepted" pathname="/en/projects/sample" />);
  await waitFor(() => expect(window.dataLayer?.some(event => event[0] === 'event' && event[1] === 'project_navigation' &&
    (event[2] as { project_id?: string }).project_id === 'sample')).toBe(true));
  view.rerender(<GoogleAnalytics consent="accepted" pathname="/en" hash="#work" />);
  await waitFor(() => expect(window.dataLayer?.filter(event => event[0] === 'event' && event[1] === 'section_navigation' &&
    (event[2] as { section_name?: string }).section_name === 'work')).toHaveLength(3));
});
