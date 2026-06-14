export interface Note {
  id: number
  title: string
  content: string | null
  color: string
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
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
