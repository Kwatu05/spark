const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function request<T>(path: string, options?: { method?: HttpMethod; body?: any; headers?: Record<string, string> }): Promise<T> {
  const url = `${API_BASE}${path}`;
  const accessToken = localStorage.getItem('access_token');
  
  const headers: Record<string, string> = {};
  
  // Don't set Content-Type for FormData, let the browser set it with boundary
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add custom headers if provided
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  const res = await fetch(url, {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? (options.body instanceof FormData ? options.body : JSON.stringify(options.body)) : undefined,
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: any) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body?: any) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

export default api;


