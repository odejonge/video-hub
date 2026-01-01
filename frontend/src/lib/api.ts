// API URL: use VITE_API_URL if set, otherwise use relative paths (same origin)
function getApiUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // Empty string = relative URLs, works with reverse proxy
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
