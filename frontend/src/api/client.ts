import { API_BASE_URL } from '../config';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: any;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Not our app responding at all — most often Cloudflare/Render's own
      // HTML error page during a cold start or outage (a bare `<` is the
      // classic signature), not a JSON error from our own API.
      throw new ApiError(
        res.status,
        res.ok
          ? 'Unexpected response from the server. Please try again.'
          : 'The service is waking up or temporarily unavailable — please try again in a moment.'
      );
    }
  }

  if (!res.ok) {
    const message = json?.message ?? json?.error ?? `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message);
  }

  return json?.data as T;
}
