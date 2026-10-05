import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../src/App'
import { LocalAdapter } from '../src/lib/storage'
import type { Note } from '../src/lib/types'

let dbName = ''
let n = 0
const db = () => new LocalAdapter(dbName)
beforeEach(() => {
  localStorage.clear()
  dbName = 'test-' + ++n
})

const mount = () => render(<App adapter={db()} />)
const box = () => screen.getByLabelText('New note')

test('capture: cursor starts in the box, Ctrl+Enter saves, newest first, box clears', async () => {
  const u = userEvent.setup()
  mount()
  await waitFor(() => expect(box()).toHaveFocus())
  await u.type(box(), 'first note')
  await u.keyboard('{Control>}{Enter}{/Control}')
  await u.type(box(), 'second note')
  await u.click(screen.getByRole('button', { name: 'Save' }))
  const notes = await screen.findAllByRole('article')
  expect(notes).toHaveLength(2)
  expect(notes[0]).toHaveTextContent('second note')
  expect(box()).toHaveValue('')
})

test('drafts survive a reload', async () => {
  const u = userEvent.setup()
  const first = mount()
  await u.type(box(), 'unsaved thought')
  first.unmount()
  mount()
  expect(box()).toHaveValue('unsaved thought')
})

test('soft delete with undo', async () => {
  const u = userEvent.setup()
  mount()
  await u.type(box(), 'doomed{Control>}{Enter}{/Control}')
  await screen.findByText('doomed')
  await u.click(screen.getByRole('button', { name: 'Delete note' }))
  await waitFor(() => expect(screen.queryByText('doomed')).toBeNull())
  const all = await db().list()
  expect(all[0].deleted_at).not.toBeNull()
  await u.click(screen.getByRole('button', { name: 'Undo' }))
  expect(await screen.findByText('doomed')).toBeInTheDocument()
})

test('search filters live and highlights; #tag filters', async () => {
  const u = userEvent.setup()
  mount()
  await u.type(box(), 'apple pie{Control>}{Enter}{/Control}')
  await u.type(box(), '#home garden{Control>}{Enter}{/Control}')
  await screen.findByText(/garden/)
  await u.type(screen.getByLabelText('Search'), 'APP')
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(document.querySelector('mark')).toHaveTextContent(/app/i)
  await u.clear(screen.getByLabelText('Search'))
  await u.type(screen.getByLabelText('Search'), '#home')
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.getByRole('article')).toHaveTextContent('garden')
})

test('/ focuses search', async () => {
  const u = userEvent.setup()
  mount()
  await u.click(document.body)
  await u.keyboard('/')
  expect(screen.getByLabelText('Search')).toHaveFocus()
})

test('#groc becomes a checklist; ticking edits the text; append offer', async () => {
  const u = userEvent.setup()
  mount()
  await u.type(box(), '#groc eggs, milk{Control>}{Enter}{/Control}')
  const boxes = await screen.findAllByRole('checkbox')
  expect(boxes).toHaveLength(2)
  await u.click(boxes[0])
  await waitFor(async () => expect((await db().list())[0].body).toBe('#groc\n- [x] eggs\n- [ ] milk'))

  await u.type(box(), '#groc bread{Control>}{Enter}{/Control}')
  const offer = await screen.findByRole('alert')
  await u.click(within(offer).getByRole('button', { name: 'Append to it' }))
  await waitFor(async () => {
    const list = await db().list()
    expect(list).toHaveLength(1)
    expect(list[0].body).toBe('#groc\n- [x] eggs\n- [ ] milk\n- [ ] bread')
  })
})

test('click a note to edit it', async () => {
  const u = userEvent.setup()
  mount()
  await u.type(box(), 'old text{Control>}{Enter}{/Control}')
  await u.click(await screen.findByText('old text'))
  const edit = screen.getByLabelText('Edit note')
  await u.clear(edit)
  await u.type(edit, 'new text{Control>}{Enter}{/Control}')
  expect(await screen.findByText('new text')).toBeInTheDocument()
})

test('#todo shows chips, appears in Next up with overdue first, checking updates the note', async () => {
  const u = userEvent.setup()
  const adapter = db()
  const mk = (id: string, body: string): Note => ({
    id, body, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', pinned: false, deleted_at: null,
  })
  await adapter.put(mk('a', '#todo\n- [ ] future thing by 2999-01-01\n- [ ] ancient thing by 2001-01-01\n- [ ] whenever'))
  render(<App adapter={adapter} />)
  await u.click(await screen.findByRole('tab', { name: /Next up/ }))
  const overdue = screen.getByRole('region', { name: 'Overdue' })
  expect(within(overdue).getByText('ancient thing')).toBeInTheDocument()
  expect(screen.getByRole('region', { name: 'Later' })).toHaveTextContent('future thing')
  expect(screen.getByText(/No deadline \(1\)/)).toBeInTheDocument()
  expect(document.title).toBe('(1) Necronotecon')

  await u.click(within(overdue).getByRole('checkbox'))
  await waitFor(async () => expect((await adapter.list())[0].body).toContain('- [x] ancient thing by 2001-01-01'))
  expect(screen.queryByRole('region', { name: 'Overdue' })).toBeNull()
})

test('typing the spec example creates two tasks with chips', async () => {
  const u = userEvent.setup()
  mount()
  await u.type(box(), '#todo pay rent by friday, book dentist by next tuesday{Control>}{Enter}{/Control}')
  await screen.findByText('pay rent')
  expect(screen.getByText('book dentist')).toBeInTheDocument()
  expect(document.querySelectorAll('.chip')).toHaveLength(2)
})

test('snooze rewrites the date in the note', async () => {
  const u = userEvent.setup()
  const adapter = db()
  await adapter.put({ id: 'a', body: '#todo\n- [ ] x by 2001-01-01', created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', pinned: false, deleted_at: null })
  render(<App adapter={adapter} />)
  await u.click(await screen.findByRole('tab', { name: /Next up/ }))
  await u.click(screen.getByRole('button', { name: 'Next week' }))
  await waitFor(async () => expect((await adapter.list())[0].body).not.toContain('2001'))
  expect(await screen.findByRole('region', { name: 'Later' })).toBeInTheDocument()
})
