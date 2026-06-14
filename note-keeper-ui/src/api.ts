import type { Note, NoteCreate, NoteUpdate } from './types'

const BASE_URL = 'http://localhost:8004'

export async function fetchNotes(search?: string, pinned?: boolean): Promise<Note[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (pinned !== undefined) params.set('pinned', String(pinned))
  const res = await fetch(`${BASE_URL}/notes?${params}`)
  return res.json()
}

export async function fetchNote(id: number): Promise<Note> {
  const res = await fetch(`${BASE_URL}/notes/${id}`)
  return res.json()
}

export async function createNote(data: NoteCreate): Promise<Note> {
  const res = await fetch(`${BASE_URL}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function updateNote(id: number, data: NoteCreate): Promise<Note> {
  const res = await fetch(`${BASE_URL}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function patchNote(id: number, data: NoteUpdate): Promise<Note> {
  const res = await fetch(`${BASE_URL}/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function deleteNote(id: number): Promise<void> {
  await fetch(`${BASE_URL}/notes/${id}`, { method: 'DELETE' })
}

export async function togglePin(id: number): Promise<Note> {
  const res = await fetch(`${BASE_URL}/notes/${id}/pin`, { method: 'PATCH' })
  return res.json()
}
