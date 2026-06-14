import { useState, useEffect } from 'react'
import type { Note } from '../types'

interface Props {
  note: Note | null
  onSave: (id: number, title: string, content: string) => Promise<void>
  onClose: () => void
}

export default function EditModal({ note, onSave, onClose }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content ?? '')
    }
  }, [note])

  if (!note) return null

  const handleSave = async () => {
    await onSave(note.id, title, content)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        style={{ backgroundColor: note.color }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <input
            autoFocus
            className="w-full text-lg font-medium outline-none bg-transparent placeholder:text-gray-400"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className="w-full text-sm outline-none resize-none mt-3 bg-transparent placeholder:text-gray-400"
            placeholder="Take a note..."
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-black/10 rounded-full transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-full transition cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
