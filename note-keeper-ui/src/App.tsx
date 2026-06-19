import { useEffect, useState } from 'react'
import type { Note, AdminNote, AdminStats } from './types'
import type { User } from './types'
import { fetchNotes, createNote, updateNote, deleteNote, togglePin, patchNote, deleteAccount, fetchAdminUsers, fetchAdminNotes, fetchAdminStats, deleteAdminUser, deleteAdminNote, toggleAdminUser, patchAdminUser, exportAdminData } from './api'
import { AuthProvider, useAuth } from './context/AuthContext'
import NoteCard from './components/NoteCard'
import CreateNote from './components/CreateNote'
import EditModal from './components/EditModal'
import AuthPage from './components/AuthPage'

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  const [day, mon, yr] = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).split(' ')
  return `${day} ${mon}, ${yr} : ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}`
}

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
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [adminNotes, setAdminNotes] = useState<AdminNote[]>([])
  const [adminView, setAdminView] = useState<'admin' | 'notes'>('admin')

  const load = async () => {
    const data = await fetchNotes(search || undefined, showPinned || undefined)
    setNotes(data)
  }

  useEffect(() => { if (user) load() }, [user, search, showPinned])
  useEffect(() => {
    if (user?.role !== 'admin') return
    fetchAdminUsers().then(setAdminUsers)
    fetchAdminStats().then(setAdminStats)
    fetchAdminNotes().then(setAdminNotes)
  }, [user])

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

  const handleDeleteAccount = async () => {
    if (!window.confirm('Delete your account permanently? All notes will be lost.')) return
    await deleteAccount()
    localStorage.removeItem('token')
    localStorage.removeItem('refresh_token')
    window.location.reload()
  }

  const refreshAdmin = async () => {
    const [u, s, n] = await Promise.all([fetchAdminUsers(), fetchAdminStats(), fetchAdminNotes()])
    setAdminUsers(u); setAdminStats(s); setAdminNotes(n)
  }

  const handleAdminDeleteUser = async (id: number) => {
    if (!window.confirm('Delete this user and all their notes?')) return
    await deleteAdminUser(id)
    await refreshAdmin()
  }

  const handleAdminEditUser = async (id: number, currentEmail: string) => {
    const email = window.prompt('Email:', currentEmail)
    if (!email || email === currentEmail) return
    await patchAdminUser(id, { email })
    await refreshAdmin()
  }

  const handleAdminToggleAdmin = async (id: number) => {
    await toggleAdminUser(id)
    await refreshAdmin()
  }

  const handleAdminDeleteNote = async (id: number) => {
    if (!window.confirm('Delete this note?')) return
    await deleteAdminNote(id)
    setAdminNotes((prev) => prev.filter((n) => n.id !== id))
  }

  const handleExport = async () => {
    const data = await exportAdminData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `note-keeper-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const pinned = notes.filter((n) => n.is_pinned)
  const unpinned = notes.filter((n) => !n.is_pinned)

  const isAdmin = user.role === 'admin'

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
          {isAdmin && (
            <button
              onClick={() => setAdminView(v => v === 'admin' ? 'notes' : 'admin')}
              className={`px-3 py-1.5 text-sm rounded-full transition cursor-pointer ${adminView === 'admin' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {adminView === 'admin' ? 'My Notes' : 'Admin'}
            </button>
          )}
          {(!isAdmin || adminView === 'notes') && (
            <>
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
            </>
          )}
          <span className="text-sm text-gray-400 hidden sm:inline">{user.email}</span>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition cursor-pointer"
          >
            Logout
          </button>
          {(!isAdmin || adminView === 'notes') && (
            <button
              onClick={handleDeleteAccount}
              className="px-3 py-1.5 text-sm rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition cursor-pointer"
            >
              Delete
            </button>
          )}
        </div>
      </header>

      {isAdmin && adminView === 'admin' ? (
        <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <h2 className="text-lg font-medium text-gray-800">Admin Dashboard</h2>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Users', value: adminStats?.total_users, color: 'bg-blue-50 text-blue-700' },
              { label: 'Notes', value: adminStats?.total_notes, color: 'bg-green-50 text-green-700' },
              { label: 'Pinned', value: adminStats?.pinned_notes, color: 'bg-yellow-50 text-yellow-700' },
              { label: 'Admins', value: adminStats?.admins, color: 'bg-purple-50 text-purple-700' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-4 ${s.color}`}>
                <div className="text-2xl font-bold">{s.value ?? '—'}</div>
                <div className="text-sm opacity-80">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase tracking-wider">
              Users ({adminUsers.length})
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="text-left px-4 py-2 font-medium">Email</th>
                  <th className="text-left px-4 py-2 font-medium">Created</th>
                  <th className="text-center px-4 py-2 font-medium">Notes</th>
                  <th className="text-center px-4 py-2 font-medium">Admin</th>
                  <th className="text-right px-4 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {adminUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800">{u.email}</td>
                    <td className="px-4 py-3 text-gray-500 text-nowrap">{fmtDate(u.created_at)}</td>
                    <td className="px-4 py-3 text-center text-gray-600">{u.notes_count ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.is_admin ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_admin ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleAdminEditUser(u.id, u.email)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer" title="Edit email">
                          Edit
                        </button>
                        <button onClick={() => handleAdminToggleAdmin(u.id)} className={`text-xs px-2 py-1 rounded cursor-pointer ${u.is_admin ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {u.is_admin ? 'Demote' : 'Promote'}
                        </button>
                        <button onClick={() => handleAdminDeleteUser(u.id)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase tracking-wider">
              All Notes ({adminNotes.length})
            </div>
            <div className="divide-y divide-gray-50">
              {adminNotes.map((n) => (
                <div key={n.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-gray-800 truncate">{n.title}</div>
                    <div className="text-xs text-gray-400">{n.user_email} · {fmtDate(n.created_at)}</div>
                  </div>
                  <button onClick={() => handleAdminDeleteNote(n.id)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-500 hover:bg-red-100 cursor-pointer shrink-0 ml-3">
                    Delete
                  </button>
                </div>
              ))}
              {adminNotes.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">No notes</div>
              )}
            </div>
          </div>

          {/* Export */}
          <button onClick={handleExport} className="px-4 py-2 text-sm rounded-lg bg-gray-800 text-white hover:bg-gray-700 cursor-pointer">
            Export All Data (JSON)
          </button>
        </main>
      ) : (
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
      )}

      {(!isAdmin || adminView === 'notes') && (
        <EditModal
          note={editingNote}
          onSave={handleUpdate}
          onClose={() => setEditingNote(null)}
        />
      )}
    </div>
  )
}
