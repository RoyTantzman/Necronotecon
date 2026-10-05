import { useEffect, useRef, useState } from 'react'
import type { Note } from '../lib/types'
import { NoteBody } from './NoteBody'
import { setChecked, replaceLine } from '../lib/checklist'
import { useAutoGrow } from '../lib/useAutoGrow'

interface Props {
  note: Note
  query: string
  now: Date
  highlighted?: boolean
  onUpdate: (id: string, body: string) => void
  onPatch: (id: string, body: string) => void
  onDelete: (id: string) => void
  onPin: (id: string) => void
}

export function NoteCard({ note, query, now, highlighted, onUpdate, onPatch, onDelete, onPin }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note.body)
  const ta = useRef<HTMLTextAreaElement>(null)

  useAutoGrow(ta, draft)
  useEffect(() => {
    if (editing) ta.current?.focus()
  }, [editing])

  function save() {
    if (draft.trim()) onUpdate(note.id, draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <article className="note editing" id={`note-${note.id}`}>
        <textarea
          ref={ta}
          value={draft}
          aria-label="Edit note"
          rows={3}
          className="grow"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              save()
            } else if (e.key === 'Escape') setEditing(false)
          }}
        />
        <div className="note-actions">
          <button type="button" onClick={save}>Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </div>
      </article>
    )
  }

  return (
    <article
      className={'note' + (note.pinned ? ' pinned' : '') + (highlighted ? ' flash' : '')}
      id={`note-${note.id}`}
      onClick={() => {
        if (window.getSelection()?.toString()) return
        setDraft(note.body)
        setEditing(true)
      }}
    >
      <NoteBody
        body={note.body}
        query={query}
        now={now}
        onToggle={(line, checked) => onPatch(note.id, setChecked(note.body, line, checked))}
        onLineChange={(line, text) => onPatch(note.id, replaceLine(note.body, line, text))}
      />
      <div className="note-meta">
        <time dateTime={note.created_at}>
          {note.pinned && <span className="pin-mark">Pinned · </span>}
          {new Date(note.created_at).toLocaleString()}
        </time>
        <span className="note-btns">
        <button
          type="button"
          className="del"
          aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          aria-pressed={note.pinned}
          onClick={(e) => {
            e.stopPropagation()
            onPin(note.id)
          }}
        >
          {note.pinned ? 'Unpin' : 'Pin'}
        </button>
        <button
          type="button"
          className="del"
          aria-label="Delete note"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(note.id)
          }}
        >
          Delete
        </button>
        </span>
      </div>
    </article>
  )
}
