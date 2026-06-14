import type { Note } from '../types'

const COLORS = ['#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8']

interface Props {
  note: Note
  onEdit: (note: Note) => void
  onDelete: (id: number) => void
  onTogglePin: (id: number) => void
  onChangeColor: (id: number, color: string) => void
}

export default function NoteCard({ note, onEdit, onDelete, onTogglePin, onChangeColor }: Props) {
  return (
    <div
      className="relative group rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col"
      style={{ backgroundColor: note.color }}
    >
      <div className="p-4 flex-1" onClick={() => onEdit(note)}>
        {note.title && (
          <h3 className="font-medium text-gray-900 text-sm mb-1 pr-6">{note.title}</h3>
        )}
        {note.content && (
          <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{note.content}</p>
        )}
      </div>

      <div className="flex items-center justify-between px-2 pb-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePin(note.id) }}
          className="p-1.5 rounded-full hover:bg-black/10 transition cursor-pointer"
          title={note.is_pinned ? 'Unpin' : 'Pin'}
        >
          <svg className={`w-4 h-4 ${note.is_pinned ? 'fill-gray-900' : 'fill-gray-600'}`} viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </button>

        <div className="flex gap-0.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={(e) => { e.stopPropagation(); onChangeColor(note.id, c) }}
              className={`w-4 h-4 rounded-full border border-gray-300 hover:scale-125 transition cursor-pointer ${c === note.color ? 'ring-2 ring-blue-500' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.id) }}
          className="p-1.5 rounded-full hover:bg-black/10 transition cursor-pointer"
          title="Delete"
        >
          <svg className="w-4 h-4 fill-gray-600" viewBox="0 0 24 24">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
          </svg>
        </button>
      </div>
    </div>
  )
}
