import { parseDeadline, normalizeDeadline, setDeadline, stripDeadline, relativeDeadline, snoozeTarget, formatDeadline } from '../src/lib/deadline'
import { normalizeBody } from '../src/lib/checklist'

// Monday 5 Oct 2026, 10:00 local (Asia/Jerusalem, DST still on: UTC+3)
const ref = new Date(2026, 9, 5, 10, 0)
const iso = (d: Date | undefined) => d && formatDeadline(d)

test('runs in Asia/Jerusalem', () => {
  expect(new Date(2026, 9, 5, 10, 0).toISOString()).toBe('2026-10-05T07:00:00.000Z')
})

test.each([
  ['call landlord by friday', '2026-10-09'],
  ['renew passport due 20 nov', '2026-11-20'],
  ['send invoice by tomorrow 5pm', '2026-10-06 17:00'],
  ['book dentist by next tuesday', '2026-10-13'],
  ['x due on friday', '2026-10-09'],
  ['x before 2026-10-09 17:00', '2026-10-09 17:00'],
  ['x on monday at 9', '2026-10-12 09:00'],
  ['pay by sunday', '2026-10-11'],
])('%s -> %s', (text, expected) => {
  expect(iso(parseDeadline(text, ref)?.date)).toBe(expected)
})

test('no time means 23:59 local', () => {
  const d = parseDeadline('by friday', ref)!.date
  expect([d.getHours(), d.getMinutes()]).toEqual([23, 59])
})

test('dates are day-first (Israel), e.g. 3/4 is 3 April', () => {
  expect(iso(parseDeadline('on 3/4', ref)?.date)).toBe('2027-04-03')
})

test('unparseable or keyword-less text yields no deadline and never throws', () => {
  for (const s of ['turn on lights', 'by the way', 'due blargh', '', 'friday', 'by', '   on   ']) {
    expect(parseDeadline(s, ref)).toBeNull()
  }
})

test('normalising rewrites relative phrases to stable absolute ones', () => {
  expect(normalizeDeadline('call landlord by friday', ref)).toBe('call landlord by 2026-10-09')
  // Re-parsing a week later does not drift (a bare "friday" would roll forward).
  const later = new Date(2026, 9, 12, 10, 0)
  expect(iso(parseDeadline('call landlord by 2026-10-09', later)?.date)).toBe('2026-10-09')
  expect(normalizeDeadline('x by tomorrow 5pm', ref)).toBe('x by 2026-10-06 17:00')
  expect(normalizeDeadline('nothing here', ref)).toBe('nothing here')
})

test('setDeadline replace / add / remove', () => {
  const d = new Date(2026, 9, 20, 8, 30)
  expect(setDeadline('a by 2026-10-09', d, ref)).toBe('a by 2026-10-20 08:30')
  expect(setDeadline('a due friday ok', d, ref)).toBe('a due 2026-10-20 08:30 ok')
  expect(setDeadline('a', d, ref)).toBe('a by 2026-10-20 08:30')
  expect(setDeadline('a by 2026-10-09', null, ref)).toBe('a')
  expect(stripDeadline('a by friday', ref)).toBe('a')
})

test('spec example: two tasks, own deadlines', () => {
  const body = normalizeBody('#todo pay rent by friday, book dentist by next tuesday', ref)
  expect(body).toBe('#todo\n- [ ] pay rent by 2026-10-09\n- [ ] book dentist by 2026-10-13')
})

test('relative labels', () => {
  const t = (ms: number) => relativeDeadline(new Date(ref.getTime() + ms), ref)
  const H = 3600e3
  expect(t(2 * 24 * H + H)).toBe('in 2 days')
  expect(t(-3 * H)).toBe('3h overdue')
  expect(t(-30 * 60e3)).toBe('30m overdue')
  expect(t(45 * 60e3)).toBe('in 45m')
  expect(t(-25 * H)).toBe('1 day overdue')
})

test('snooze targets', () => {
  expect(iso(snoozeTarget('tonight', ref))).toBe('2026-10-05 20:00')
  expect(iso(snoozeTarget('tonight', new Date(2026, 9, 5, 21, 0)))).toBe('2026-10-05')
  expect(iso(snoozeTarget('tomorrow', ref))).toBe('2026-10-06')
  expect(iso(snoozeTarget('nextWeek', ref))).toBe('2026-10-12')
})

test('works in another time zone too (local fields, never UTC)', () => {
  const prev = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    const r = new Date(2026, 9, 5, 10, 0)
    const d = parseDeadline('x by friday', r)!.date
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([9, 23, 59])
  } finally {
    process.env.TZ = prev
  }
})

test('deadline across the DST change keeps 23:59 local', () => {
  // Israel DST ends Sun 25 Oct 2026.
  const d = parseDeadline('x by 26 oct', ref)!.date
  expect([d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([9, 26, 23, 59])
})
