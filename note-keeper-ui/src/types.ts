export interface Note {
  id: number
  title: string
  content: string | null
  color: string
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  user_id: number
}

export interface NoteCreate {
  title: string
  content?: string | null
  color?: string
}

export interface NoteUpdate {
  title?: string
  content?: string | null
  color?: string
  is_pinned?: boolean
  is_archived?: boolean
}

export interface User {
  id: number
  email: string
  role: 'user' | 'admin'
  created_at?: string
  notes_count?: number
  is_admin?: boolean
}

export interface AuthResponse {
  access_token: string
  token_type: string
  refresh_token: string
}

export interface AdminNote {
  id: number
  title: string
  content: string | null
  color: string
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
  user_id: number
  user_email: string
}

export interface AdminStats {
  total_users: number
  total_notes: number
  pinned_notes: number
  admins: number
}
