import type { Note } from './types'
import type { RemoteAdapter } from './storage'

/** The slice of the supabase-js client the adapter needs (keeps tests free of the real library). */
export interface NotesTable {
  select(cols: string): any
  upsert(row: unknown): any
}
export interface ClientLike {
  from(table: string): NotesTable
}

const iso = (s: string) => new Date(s).toISOString()

function fromRow(r: any): Note {
  return {
    id: r.id,
    body: r.body,
    created_at: iso(r.created_at),
    updated_at: iso(r.updated_at),
    pinned: !!r.pinned,
    deleted_at: r.deleted_at ? iso(r.deleted_at) : null,
  }
}

const COLS = 'id, body, created_at, updated_at, pinned, deleted_at'

export class SupabaseAdapter implements RemoteAdapter {
  constructor(private readonly client: ClientLike) {}

  async list(): Promise<Note[]> {
    const { data, error } = await this.client.from('notes').select(COLS)
    if (error) throw new Error(error.message)
    return (data ?? []).map(fromRow)
  }

  async put(note: Note): Promise<void> {
    const { error } = await this.client.from('notes').upsert({
      id: note.id,
      body: note.body,
      created_at: note.created_at,
      updated_at: note.updated_at,
      pinned: note.pinned,
      deleted_at: note.deleted_at,
    })
    if (error) throw new Error(error.message)
  }

  /** Postgres full-text search with prefix matching, so partial words work. Soft-deleted notes are excluded. */
  async search(query: string): Promise<Note[]> {
    const q = toTsQuery(query)
    if (!q) return []
    const { data, error } = await this.client
      .from('notes')
      .select(COLS)
      .is('deleted_at', null)
      .textSearch('search', q, { config: 'simple' })
    if (error) throw new Error(error.message)
    return (data ?? []).map(fromRow)
  }
}

/** "olive oi" -> "olive:* & oi:*" (letters and digits only, every word a prefix). */
export function toTsQuery(query: string): string {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter(Boolean)
    .map((w) => `${w}:*`)
    .join(' & ')
}
