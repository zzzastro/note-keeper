import { useEffect, useState } from 'react'
import type { Note } from './types'
import { fetchNotes, createNote, updateNote, deleteNote, togglePin, patchNote } from './api'
import { AuthProvider, useAuth } from './context/AuthContext'
import NoteCard from './components/NoteCard'
import CreateNote from './components/CreateNote'
import EditModal from './components/EditModal'
import AuthPage from './components/AuthPage'

export default function App() {
  return (
    <AuthProvider>
      <Main />
    </AuthProvider>
  )
}

function Main() {
  const { user, logout } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [search, setSearch] = useState('')
  const [showPinned, setShowPinned] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)

  const load = async () => {
    const data = await fetchNotes(search || undefined, showPinned || undefined)
    setNotes(data)
  }

  useEffect(() => { if (user) load() }, [user, search, showPinned])

  if (!user) return <AuthPage />

  const handleCreate = async (title: string, content: string) => {
    await createNote({ title: title || 'Untitled', content })
    await load()
  }

  const handleUpdate = async (id: number, title: string, content: string) => {
    await updateNote(id, { title: title || 'Untitled', content })
    await load()
  }

  const handleDelete = async (id: number) => {
    await deleteNote(id)
    await load()
  }

  const handleTogglePin = async (id: number) => {
    await togglePin(id)
    await load()
  }

  const handleChangeColor = async (id: number, color: string) => {
    await patchNote(id, { color })
    await load()
  }

  const pinned = notes.filter((n) => n.is_pinned)
  const unpinned = notes.filter((n) => !n.is_pinned)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-yellow-500" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <h1 className="text-xl font-medium text-gray-800">Note Keeper</h1>
          </div>
          <div className="flex-1 max-w-md mx-auto">
            <input
              className="w-full px-4 py-2 bg-gray-100 rounded-full text-sm outline-none focus:bg-gray-200 transition"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowPinned((p) => !p)}
            className={`px-3 py-1.5 text-sm rounded-full transition cursor-pointer ${
              showPinned ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {showPinned ? 'All Notes' : 'Pinned'}
          </button>
          <span className="text-sm text-gray-400 hidden sm:inline">{user.email}</span>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {!showPinned && <CreateNote onCreate={handleCreate} />}

        {pinned.length > 0 && !showPinned && (
          <section className="mb-8">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Pinned</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinned.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={setEditingNote}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  onChangeColor={handleChangeColor}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          {pinned.length > 0 && !showPinned && (
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Others</h2>
          )}
          {unpinned.length === 0 && pinned.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z" />
              </svg>
              <p className="text-lg">No notes yet</p>
              <p className="text-sm">Create your first note above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {unpinned.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={setEditingNote}
                  onDelete={handleDelete}
                  onTogglePin={handleTogglePin}
                  onChangeColor={handleChangeColor}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <EditModal
        note={editingNote}
        onSave={handleUpdate}
        onClose={() => setEditingNote(null)}
      />
    </div>
  )
}
