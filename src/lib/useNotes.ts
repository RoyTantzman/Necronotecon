import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Note } from './types'
import type { NoteAdapter, SyncStatus } from './storage'
import { normalizeBody } from './checklist'

const pinnedThenNewest = (a: Note, b: Note) =>
  Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at)

export function useNotes(adapter: NoteAdapter) {
  const [all, setAll] = useState<Note[]>([])
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState<SyncStatus | null>(null)

  useEffect(() => {
    let live = true
    const refresh = () =>
      adapter.list().then((n) => {
        if (live) {
          setAll(n)
          setLoaded(true)
        }
      })
    void refresh()
    if (!adapter.sync) return
    const unsub = adapter.subscribe?.((s) => {
      if (!live) return
      setStatus({ state: s.state, pending: s.pending })
      if (s.changed) void refresh()
    })
    const sync = () => void adapter.sync!()
    sync()
    const timer = setInterval(sync, 60_000)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      live = false
      unsub?.()
      clearInterval(timer)
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [adapter])

  const save = useCallback(
    (note: Note) => {
      setAll((prev) => (prev.some((n) => n.id === note.id) ? prev.map((n) => (n.id === note.id ? note : n)) : [...prev, note]))
      return adapter.put(note)
    },
    [adapter],
  )

  const notes = useMemo(() => all.filter((n) => !n.deleted_at).sort(pinnedThenNewest), [all])

  const create = useCallback(
    (body: string) => {
      const now = new Date()
      const ts = now.toISOString()
      const note: Note = {
        id: crypto.randomUUID(),
        body: normalizeBody(body, now),
        created_at: ts,
        updated_at: ts,
        pinned: false,
        deleted_at: null,
      }
      return save(note).then(() => note)
    },
    [save],
  )

  /** Update body (normalised) of an existing note. */
  const update = useCallback(
    (id: string, body: string) => {
      const cur = all.find((n) => n.id === id)
      if (!cur) return Promise.resolve()
      const now = new Date()
      return save({ ...cur, body: normalizeBody(body, now), updated_at: now.toISOString() })
    },
    [all, save],
  )

  /** Update body exactly as given (used for checkbox toggles and date edits). */
  const patchBody = useCallback(
    (id: string, body: string) => {
      const cur = all.find((n) => n.id === id)
      if (!cur || cur.body === body) return Promise.resolve()
      return save({ ...cur, body, updated_at: new Date().toISOString() })
    },
    [all, save],
  )

  const remove = useCallback(
    (id: string) => {
      const cur = all.find((n) => n.id === id)
      if (!cur) return Promise.resolve()
      const now = new Date().toISOString()
      return save({ ...cur, deleted_at: now, updated_at: now })
    },
    [all, save],
  )

  const togglePin = useCallback(
    (id: string) => {
      const cur = all.find((n) => n.id === id)
      if (!cur) return Promise.resolve()
      return save({ ...cur, pinned: !cur.pinned, updated_at: new Date().toISOString() })
    },
    [all, save],
  )

  const restore = useCallback(
    (id: string) => {
      const cur = all.find((n) => n.id === id)
      if (!cur) return Promise.resolve()
      return save({ ...cur, deleted_at: null, updated_at: new Date().toISOString() })
    },
    [all, save],
  )

  return { all, notes, loaded, status, create, update, patchBody, remove, restore, togglePin }
}
