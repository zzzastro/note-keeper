import type { Note, NoteCreate, NoteUpdate, User, AuthResponse } from './types'

const BASE_URL = 'http://localhost:8004'

let refreshPromise: Promise<boolean> | null = null

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) return false
    try {
      const res = await fetch(`${BASE_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      if (!res.ok) return false
      const data = await res.json()
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (res.status === 401) {
    const canRefresh = localStorage.getItem('refresh_token')
    const refreshed = canRefresh ? await refreshAccessToken() : false
    if (refreshed) {
      const newToken = localStorage.getItem('token')
      headers['Authorization'] = `Bearer ${newToken}`
      const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers })
      if (retryRes.ok) return retryRes
    }
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    window.location.reload()
    throw new Error('Session expired')
  }

  return res
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

export async function register(email: string, password: string): Promise<User> {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return handleResponse(res)
}

export { refreshAccessToken }

export async function fetchNotes(search?: string, pinned?: boolean): Promise<Note[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (pinned !== undefined) params.set('pinned', String(pinned))
  const res = await apiFetch(`/notes?${params}`)
  return handleResponse(res)
}

export async function fetchNote(id: number): Promise<Note> {
  const res = await apiFetch(`/notes/${id}`)
  return handleResponse(res)
}

export async function createNote(data: NoteCreate): Promise<Note> {
  const res = await apiFetch(`/notes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function updateNote(id: number, data: NoteCreate): Promise<Note> {
  const res = await apiFetch(`/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function patchNote(id: number, data: NoteUpdate): Promise<Note> {
  const res = await apiFetch(`/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
  return handleResponse(res)
}

export async function deleteNote(id: number): Promise<void> {
  const res = await apiFetch(`/notes/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
}

export async function togglePin(id: number): Promise<Note> {
  const res = await apiFetch(`/notes/${id}/pin`, { method: 'PATCH' })
  return handleResponse(res)
}

export async function deleteAccount(): Promise<void> {
  const token = localStorage.getItem('token')
  if (!token) return
  const res = await fetch(`${BASE_URL}/account`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Delete account failed')
  }
}

export async function logout(): Promise<void> {
  const token = localStorage.getItem('token')
  if (!token) return
  const res = await fetch(`${BASE_URL}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Logout failed')
  }
}
