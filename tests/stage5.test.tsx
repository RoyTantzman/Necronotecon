import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { LocalAdapter } from '../src/lib/storage'
import { extractUrls, previewsOf } from '../src/lib/links'
import { exportJson, exportMarkdown } from '../src/lib/export'
import type { Note } from '../src/lib/types'

const mk = (id: string, body: string, extra: Partial<Note> = {}): Note => ({
  id, body, created_at: `2026-10-0${id}T00:00:00Z`, updated_at: '2026-10-01T00:00:00Z', pinned: false, deleted_at: null, ...extra,
})
let n = 0
const fresh = () => new LocalAdapter('s5-' + ++n)

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

test('link previews: label, slug, domain fallbacks; trailing punctuation trimmed', () => {
  expect(extractUrls('see https://a.com/x, and (https://b.org/y).')).toEqual(['https://a.com/x', 'https://b.org/y'])
  expect(previewsOf('Great article https://www.example.com/p/q')).toEqual([
    { url: 'https://www.example.com/p/q', title: 'Great article', domain: 'example.com' },
  ])
  expect(previewsOf('https://example.com/blog/how-to-brew-tea.html')[0].title).toBe('how to brew tea')
  expect(previewsOf('https://example.com/12345')[0].title).toBe('example.com')
  expect(previewsOf('no links here')).toEqual([])
})

test('export: live notes only, newest first', () => {
  const notes = [mk('1', 'old'), mk('2', 'new', { pinned: true }), mk('3', 'gone', { deleted_at: 'x' })]
  expect(JSON.parse(exportJson(notes)).map((x: Note) => x.id)).toEqual(['2', '1'])
  const md = exportMarkdown(notes)
  expect(md).toContain('## 2026-10-02T00:00:00Z (pinned)\n\nnew')
  expect(md.indexOf('new')).toBeLessThan(md.indexOf('old'))
  expect(md).not.toContain('gone')
})

test('pinned notes sort to the top and can be unpinned', async () => {
  const u = userEvent.setup()
  const a = fresh()
  await a.put(mk('1', 'oldest note'))
  await a.put(mk('2', 'newest note'))
  render(<App adapter={a} />)
  await screen.findByText('newest note')
  const order = () => screen.getAllByRole('article').map((x) => x.textContent)
  expect(order()[0]).toContain('newest')
  await u.click(within(screen.getAllByRole('article')[1]).getByRole('button', { name: 'Pin note' }))
  await waitFor(() => expect(order()[0]).toContain('oldest'))
  expect((await a.list()).find((x) => x.id === '1')!.pinned).toBe(true)
  await u.click(screen.getByRole('button', { name: 'Unpin note' }))
  await waitFor(() => expect(order()[0]).toContain('newest'))
})

test('#read notes show link previews with title and domain', async () => {
  const a = fresh()
  await a.put(mk('1', '#read\nGood essay https://www.example.com/essay\nhttps://news.site/some-long-story'))
  render(<App adapter={a} />)
  const link = await screen.findByRole('link', { name: /Good essay/ })
  expect(link).toHaveAttribute('href', 'https://www.example.com/essay')
  expect(link).toHaveTextContent('example.com')
  expect(screen.getByRole('link', { name: /some long story/ })).toHaveTextContent('news.site')
})

test('non-#read notes do not get previews', async () => {
  const a = fresh()
  await a.put(mk('1', 'just https://example.com/x text'))
  render(<App adapter={a} />)
  await screen.findByText(/just https/)
  expect(screen.queryByRole('link')).toBeNull()
})

test('wide screens show notes and Next up side by side, without tabs', async () => {
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('min-width: 1000px'), media: q, addEventListener() {}, removeEventListener() {},
  }))
  const a = fresh()
  await a.put(mk('1', '#todo\n- [ ] ancient by 2001-01-01'))
  render(<App adapter={a} />)
  expect(await screen.findByRole('region', { name: 'Overdue' })).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.queryByRole('tablist')).toBeNull()
  expect(screen.getByRole('complementary', { name: 'Next up' })).toBeInTheDocument()
})

test('settings offers Markdown and JSON export', async () => {
  const u = userEvent.setup()
  render(<App adapter={fresh()} />)
  await u.click(screen.getByRole('button', { name: 'Settings' }))
  expect(screen.getByRole('button', { name: 'Markdown' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'JSON' })).toBeInTheDocument()
})

test('share target: shared text becomes a new note and the URL is cleaned', async () => {
  window.history.pushState({}, '', '/?title=Neat+read&text=https%3A%2F%2Fexample.com%2Fa')
  const a = fresh()
  render(<App adapter={a} />)
  expect(await screen.findByText('Saved shared note')).toBeInTheDocument()
  await waitFor(async () => expect((await a.list())[0].body).toBe('Neat read\nhttps://example.com/a'))
  expect(window.location.search).toBe('')
})

test('synced adapters show their sync state in the header', async () => {
  const { SyncedAdapter } = await import('../src/lib/sync')
  const local = new LocalAdapter('badge-db')
  const remote = { list: async () => [], put: async () => {} }
  render(<App adapter={new SyncedAdapter(local, remote, { online: () => false })} />)
  expect(await screen.findByText('offline')).toBeInTheDocument()
})
