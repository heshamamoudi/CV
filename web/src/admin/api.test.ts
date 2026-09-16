import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, onUnauthorized } from './api';

function reply(status: number, body?: unknown, contentType = 'application/json') {
  if (body === undefined) return new Response(null, { status });
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(text, { status, headers: { 'Content-Type': contentType } });
}

function stub(response: Response) {
  const fetchStub = vi.fn().mockResolvedValue(response);
  globalThis.fetch = fetchStub as unknown as typeof fetch;
  return fetchStub;
}

afterEach(() => vi.restoreAllMocks());

describe('the admin API client', () => {
  it('reads with the session cookie and returns the parsed body', async () => {
    const fetchStub = stub(reply(200, { email: 'owner@example.com' }));

    const me = await api<{ email: string }>('/api/admin/me');

    expect(me.email).toBe('owner@example.com');
    const [url, init] = fetchStub.mock.calls[0];
    expect(url).toBe('/api/admin/me');
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('same-origin');
    expect(init.body).toBeUndefined();
  });

  it('sends JSON for a write and resolves nothing for 204', async () => {
    const fetchStub = stub(reply(204));

    const result = await api('/api/admin/profile', { method: 'PUT', body: { headline: { en: 'Lead', ar: 'قائد' } } });

    expect(result).toBeUndefined();
    const init = fetchStub.mock.calls[0][1];
    expect(init.method).toBe('PUT');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ headline: { en: 'Lead', ar: 'قائد' } });
  });

  it('turns a validation problem into field messages', async () => {
    stub(reply(400, { title: 'One or more validation errors occurred.', status: 400, errors: { 'headline.ar': ['at most 200 characters'] } }));

    const error = await api('/api/admin/profile', { method: 'PUT', body: {} }).catch((e: unknown) => e) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.field('headline.ar')).toBe('at most 200 characters');
    expect(error.field('headline.en')).toBeUndefined();
  });

  it('reports an expired session once, to whoever is listening', async () => {
    stub(reply(401, { error: 'not signed in' }));
    const expired = vi.fn();
    const stopListening = onUnauthorized(expired);

    const error = await api('/api/admin/profile').catch((e: unknown) => e) as ApiError;

    expect(error.status).toBe(401);
    expect(expired).toHaveBeenCalledTimes(1);
    stopListening();
  });

  it('lets the browser write the multipart boundary for an upload', async () => {
    const fetchStub = stub(reply(201, { id: 'x' }));
    const form = new FormData();
    form.append('fileName', 'hero.webp');

    await api('/api/admin/media', { form });

    const init = fetchStub.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('still throws something readable when the error body is not JSON', async () => {
    stub(reply(502, '<html>Bad gateway</html>', 'text/html'));

    const error = await api('/api/admin/profile').catch((e: unknown) => e) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.message).toMatch(/502/);
    expect(error.errors).toEqual({});
  });
});
