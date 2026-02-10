// API URL: use VITE_API_URL if set, auto-detect Railway/production, or use relative paths
export function getApiUrl() {
  // Auto-detect environment based on hostname
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    // ngrok: use relative URL (Traefik routes both frontend & backend)
    if (host.includes('ngrok')) {
      return ''
    }
    // Railway URLs or custom domain
    if (host.includes('.up.railway.app') || host.includes('danceclips.nl')) {
      return 'https://video-hub-production-528f.up.railway.app'
    }
  }
  // Check build-time env var (localhost dev)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Fallback: relative URL
  return ''
}

const API_URL = getApiUrl()

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const token = localStorage.getItem('token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  async get<T = unknown>(path: string): Promise<{ data: T }> {
    const res = await fetch(`${API_URL}${path}`, {
      headers: this.getHeaders(),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`${res.status}: ${text}`)
    }

    return { data: await res.json() }
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<{ data: T }> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new Error(await res.text())
    }

    return { data: await res.json() }
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<{ data: T }> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      throw new Error(await res.text())
    }

    return { data: await res.json() }
  }

  async delete(path: string): Promise<void> {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    })

    if (!res.ok) {
      throw new Error(await res.text())
    }
  }
}

export const api = new ApiClient()

// Public fetch - no auth header, for shared/public endpoints
export async function publicFetch<T = unknown>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status}: ${text}`)
  }

  return res.json()
}
