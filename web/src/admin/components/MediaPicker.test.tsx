import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MediaPicker } from './MediaPicker';
import { setAdminLang } from '../useAdminLang';
import type { MediaView } from '../types';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const image = (id: string, fileName: string, alt: string): MediaView => ({
  id,
  fileName,
  width: 1600,
  height: 1000,
  alt: { en: alt, ar: '' },
  widths: [640, 1280],
  previewUrl: `/media/${id}/640.webp`,
  createdAt: '2026-09-16T08:00:00.000Z',
});

const harbour = image('aaaa1111', 'harbour.jpg', 'The harbour');
const skyline = image('bbbb2222', 'skyline.jpg', 'The skyline');

function serve(body: unknown = [harbour, skyline], status = 200) {
  const stub = vi.fn(async () => json(body, status));
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

function show(value: string | null, onChange: (id: string | null) => void) {
  return render(
    <MemoryRouter>
      <MediaPicker label="Hero image" value={value} onChange={onChange} />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  setAdminLang('en');
  localStorage.clear();
});

describe('choosing an image for a field', () => {
  it('says when nothing is chosen', () => {
    serve();

    show(null, vi.fn());

    expect(screen.getByRole('group', { name: 'Hero image' })).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('reports the id of the image that was picked, and closes', async () => {
    const onChange = vi.fn();
    serve();

    show(null, onChange);
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'The skyline' }));

    expect(onChange).toHaveBeenCalledWith('bbbb2222');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('reports null when the field is cleared', async () => {
    const onChange = vi.fn();
    serve();

    const view = show('aaaa1111', onChange);

    // The id alone is not a picture: the library is read so the field can show one.
    expect(await screen.findByText('The harbour')).toBeInTheDocument();
    expect(view.container.querySelector('.admin-picker img')).toHaveAttribute('src', harbour.previewUrl);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('closes on Escape and gives focus back', async () => {
    serve();

    show(null, vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Choose' })).toHaveFocus();
  });

  it('says so when the library cannot be read, instead of an empty dialog', async () => {
    serve({ title: 'no' }, 500);

    show(null, vi.fn());
    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be loaded/i);
  });
});
