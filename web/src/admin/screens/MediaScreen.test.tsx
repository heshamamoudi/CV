import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { MediaScreen } from './MediaScreen';
import { setAdminLang } from '../useAdminLang';
import { ResizeError, resizeForUpload, type ResizedUpload } from '../resize';
import type { MediaView } from '../types';

// The screen's job is the form it sends and the words it says; the resizing has
// its own test, and jsdom cannot encode an image anyway.
vi.mock('../resize', async importOriginal => {
  const actual = await importOriginal<typeof import('../resize')>();
  return { ...actual, resizeForUpload: vi.fn() };
});

interface Call {
  url: string;
  init: RequestInit;
}

let calls: Call[] = [];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function serve(reply: (url: string, init: RequestInit) => Response) {
  calls = [];
  globalThis.fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    return reply(url, init);
  }) as unknown as typeof fetch;
}

const sent = (method: string) => calls.filter(call => call.init.method === method);

const photo: MediaView = {
  id: '11111111-1111-4111-8111-111111111111',
  fileName: 'harbour.jpg',
  width: 1600,
  height: 1000,
  alt: { en: 'The harbour', ar: 'الميناء' },
  widths: [640, 1280],
  previewUrl: '/media/11111111111141118111111111111111/640.webp',
  createdAt: '2026-09-16T08:00:00.000Z',
};

const resized = (type: 'image/webp' | 'image/jpeg' = 'image/webp'): ResizedUpload => ({
  width: 1600,
  height: 1000,
  type,
  renditions: [
    { width: 640, blob: new Blob(['small'], { type }) },
    { width: 1280, blob: new Blob(['large'], { type }) },
  ],
});

function show() {
  return render(
    <MemoryRouter>
      <MediaScreen />
    </MemoryRouter>,
  );
}

/** jsdom will not let a test assign input.files, so the property is replaced. */
function pick(input: HTMLElement, files: File[]) {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  fireEvent.change(input);
}

const jpeg = (name: string) => new File(['bytes'], name, { type: 'image/jpeg' });

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(resizeForUpload).mockReset();
  localStorage.clear();
  setAdminLang('en');
  localStorage.clear();
});

describe('uploading', () => {
  it('sends every field MediaAdmin reads, and only the widths the image has', async () => {
    serve((_url, init) => (init.method === 'POST' ? json({ ...photo, fileName: 'skyline.jpg' }, 201) : json([])));
    vi.mocked(resizeForUpload).mockResolvedValue(resized());

    show();
    pick(await screen.findByLabelText('Choose images'), [jpeg('skyline.jpg')]);

    await waitFor(() => expect(sent('POST')).toHaveLength(1));
    const form = sent('POST')[0].init.body as FormData;
    expect(sent('POST')[0].url).toBe('/api/admin/media');
    expect(form).toBeInstanceOf(FormData);
    expect(form.get('fileName')).toBe('skyline.jpg');
    expect(form.get('width')).toBe('1600');
    expect(form.get('height')).toBe('1000');
    expect(form.get('altEn')).toBe('');
    expect(form.get('altAr')).toBe('');
    expect((form.get('w640') as File).name).toBe('skyline-640.webp');
    expect((form.get('w1280') as File).name).toBe('skyline-1280.webp');
    expect(form.get('w1920')).toBeNull();
    expect(await screen.findByText('Uploaded')).toBeInTheDocument();
  });

  it('names the JPEG renditions as JPEGs', async () => {
    serve((_url, init) => (init.method === 'POST' ? json(photo, 201) : json([])));
    vi.mocked(resizeForUpload).mockResolvedValue(resized('image/jpeg'));

    show();
    pick(await screen.findByLabelText('Choose images'), [jpeg('skyline.jpg')]);

    await waitFor(() => expect(sent('POST')).toHaveLength(1));
    const form = sent('POST')[0].init.body as FormData;
    expect((form.get('w640') as File).name).toBe('skyline-640.jpg');
  });

  it('takes several files in a row and shows each one on its own', async () => {
    serve((_url, init) => {
      if (init.method !== 'POST') return json([]);
      const name = String((init.body as FormData).get('fileName'));
      return json({ ...photo, id: `id-${name}`, fileName: name }, 201);
    });
    vi.mocked(resizeForUpload).mockResolvedValue(resized());

    show();
    pick(await screen.findByLabelText('Choose images'), [jpeg('one.jpg'), jpeg('two.jpg')]);

    await waitFor(() => expect(sent('POST')).toHaveLength(2));
    expect(((sent('POST')[0].init.body as FormData).get('fileName'))).toBe('one.jpg');
    expect(((sent('POST')[1].init.body as FormData).get('fileName'))).toBe('two.jpg');
    // Each file has its own row, and each landed in the library.
    expect(screen.getAllByText('one.jpg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('two.jpg').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Uploaded')).toHaveLength(2);
  });

  it('says why one file was refused without sending it anywhere', async () => {
    serve(() => json([]));
    vi.mocked(resizeForUpload).mockRejectedValue(new ResizeError('not-an-image', '“cv.pdf” is not an image.'));

    show();
    pick(await screen.findByLabelText('Choose images'), [new File(['%PDF-'], 'cv.pdf', { type: 'application/pdf' })]);

    expect(await screen.findByText(/not an image/i)).toBeInTheDocument();
    expect(screen.getByText('Not uploaded')).toBeInTheDocument();
    expect(sent('POST')).toHaveLength(0);
  });
});

