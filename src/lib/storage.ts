import type { Note } from './types'

/** Storage interface. Adapters never filter: soft-deleted notes are returned too. */
export interface NoteAdapter {
  readonly kind: 'local' | 'supabase'
  list(): Promise<Note[]>
  put(note: Note): Promise<void>
}

const DB_NAME = 'necronotecon'
const STORE = 'notes'

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

export class LocalAdapter implements NoteAdapter {
  readonly kind = 'local' as const
  private dbp: Promise<IDBDatabase> | null = null

  constructor(private readonly name = DB_NAME) {}

  private db(): Promise<IDBDatabase> {
    if (!this.dbp) {
      this.dbp = new Promise((resolve, reject) => {
        const open = indexedDB.open(this.name, 1)
        open.onupgradeneeded = () => {
          open.result.createObjectStore(STORE, { keyPath: 'id' })
        }
        open.onsuccess = () => resolve(open.result)
        open.onerror = () => reject(open.error)
      })
    }
    return this.dbp
  }

  async list(): Promise<Note[]> {
    const db = await this.db()
    return req(db.transaction(STORE).objectStore(STORE).getAll())
  }

  async put(note: Note): Promise<void> {
    const db = await this.db()
    await req(db.transaction(STORE, 'readwrite').objectStore(STORE).put(note))
  }
}

export function createAdapter(): NoteAdapter {
  // SupabaseAdapter arrives in a later stage; until then everything is local.
  return new LocalAdapter()
}
