import { useState } from 'react'

interface Props {
  onCreate: (title: string, content: string) => Promise<void>
}

export default function CreateNote({ onCreate }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const handleSubmit = async () => {
    if (!title.trim() && !content.trim()) return
    await onCreate(title.trim(), content.trim())
    setTitle('')
    setContent('')
    setExpanded(false)
  }

  const handleClose = () => {
    setExpanded(false)
  }

  return (
    <div className="max-w-xl mx-auto mb-8">
      <div className="bg-white rounded-xl border border-gray-200 shadow-md overflow-hidden">
        {!expanded ? (
          <div
            className="px-4 py-3 cursor-text"
            onClick={() => setExpanded(true)}
          >
            <span className="text-gray-500">Take a note...</span>
          </div>
        ) : (
          <div className="p-4">
            <input
              autoFocus
              className="w-full text-sm font-medium outline-none mb-2 placeholder:text-gray-400"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
            />
            <textarea
              className="w-full text-sm outline-none resize-none placeholder:text-gray-400"
              placeholder="Take a note..."
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={handleClose}
                className="px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 rounded-full transition cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
