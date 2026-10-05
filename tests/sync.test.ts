import { reconcile, SyncedAdapter } from '../src/lib/sync'
import { LocalAdapter, type RemoteAdapter } from '../src/lib/storage'
import { SupabaseAdapter, toTsQuery } from '../src/lib/supabase'
import { shareBody } from '../src/lib/share'
import type { Note } from '../src/lib/types'

const note = (id: string, body: string, updated: string, extra: Partial<Note> = {}): Note => ({
  id, body, created_at: '2026-10-01T00:00:00.000Z', updated_at: updated, pinned: false, deleted_at: null, ...extra,
})
const T1 = '2026-10-01T10:00:00.000Z'
const T2 = '2026-10-01T11:00:00.000Z'
const T3 = '2026-10-01T12:00:00.000Z'
const run = (local: Note[], remote: Note[], pending: { id: string; base: string | null }[] = []) =>
  reconcile({ local, remote, pending, now: '2026-10-02T00:00:00.000Z', newId: () => 'conflict-1' })

describe('reconcile', () => {
  test('copies new notes in both directions', () => {
    const r = run([note('a', 'local only', T1)], [note('b', 'remote only', T1)])
    expect(r.toLocal.map((n) => n.id)).toEqual(['b'])
    expect(r.toRemote.map((n) => n.id)).toEqual(['a'])
    expect(r.conflicts).toEqual([])
  })

  test('pending edit on an unchanged server copy is pushed, nothing lost', () => {
    const r = run([note('a', 'edited', T2)], [note('a', 'old', T1)], [{ id: 'a', base: T1 }])
    expect(r.toRemote.map((n) => n.body)).toEqual(['edited'])
    expect(r.toLocal).toEqual([])
    expect(r.conflicts).toEqual([])
  })

  test('non-pending note takes a newer server copy', () => {
    const r = run([note('a', 'old', T1)], [note('a', 'newer', T2)])
    expect(r.toLocal.map((n) => n.body)).toEqual(['newer'])
  })

  test('collision, local newer: local wins, server text kept in a conflicts note', () => {
    const r = run([note('a', 'mine', T3)], [note('a', 'theirs', T2)], [{ id: 'a', base: T1 }])
    expect(r.toRemote.map((n) => n.body)).toEqual(['mine'])
    expect(r.conflicts).toHaveLength(1)
    expect(r.conflicts[0].body).toContain('#conflicts')
    expect(r.conflicts[0].body).toContain('> theirs')
    expect(r.conflicts[0].body).toContain('local version won')
  })

  test('collision, server newer: server wins, local text kept', () => {
    const r = run([note('a', 'mine', T2)], [note('a', 'theirs', T3)], [{ id: 'a', base: T1 }])
    expect(r.toLocal.map((n) => n.body)).toEqual(['theirs'])
    expect(r.toRemote).toEqual([])
    expect(r.conflicts[0].body).toContain('> mine')
  })

  test('multi-line losing text is fully quoted; identical content is not a conflict', () => {
    const r = run([note('a', 'x\ny', T2)], [note('a', 'q', T3)], [{ id: 'a', base: T1 }])
    expect(r.conflicts[0].body).toContain('> x\n> y')
    expect(run([note('a', 'same', T2)], [note('a', 'same', T3)], [{ id: 'a', base: T1 }]).conflicts).toEqual([])
  })

  test('a local delete against a newer server edit keeps the edit', () => {
    const r = run([note('a', 'text', T2, { deleted_at: T2 })], [note('a', 'edited', T3)], [{ id: 'a', base: T1 }])
    expect(r.toLocal.map((n) => n.body)).toEqual(['edited'])
  })
})

class FakeRemote implements RemoteAdapter {
  notes = new Map<string, Note>()
  down = false
  async list() {
    if (this.down) throw new Error('offline')
    return [...this.notes.values()]
  }
  async put(n: Note) {
    if (this.down) throw new Error('offline')
    this.notes.set(n.id, n)
  }
}

