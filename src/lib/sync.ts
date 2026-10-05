import type { Note } from './types'
import type { BaseRecord, LocalAdapter, NoteAdapter, RemoteAdapter, SyncStatus } from './storage'

export interface Reconciled {
  toLocal: Note[]
  toRemote: Note[]
  /** Brand-new notes holding the losing side of an edit collision; written to both sides. */
  conflicts: Note[]
  /** Server updated_at per note after the sync, to be remembered as the next base. */
  synced: Map<string, string>
}

const sameContent = (a: Note, b: Note) =>
  a.body === b.body && a.pinned === b.pinned && a.deleted_at === b.deleted_at

function conflictNote(loser: Note, winner: 'local' | 'server', ts: string, id: string): Note {
  const quoted = loser.body.split('\n').map((l) => `> ${l}`).join('\n')
  return {
    id,
    body: `#conflicts Two edits collided on ${ts}. The ${winner} version won; the other is kept below.\n\n${quoted}`,
    created_at: ts,
    updated_at: ts,
    pinned: false,
    deleted_at: null,
  }
}

/**
 * Decide what to copy where. Last write wins by updated_at; when a note was
 * edited locally while the server copy also changed, the losing text is kept
 * in a new "#conflicts" note instead of being dropped.
 */
export function reconcile(args: {
  local: Note[]
  remote: Note[]
  pending: BaseRecord[]
  now: string
  newId: () => string
}): Reconciled {
  const { local, remote, pending, now, newId } = args
  const out: Reconciled = { toLocal: [], toRemote: [], conflicts: [], synced: new Map() }
  const remoteById = new Map(remote.map((n) => [n.id, n]))
  const localById = new Map(local.map((n) => [n.id, n]))
  const baseOf = new Map(pending.map((p) => [p.id, p.base]))

  for (const r of remote) {
    const l = localById.get(r.id)
    if (!l) {
      out.toLocal.push(r)
      out.synced.set(r.id, r.updated_at)
    }
  }

  for (const l of local) {
    const r = remoteById.get(l.id)
    const isPending = baseOf.has(l.id)
    if (!r) {
      out.toRemote.push(l)
      out.synced.set(l.id, l.updated_at)
    } else if (!isPending) {
      if (r.updated_at > l.updated_at) out.toLocal.push(r)
      out.synced.set(l.id, r.updated_at > l.updated_at ? r.updated_at : l.updated_at)
    } else if (r.updated_at === baseOf.get(l.id) || sameContent(l, r)) {
      // Server unchanged since we edited (or already identical): our edit simply goes up.
      if (!sameContent(l, r) || l.updated_at !== r.updated_at) out.toRemote.push(l)
      out.synced.set(l.id, l.updated_at)
    } else {
      // Both sides changed.
      const localWins = l.updated_at >= r.updated_at
      const [winner, loser] = localWins ? [l, r] : [r, l]
      out.conflicts.push(conflictNote(loser, localWins ? 'local' : 'server', now, newId()))
      ;(localWins ? out.toRemote : out.toLocal).push(winner)
      out.synced.set(l.id, winner.updated_at)
    }
  }
  return out
}

type Listener = (s: SyncStatus & { changed: boolean }) => void

/**
 * Local-first adapter: the UI only talks to IndexedDB, edits are queued, and
 * `sync()` mirrors with the server whenever it is reachable.
 */
export class SyncedAdapter implements NoteAdapter {
  readonly kind = 'synced' as const
  private listeners = new Set<Listener>()
  private inflight: Promise<void> | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private pendingCount = 0

  constructor(
    private readonly local: LocalAdapter,
    private readonly remote: RemoteAdapter,
    private readonly opts: { onSignOut?: () => Promise<void>; online?: () => boolean; delayMs?: number } = {},
  ) {}

  list() {
    return this.local.list()
  }

  async put(note: Note) {
    await this.local.put(note)
    if (!(await this.local.hasPending(note.id))) {
      await this.local.addPending({ id: note.id, base: await this.local.getSynced(note.id) })
      this.pendingCount++
    }
    clearTimeout(this.timer)
    this.timer = setTimeout(() => void this.sync(), this.opts.delayMs ?? 1500)
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb)
    return () => void this.listeners.delete(cb)
  }

  signOut() {
    return this.opts.onSignOut?.() ?? Promise.resolve()
  }

  private emit(state: SyncStatus['state'], changed = false) {
    for (const cb of this.listeners) cb({ state, pending: this.pendingCount, changed })
  }

  sync(): Promise<void> {
    if (!this.inflight) {
      this.inflight = this.run().finally(() => {
        this.inflight = null
      })
    }
    return this.inflight
  }

  private async run() {
    const online = this.opts.online ?? (() => typeof navigator === 'undefined' || navigator.onLine !== false)
    this.pendingCount = (await this.local.getPending()).length
    if (!online()) return this.emit('offline')
    this.emit('syncing')
    try {
      const [local, remote, pending] = await Promise.all([this.local.list(), this.remote.list(), this.local.getPending()])
      const r = reconcile({ local, remote, pending, now: new Date().toISOString(), newId: () => crypto.randomUUID() })
      const toRemote = [...r.toRemote, ...r.conflicts]
      for (const n of toRemote) await this.remote.put(n)
      for (const n of [...r.toLocal, ...r.conflicts]) await this.local.put(n)
      for (const [id, base] of r.synced) await this.local.setSynced(id, base)
      for (const c of r.conflicts) await this.local.setSynced(c.id, c.updated_at)
      for (const p of pending) await this.local.clearPending(p.id)
      this.pendingCount = 0
      this.emit('idle', r.toLocal.length + r.conflicts.length > 0)
    } catch {
      this.emit('error')
    }
  }
}
