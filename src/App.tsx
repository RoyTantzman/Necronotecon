import { useEffect, useMemo, useRef, useState } from 'react'
import type { NoteAdapter } from './lib/storage'
import { useNotes } from './lib/useNotes'
import { matchesQuery } from './lib/search'
import { allTags } from './lib/tags'
import { buildNextUp, urgentCount } from './lib/tasks'
import { Capture } from './components/Capture'
import { NoteCard } from './components/NoteCard'
import { NextUpView } from './components/NextUpView'

type Tab = 'notes' | 'next'

export default function App({ adapter }: { adapter: NoteAdapter }) {
  const { notes, loaded, create, update, patchBody, remove, restore } = useNotes(adapter)
  const [tab, setTab] = useState<Tab>(() => (window.matchMedia?.('(max-width: 700px)').matches ? 'next' : 'notes'))
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [undo, setUndo] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)
  const search = useRef<HTMLInputElement>(null)
  const undoTimer = useRef<number>(0)

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        search.current?.focus()
      } else if (e.key === '/' && !typing) {
        e.preventDefault()
        search.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const urgent = urgentCount(buildNextUp(notes, now))
  useEffect(() => {
    document.title = (urgent > 0 ? `(${urgent}) ` : '') + 'Necronotecon'
  }, [urgent])

  const tags = useMemo(() => allTags(notes.map((n) => n.body)), [notes])
  const shown = useMemo(() => notes.filter((n) => matchesQuery(n.body, query)), [notes, query])

  function onDelete(id: string) {
    void remove(id)
    setUndo(id)
    clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setUndo(null), 6000)
  }

  function openNote(id: string) {
    setQuery('')
    setTab('notes')
    setFlash(id)
    setTimeout(() => {
      document.getElementById(`note-${id}`)?.scrollIntoView?.({ block: 'center' })
      setTimeout(() => setFlash(null), 1500)
    }, 50)
  }

  return (
    <div className="app">
      <header>
        <h1>Necronotecon</h1>
        {adapter.kind === 'local' && <span className="local-badge" title="Notes are stored in this browser only">local only</span>}
      </header>

      <Capture notes={notes} knownTags={tags} onCreate={create} onAppend={update} />

      <div className="searchbar">
        <input
          ref={search}
          type="search"
          value={query}
          placeholder="Search ( / or Ctrl+K )"
          aria-label="Search"
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value) setTab('notes')
          }}
          onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
        />
      </div>

      <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}>Notes</button>
        <button role="tab" aria-selected={tab === 'next'} onClick={() => setTab('next')}>
          Next up{urgent > 0 && <span className="count">{urgent}</span>}
        </button>
      </nav>

      {tab === 'notes' ? (
        <main className="notes">
          {loaded && notes.length === 0 && <p className="empty">The pages are blank. Feed it.</p>}
          {loaded && notes.length > 0 && shown.length === 0 && <p className="empty">Nothing matches. The void is silent.</p>}
          {shown.map((n) => (
            <NoteCard
              key={n.id}
              note={n}
              query={query}
              now={now}
              highlighted={flash === n.id}
              onUpdate={(id, body) => void update(id, body)}
              onPatch={(id, body) => void patchBody(id, body)}
              onDelete={onDelete}
            />
          ))}
        </main>
      ) : (
        <main>
          <NextUpView notes={notes} now={now} onPatch={(id, body) => void patchBody(id, body)} onOpenNote={openNote} />
        </main>
      )}

      {undo && (
        <div className="toast" role="status">
          Note deleted
          <button
            type="button"
            onClick={() => {
              void restore(undo)
              setUndo(null)
            }}
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
