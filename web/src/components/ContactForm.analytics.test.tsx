import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ContactForm } from './ContactForm';

const events: unknown[][] = [];

beforeEach(() => {
  events.length = 0;
  window.__portfolioAnalyticsEnabled = true;
  window.gtag = (...args: unknown[]) => { events.push(args); };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, headers: new Headers() }));
});

afterEach(() => {
  window.__portfolioAnalyticsEnabled = false;
  window.gtag = undefined;
  vi.unstubAllGlobals();
});

it('records a successful contact lead without sending form contents', async () => {
  render(<ContactForm lang="en" />);
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Private Visitor' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'private@example.com' } });
  fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'A private subject' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Private message content' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Send message' }).closest('form')!);

  await screen.findByText('Message received.');
  await waitFor(() => expect(events).toContainEqual(['event', 'generate_lead', {
    form_name: 'contact', site_language: 'en',
  }]));
  expect(JSON.stringify(events)).not.toMatch(/Private Visitor|private@example\.com|A private subject|Private message content/);
});
