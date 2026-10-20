import type { PageMeta } from '@/types';

const API_BASE = `${import.meta.env.VITE_API_URL ?? ''}/api/v1`;
const TOKEN_KEY = 'ideal.token';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details: unknown = null,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error: { code: string; message: string; details: unknown } | null;
  meta: PageMeta | null;
}

export const tokenStore = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* private rejimda localStorage yo'q bo'lishi mumkin */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* e'tiborsiz */
    }
  },
};

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

type Query = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function send<T>(method: string, path: string, opts: { body?: unknown; query?: Query; form?: FormData } = {}) {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body: opts.form ?? (opts.body !== undefined ? JSON.stringify(opts.body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Server bilan aloqa yo\'q. Internetni tekshiring');
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;
  if (!res.ok || !json?.success) {
    if (res.status === 401 && token && tokenStore.get() === token) onUnauthorized?.();
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? 'Kutilmagan xatolik',
      json?.error?.details ?? null,
    );
  }
  return json;
}

export const api = {
  get: async <T>(path: string, query?: Query) => (await send<T>('GET', path, { query })).data,
  page: async <T>(path: string, query?: Query) => {
    const r = await send<T>('GET', path, { query });
    return { data: r.data, meta: r.meta as PageMeta };
  },
  post: async <T>(path: string, body?: unknown) => (await send<T>('POST', path, { body: body ?? {} })).data,
  patch: async <T>(path: string, body: unknown) => (await send<T>('PATCH', path, { body })).data,
  del: async <T>(path: string) => (await send<T>('DELETE', path)).data,
  upload: async <T>(path: string, file: File, fields: Record<string, string> = {}, query?: Query) => {
    const form = new FormData();
    // Backend talabi: maydonlar fayldan oldin kelishi kerak
    for (const [k, v] of Object.entries(fields)) form.append(k, v);
    form.append('file', file);
    return (await send<T>('POST', path, { form, query })).data;
  },
  // Fayl (Excel) yuklab olish: token bilan so'rab, brauzerda "saqlash" ni ochadi
  download: async (path: string, filename: string, query?: Query) => {
    const token = tokenStore.get();
    let res: Response;
    try {
      res = await fetch(buildUrl(path, query), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      throw new ApiError(0, 'NETWORK', 'Server bilan aloqa yo\'q. Internetni tekshiring');
    }
    if (!res.ok) {
      const json = (await res.json().catch(() => null)) as Envelope<unknown> | null;
      if (res.status === 401 && token) onUnauthorized?.();
      throw new ApiError(res.status, json?.error?.code ?? 'UNKNOWN', json?.error?.message ?? 'Faylni yuklab bo\'lmadi');
    }
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const details = Array.isArray(err.details)
      ? (err.details as Array<{ message?: string }>).map((d) => d.message).filter(Boolean)
      : [];
    return details.length ? `${err.message}: ${details.join('; ')}` : err.message;
  }
  return err instanceof Error ? err.message : 'Kutilmagan xatolik';
}