describe('the library', () => {
  it('writes alt text in both languages back to the image', async () => {
    serve((_url, init) => (init.method === 'PUT' ? new Response(null, { status: 204 }) : json([photo])));

    show();
    fireEvent.change(await screen.findByLabelText('English'), { target: { value: 'The old harbour' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(sent('PUT')).toHaveLength(1));
    expect(sent('PUT')[0].url).toBe(`/api/admin/media/${photo.id}`);
    expect(JSON.parse(sent('PUT')[0].init.body as string)).toEqual({ en: 'The old harbour', ar: 'الميناء' });
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it("puts the server's alt error under the box it belongs to", async () => {
    serve((_url, init) =>
      init.method === 'PUT'
        ? json({ title: 'One or more validation errors occurred.', status: 400, errors: { 'alt.ar': ['at most 300 characters'] } }, 400)
        : json([photo]),
    );

    show();
    fireEvent.change(await screen.findByLabelText('Arabic'), { target: { value: 'ميناء' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(screen.getByLabelText('Arabic')).toHaveAccessibleDescription(/at most 300 characters/));
    expect(screen.getByLabelText('English')).not.toHaveAttribute('aria-invalid');
  });

  it('shows each image with its file name and the widths that exist', async () => {
    serve(() => json([photo]));

    show();

    expect(await screen.findByAltText('The harbour')).toHaveAttribute('src', photo.previewUrl);
    expect(screen.getByText('harbour.jpg')).toBeInTheDocument();
    expect(screen.getByText(/Widths: 640, 1280/)).toBeInTheDocument();
  });

  it('asks before deleting, and names the file', async () => {
    serve((_url, init) => (init.method === 'DELETE' ? new Response(null, { status: 204 }) : json([photo])));

    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(sent('DELETE')).toHaveLength(0);
    expect(screen.getByText('Delete “harbour.jpg”? It cannot be brought back.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(sent('DELETE')).toHaveLength(1));
    expect(sent('DELETE')[0].url).toBe(`/api/admin/media/${photo.id}`);
    await waitFor(() => expect(screen.queryByText('harbour.jpg')).not.toBeInTheDocument());
  });

  it('says an image is in use rather than that the request failed', async () => {
    serve((_url, init) =>
      init.method === 'DELETE' ? json({ title: 'this image is in use', status: 409 }, 409) : json([photo]),
    );

    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const said = await screen.findByRole('alert');
    expect(said).toHaveTextContent(/in use/i);
    expect(said).toHaveTextContent(/profile, project or SEO page/i);
    expect(said).not.toHaveTextContent(/failed/i);
    // The image is still there, because it was not deleted.
    expect(screen.getByText('harbour.jpg')).toBeInTheDocument();
  });

  it('offers to try again when the library will not load', async () => {
    let attempts = 0;
    serve(() => {
      attempts += 1;
      return attempts === 1 ? json({ title: 'no' }, 500) : json([photo]);
    });

    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('harbour.jpg')).toBeInTheDocument();
  });
});
