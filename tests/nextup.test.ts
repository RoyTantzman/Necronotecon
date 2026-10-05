import { buildNextUp, startOfWeek, tasksOf, urgentCount } from '../src/lib/tasks'
import type { Note } from '../src/lib/types'

let n = 0
const note = (body: string, extra: Partial<Note> = {}): Note => ({
  id: 'n' + ++n,
  body,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  pinned: false,
  deleted_at: null,
  ...extra,
})
const texts = (ts: { text: string }[]) => ts.map((t) => t.text)

// Wednesday 7 Oct 2026, 12:00 local. Week = Sun 4 Oct .. Sat 10 Oct.
const now = new Date(2026, 9, 7, 12, 0)

test('week starts on Sunday', () => {
  expect(startOfWeek(new Date(2026, 9, 10, 23, 0)).getDate()).toBe(4) // Saturday -> Sun 4
  expect(startOfWeek(new Date(2026, 9, 11, 0, 0)).getDate()).toBe(11) // Sunday starts a new week
  expect(startOfWeek(new Date(2026, 9, 4, 0, 0)).getDate()).toBe(4)
})

test('grouping and ordering', () => {
  const r = buildNextUp(
    [
      note(
        [
          '#todo',
          '- [ ] later b by 2026-11-20',
          '- [ ] later a by 2026-10-12',
          '- [ ] sat by 2026-10-10',
          '- [ ] fri by 2026-10-09',
          '- [ ] tomorrow late by 2026-10-08 23:00',
          '- [ ] tomorrow early by 2026-10-08 08:00',
          '- [ ] today eve by 2026-10-07 20:00',
          '- [ ] today end by 2026-10-07',
          '- [ ] over 1h by 2026-10-07 11:00',
          '- [ ] over 3d by 2026-10-04 09:00',
          '- [ ] nodate',
          '- [x] done by 2026-10-01',
        ].join('\n'),
      ),
    ],
    now,
  )
  expect(texts(r.overdue)).toEqual(['over 3d', 'over 1h'])
  expect(texts(r.today)).toEqual(['today eve', 'today end'])
  expect(texts(r.tomorrow)).toEqual(['tomorrow early', 'tomorrow late'])
  expect(texts(r.thisWeek)).toEqual(['fri', 'sat'])
  expect(texts(r.later)).toEqual(['later a', 'later b'])
  expect(texts(r.none)).toEqual(['nodate'])
  expect(urgentCount(r)).toBe(4)
})

test('week boundary: Sunday after Saturday is "Later", Saturday 23:59 is "This week"', () => {
  const r = buildNextUp([note('#todo\n- [ ] sat by 2026-10-10\n- [ ] sun by 2026-10-11 00:00')], now)
  expect(texts(r.thisWeek)).toEqual(['sat'])
  expect(texts(r.later)).toEqual(['sun'])
})

test('on a Saturday, Sunday is tomorrow and the rest of next week is Later', () => {
  const sat = new Date(2026, 9, 10, 9, 0)
  const r = buildNextUp([note('#todo\n- [ ] a by 2026-10-11\n- [ ] b by 2026-10-12')], sat)
  expect(texts(r.tomorrow)).toEqual(['a'])
  expect(texts(r.later)).toEqual(['b'])
})

test('just past the deadline is overdue; exactly at it is today', () => {
  const r = buildNextUp([note('#todo\n- [ ] a by 2026-10-07 12:00\n- [ ] b by 2026-10-07 11:59')], now)
  expect(texts(r.overdue)).toEqual(['b'])
  expect(texts(r.today)).toEqual(['a'])
})

test('ignores deleted notes, non-todo notes and checked tasks', () => {
  const r = buildNextUp(
    [
      note('#todo\n- [ ] gone', { deleted_at: '2026-10-02T00:00:00Z' }),
      note('#groc\n- [ ] eggs'),
      note('#todo\n- [x] done'),
    ],
    now,
  )
  expect(Object.values(r).flat()).toEqual([])
})

test('tasks across notes merge into one sorted list; line numbers point at the source', () => {
  const a = note('hello\n#todo\n- [ ] a by 2026-10-10')
  const b = note('#todo\n- [ ] b by 2026-10-09')
  const r = buildNextUp([a, b], now)
  expect(texts(r.thisWeek)).toEqual(['b', 'a'])
  expect(tasksOf(a, now)[0].line).toBe(2)
})

test('a task due 23:30 local is today when it is 00:30 local (UTC date differs)', () => {
  const r = buildNextUp([note('#todo\n- [ ] x by 2026-10-07 23:30')], new Date(2026, 9, 7, 0, 30))
  expect(texts(r.today)).toEqual(['x'])
})
