export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The server's message for one field, e.g. "headline.ar". */
  field(name: string): string | undefined {
    return this.errors[name]?.[0];
  }
}

type Listener = () => void;
const expiredListeners = new Set<Listener>();

/** Called when the Access session is gone, so the app can say so once instead of every screen guessing. */
export function onUnauthorized(listener: Listener): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

type Init = { method?: string; body?: unknown; form?: FormData; signal?: AbortSignal };

/**
 * Every admin call. Same-origin only: the Access cookie rides along, and the
 * browser's own Origin / Sec-Fetch-Site headers are what the server checks for
 * a write - a page on another site cannot forge either.
 */
export async function api<T>(path: string, init: Init = {}): Promise<T> {
  const hasBody = init.body !== undefined;
  const method = init.method ?? (hasBody || init.form ? 'POST' : 'GET');
  const headers: Record<string, string> = { Accept: 'application/json' };
  // Never set Content-Type for FormData: only the browser knows the boundary.
  if (hasBody && !init.form) headers['Content-Type'] = 'application/json';

  const reply = await fetch(path, {
    method,
    credentials: 'same-origin',
    signal: init.signal,
    headers,
    body: init.form ?? (hasBody ? JSON.stringify(init.body) : undefined),
  });

  const text = await reply.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    parsed = undefined; // an error page, not our API
  }

  if (!reply.ok) {
    if (reply.status === 401) for (const listener of [...expiredListeners]) listener();
    const problem = parsed as { title?: string; detail?: string; errors?: Record<string, string[]> } | undefined;
    throw new ApiError(
      reply.status,
      problem?.detail ?? problem?.title ?? `Request failed (${reply.status})`,
      problem?.errors ?? {},
    );
  }

  return parsed as T;
}
