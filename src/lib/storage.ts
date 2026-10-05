import type { Note } from './types'

export interface SyncStatus {
  state: 'syncing' | 'idle' | 'offline' | 'error'
  /** Local changes not yet confirmed by the server. */
  pending: number
}

/** Storage interface. Adapters never filter: soft-deleted notes are returned too. */
export interface NoteAdapter {
  /** 'local' = this browser only; 'synced' = local cache mirrored to a server. */
  readonly kind: 'local' | 'synced'
  list(): Promise<Note[]>
  put(note: Note): Promise<void>
  /** Present on adapters that mirror to a server. */
  sync?(): Promise<void>
  /** Notified after each sync attempt; `changed` means local notes were updated from the server. */
  subscribe?(cb: (s: SyncStatus & { changed: boolean }) => void): () => void
  signOut?(): Promise<void>
}

/** A server-side store. Never filtered either; timestamps are normalised to ISO strings. */
export interface RemoteAdapter {
  list(): Promise<Note[]>
  put(note: Note): Promise<void>
}

const DB_NAME = 'necronotecon'
const NOTES = 'notes'
/** Notes changed locally and not yet pushed: { id, base } where base is the server's updated_at we edited from. */
const PENDING = 'pending'
/** Last server updated_at known per note: { id, base }. */
const SYNCED = 'synced'

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export interface BaseRecord {
  id: string
  base: string | null
}

export class LocalAdapter implements NoteAdapter {
  readonly kind = 'local' as const
  private dbp: Promise<IDBDatabase> | null = null

  constructor(private readonly name = DB_NAME) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const open = indexedDB.open(this.name, 2)
        open.onupgradeneeded = () => {
          const db = open.result
          if (!db.objectStoreNames.contains(NOTES)) db.createObjectStore(NOTES, { keyPath: 'id' })
          if (!db.objectStoreNames.contains(PENDING)) db.createObjectStore(PENDING, { keyPath: 'id' })
          if (!db.objectStoreNames.contains(SYNCED)) db.createObjectStore(SYNCED, { keyPath: 'id' })
        }
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
    }
    return this.dbp
  }

  private async store(name: string, mode: IDBTransactionMode = 'readonly') {
    return (await this.db()).transaction(name, mode).objectStore(name)
  }

  async list(): Promise<Note[]> {
    return req((await this.store(NOTES)).getAll())
  }

  async put(note: Note): Promise<void> {
    await req((await this.store(NOTES, 'readwrite')).put(note))
  }

  async getPending(): Promise<BaseRecord[]> {
    return req((await this.store(PENDING)).getAll())
  }
  async addPending(rec: BaseRecord): Promise<void> {
    await req((await this.store(PENDING, 'readwrite')).put(rec))
  }
  async hasPending(id: string): Promise<boolean> {
    return (await req((await this.store(PENDING)).get(id))) !== undefined
  }
  async clearPending(id: string): Promise<void> {
    await req((await this.store(PENDING, 'readwrite')).delete(id))
  }
  async getSynced(id: string): Promise<string | null> {
    const r = (await req((await this.store(SYNCED)).get(id))) as BaseRecord | undefined
    return r?.base ?? null
  }
  async setSynced(id: string, base: string): Promise<void> {
    await req((await this.store(SYNCED, 'readwrite')).put({ id, base }))
  }
}
