import { useState } from 'react'
import type { Note } from '../lib/types'
import { download, exportJson, exportMarkdown } from '../lib/export'

export function Settings({ notes }: { notes: Note[] }) {
  const [open, setOpen] = useState(false)
  const day = new Date().toISOString().slice(0, 10)
  return (
    <div className="settings">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>
        Settings
      </button>
      {open && (
        <div className="settings-panel" role="dialog" aria-label="Settings">
          <h2>Export all notes</h2>
          <div className="row">
            <button type="button" onClick={() => download(`necronotecon-${day}.md`, 'text/markdown', exportMarkdown(notes))}>
              Markdown
            </button>
            <button type="button" onClick={() => download(`necronotecon-${day}.json`, 'application/json', exportJson(notes))}>
              JSON
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
