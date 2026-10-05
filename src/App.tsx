import { useEffect, useMemo, useRef, useState } from 'react'
import type { NoteAdapter, SyncStatus } from './lib/storage'
import { useNotes } from './lib/useNotes'
import { matchesQuery } from './lib/search'
import { allTags } from './lib/tags'
import { buildNextUp, urgentCount } from './lib/tasks'
import { Capture } from './components/Capture'
import { NoteCard } from './components/NoteCard'
import { NextUpView } from './components/NextUpView'
import { Settings } from './components/Settings'
import { useMedia } from './lib/useMedia'
import { shareBody } from './lib/share'

type Tab = 'notes' | 'next'

export default function App({ adapter }: { adapter: NoteAdapter }) {
  const { all, notes, loaded, status, create, update, patchBody, remove, restore, togglePin } = useNotes(adapter)
  const wide = useMedia('(min-width: 1000px)')
  const [tab, setTab] = useState<Tab>(() => (window.matchMedia?.('(max-width: 700px)').matches ? 'next' : 'notes'))
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [undo, setUndo] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const shared = useRef(false)
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

  // Android share target: the manifest sends shared title/text/url as query parameters.
  useEffect(() => {
    if (!loaded || shared.current) return
    shared.current = true
    const body = shareBody(new URLSearchParams(window.location.search))
    if (!body) return
    void create(body).then(() => {
      setNotice('Saved shared note')
      setTimeout(() => setNotice(''), 4000)
    })
    window.history.replaceState(null, '', window.location.pathname)
  }, [loaded, create])

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
        <SyncBadge kind={adapter.kind} status={status} />
        <Settings notes={all} onSignOut={adapter.signOut ? () => void adapter.signOut!() : undefined} />
      </header>

      <div className="layout">
      <div className="main">
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

      {!wide && <nav className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'notes'} onClick={() => setTab('notes')}>Notes</button>
        <button role="tab" aria-selected={tab === 'next'} onClick={() => setTab('next')}>
          Next up{urgent > 0 && <span className="count">{urgent}</span>}
        </button>
      </nav>}

      {wide || tab === 'notes' ? (
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
              onPin={(id) => void togglePin(id)}
            />
          ))}
        </main>
      ) : (
        <main>
          <NextUpView notes={notes} now={now} onPatch={(id, body) => void patchBody(id, body)} onOpenNote={openNote} />
        </main>
      )}
      </div>

      {wide && (
        <aside className="side" aria-label="Next up">
          <h2 className="side-title">Next up{urgent > 0 && <span className="count">{urgent}</span>}</h2>
          <NextUpView notes={notes} now={now} onPatch={(id, body) => void patchBody(id, body)} onOpenNote={openNote} />
        </aside>
      )}
      </div>

      {notice && <div className="toast" role="status">{notice}</div>}
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

function SyncBadge({ kind, status }: { kind: 'local' | 'synced'; status: SyncStatus | null }) {
  if (kind === 'local') return <span className="local-badge" title="Notes are stored in this browser only">local only</span>
  const s = status
  const text =
    !s || s.state === 'syncing' ? 'syncing…'
    : s.state === 'offline' ? `offline${s.pending ? ` · ${s.pending} waiting` : ''}`
    : s.state === 'error' ? `sync error${s.pending ? ` · ${s.pending} waiting` : ''}`
    : s.pending ? `${s.pending} waiting` : 'synced'
  return <span className={'local-badge' + (s && (s.state === 'error' || s.state === 'offline') ? ' warn' : '')}>{text}</span>
}