describe('SyncedAdapter offline queue', () => {
  let n = 0
  const make = (remote: FakeRemote, online = () => true) => {
    const local = new LocalAdapter('sync-' + ++n)
    return { local, a: new SyncedAdapter(local, remote, { online, delayMs: 10_000 }) }
  }

  test('notes written offline are queued, then pushed once back online', async () => {
    const remote = new FakeRemote()
    let up = false
    const { a, local } = make(remote, () => up)
    await a.put(note('a', 'offline note', T1))
    await a.sync()
    expect(remote.notes.size).toBe(0)
    expect(await local.getPending()).toHaveLength(1)
    up = true
    await a.sync()
    expect(remote.notes.get('a')!.body).toBe('offline note')
    expect(await local.getPending()).toEqual([])
  })

  test('a failing server keeps the queue and reports an error', async () => {
    const remote = new FakeRemote()
    const { a, local } = make(remote)
    const states: string[] = []
    a.subscribe((s) => states.push(s.state))
    await a.put(note('a', 'x', T1))
    remote.down = true
    await a.sync()
    expect(states.at(-1)).toBe('error')
    expect(await local.getPending()).toHaveLength(1)
    remote.down = false
    await a.sync()
    expect(states.at(-1)).toBe('idle')
    expect(remote.notes.size).toBe(1)
  })

  test('pulls remote notes and resolves a real collision end to end', async () => {
    const remote = new FakeRemote()
    const { a, local } = make(remote)
    await a.put(note('a', 'v1', T1))
    await a.sync() // synced, base = T1
    // Edit offline, while someone else edits the server copy later.
    await a.put(note('a', 'local edit', T2))
    remote.notes.set('a', note('a', 'server edit', T3))
    remote.notes.set('z', note('z', 'from elsewhere', T1))
    let changed = false
    a.subscribe((s) => (changed ||= s.changed))
    await a.sync()
    const bodies = (await local.list()).map((x) => x.body)
    expect(bodies).toContain('server edit')
    expect(bodies).toContain('from elsewhere')
    expect(bodies.some((b) => b.includes('#conflicts') && b.includes('> local edit'))).toBe(true)
    expect(changed).toBe(true)
    expect([...remote.notes.values()].some((x) => x.body.includes('> local edit'))).toBe(true)
  })
})

describe('SupabaseAdapter', () => {
  const calls: any[] = []
  const rows = [{ id: 'a', body: 'hi', created_at: '2026-10-01T10:00:00+00:00', updated_at: '2026-10-01T10:00:00+00:00', pinned: null, deleted_at: null }]
  const query: any = {
    is(...a: any[]) { calls.push(['is', ...a]); return query },
    textSearch(...a: any[]) { calls.push(['textSearch', ...a]); return Promise.resolve({ data: rows, error: null }) },
    then(res: any) { return Promise.resolve({ data: rows, error: null }).then(res) },
  }
  const client: any = {
    from: () => ({
      select: () => query,
      upsert: (row: unknown) => { calls.push(['upsert', row]); return Promise.resolve({ error: null }) },
    }),
  }

  test('normalises timestamps from Postgres', async () => {
    const [x] = await new SupabaseAdapter(client).list()
    expect(x.created_at).toBe('2026-10-01T10:00:00.000Z')
    expect(x.pinned).toBe(false)
  })

  test('upsert sends the note fields without user_id (the database fills it)', async () => {
    await new SupabaseAdapter(client).put(note('a', 'hi', T1))
    const row = calls.find((c) => c[0] === 'upsert')[1]
    expect(Object.keys(row).sort()).toEqual(['body', 'created_at', 'deleted_at', 'id', 'pinned', 'updated_at'])
  })

  test('search uses prefix tsquery and skips deleted notes', async () => {
    await new SupabaseAdapter(client).search('Olive oi')
    expect(calls).toContainEqual(['is', 'deleted_at', null])
    expect(calls).toContainEqual(['textSearch', 'search', 'olive:* & oi:*', { config: 'simple' }])
    expect(toTsQuery("a'b; drop")).toBe('ab:* & drop:*')
    expect(toTsQuery('  ')).toBe('')
  })
})

test('share target body', () => {
  const p = (s: string) => new URLSearchParams(s)
  expect(shareBody(p('title=Cool+page&text=https%3A%2F%2Fa.com%2Fx'))).toBe('Cool page\nhttps://a.com/x')
  expect(shareBody(p('text=just+words'))).toBe('just words')
  expect(shareBody(p('title=T&url=https%3A%2F%2Fb.com'))).toBe('T\nhttps://b.com')
  expect(shareBody(p('title=same&text=same'))).toBe('same')
  expect(shareBody(p(''))).toBeNull()
})
