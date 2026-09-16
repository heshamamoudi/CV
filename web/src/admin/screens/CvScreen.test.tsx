import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { CvScreen } from './CvScreen';
import { setAdminLang } from '../useAdminLang';
import type { CvFileView } from '../types';

const english: CvFileView = { lang: 'en', fileName: 'cv-en.pdf', size: 245_760, uploadedAt: '2026-09-01T10:00:00Z' };
const arabic: CvFileView = { lang: 'ar', fileName: 'cv-ar.pdf', size: 1_572_864, uploadedAt: '2026-09-02T10:00:00Z' };

type Reply = { status: number; body?: unknown };

/** Answers each request from one handler, so a test can watch exactly what was asked for. */
function serve(handler: (url: string, init: RequestInit) => Reply) {
  const stub = vi.fn(async (url: string, init: RequestInit = {}) => {
    const reply = handler(url, init);
    if (reply.status === 204) return new Response(null, { status: 204 });
    return new Response(JSON.stringify(reply.body ?? {}), {
      status: reply.status,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  globalThis.fetch = stub as unknown as typeof fetch;
  return stub;
}

const listing = (files: CvFileView[]) => (url: string, init: RequestInit): Reply =>
  url === '/api/admin/cv' && init.method === 'GET' ? { status: 200, body: files } : { status: 404 };

function pdf(name: string, size = 12_345) {
  const file = new File(['%PDF-1.7'], name, { type: 'application/pdf' });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

const show = () =>
  render(
    <MemoryRouter>
      <CvScreen />
    </MemoryRouter>,
  );

const choose = (label: string, file: File) =>
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });

afterEach(() => {
  vi.restoreAllMocks();
  setAdminLang('en');
  localStorage.clear();
});

describe('the CV screen', () => {
  it('shows each language file and where it can be downloaded', async () => {
    serve(listing([english, arabic]));

    show();

    expect(await screen.findByText('cv-en.pdf')).toBeInTheDocument();
    expect(screen.getByText('240 KB')).toBeInTheDocument();
    expect(screen.getByText('1.5 MB')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Open the English download' });
    expect(link).toHaveAttribute('href', '/en/cv');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('refuses a file that is not a PDF without asking the server', async () => {
    const fetched = serve(listing([english, arabic]));

    show();
    await screen.findByText('cv-en.pdf');
    expect(fetched).toHaveBeenCalledTimes(1);

    choose('Replace the English file', new File(['x'], 'photo.png', { type: 'image/png' }));

    expect(await screen.findByText('That file is not a PDF. Choose a PDF and try again.')).toBeInTheDocument();
    expect(fetched).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('refuses a PDF over 10 MB without asking the server', async () => {
    const fetched = serve(listing([english, arabic]));

    show();
    await screen.findByText('cv-en.pdf');

    choose('Replace the Arabic file', pdf('huge.pdf', 11 * 1024 * 1024));

    expect(await screen.findByText(/larger than 10 MB/)).toBeInTheDocument();
    expect(fetched).toHaveBeenCalledTimes(1);
  });

  it('uploads the chosen PDF and reads the list again', async () => {
    let files = [arabic];
    const fetched = serve((url, init) => {
      if (url === '/api/admin/cv' && init.method === 'GET') return { status: 200, body: files };
      if (url === '/api/admin/cv/en' && init.method === 'PUT') {
        files = [english, arabic];
        return { status: 204 };
      }
      return { status: 404 };
    });

    show();
    await screen.findByText('cv-ar.pdf');

    choose('Upload the English file', pdf('resume.pdf'));
    expect(screen.getByText(/Ready to upload: resume\.pdf/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('cv-en.pdf')).toBeInTheDocument();
    const upload = fetched.mock.calls.find(([url, init]) => url === '/api/admin/cv/en' && init?.method === 'PUT');
    expect(upload).toBeDefined();
    const form = upload?.[1]?.body as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect((form.get('file') as File).name).toBe('resume.pdf');
    expect(fetched.mock.calls.filter(([url, init]) => url === '/api/admin/cv' && init?.method === 'GET')).toHaveLength(2);
  });

  it('puts the server refusal under the file it belongs to', async () => {
    serve((url, init) => {
      if (url === '/api/admin/cv' && init.method === 'GET') return { status: 200, body: [english, arabic] };
      if (url === '/api/admin/cv/ar' && init.method === 'PUT')
        return { status: 400, body: { title: 'One or more validation errors occurred.', status: 400, errors: { file: ['must be a PDF'] } } };
      return { status: 404 };
    });

    show();
    await screen.findByText('cv-ar.pdf');

    choose('Replace the Arabic file', pdf('renamed.pdf'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('must be a PDF')).toBeInTheDocument();
  });

  it('asks before deleting a CV', async () => {
    let files = [english, arabic];
    const fetched = serve((url, init) => {
      if (url === '/api/admin/cv' && init.method === 'GET') return { status: 200, body: files };
      if (url === '/api/admin/cv/ar' && init.method === 'DELETE') {
        files = [english];
        return { status: 204 };
      }
      return { status: 404 };
    });

    show();
    await screen.findByText('cv-ar.pdf');

    fireEvent.click(screen.getByRole('button', { name: 'Delete the Arabic CV' }));
    expect(fetched.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    expect(screen.getByText(/Delete the Arabic CV for good/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(fetched.mock.calls.some(([url, init]) => url === '/api/admin/cv/ar' && init?.method === 'DELETE')).toBe(true),
    );
    await waitFor(() => expect(screen.queryByText('cv-ar.pdf')).not.toBeInTheDocument());
  });

  it('says which file visitors are given when one language is missing', async () => {
    serve(listing([arabic]));

    show();

    expect(
      await screen.findByText('No English CV yet, so visitors who ask for it are given the Arabic file.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/404 today/)).not.toBeInTheDocument();
  });

  it('says the download link is a 404 when neither language has a file', async () => {
    serve(listing([]));

    show();

    expect(await screen.findByText(/the download link is a 404 today/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Open the English download' })).not.toBeInTheDocument();
  });
});
