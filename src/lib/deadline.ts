import * as chrono from 'chrono-node'

export interface Deadline {
  date: Date
  /** Character range [start, end) of "<keyword> <phrase>" within the parsed text. */
  start: number
  end: number
  hasTime: boolean
}

const KEYWORD_RE = /\b(by|due|before|on)\b/gi

const pad = (n: number) => String(n).padStart(2, '0')

export function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 0, 0)
}

/**
 * Find a deadline in free text: one of by/due/before/on followed by a natural-language date.
 * Never throws; returns null when nothing is recognised. Without an explicit time the
 * deadline is 23:59 local time that day.
 */
export function parseDeadline(text: string, ref: Date): Deadline | null {
  try {
    for (const kw of text.matchAll(KEYWORD_RE)) {
      const from = kw.index! + kw[0].length
      const rest = text.slice(from)
      const lead = rest.length - rest.trimStart().length
      const results = chrono.en.GB.parse(rest, ref, { forwardDate: true })
      const r = results[0]
      if (!r || r.index !== lead) continue
      const hasTime = r.start.isCertain('hour')
      const date = r.start.date()
      if (Number.isNaN(date.getTime())) continue
      return {
        date: hasTime ? date : endOfDay(date),
        start: kw.index!,
        end: from + r.index + r.text.length,
        hasTime,
      }
    }
  } catch {
    // fall through: unparseable text just has no deadline
  }
  return null
}

/** Canonical absolute form written into note text: 2026-10-09 or 2026-10-09 17:00. */
export function formatDeadline(d: Date): string {
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return d.getHours() === 23 && d.getMinutes() === 59 ? date : `${date} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Replace/insert/remove the deadline on one line of text. */
export function setDeadline(line: string, date: Date | null, ref: Date): string {
  const found = parseDeadline(line, ref)
  if (!found) return date ? `${line.trimEnd()} by ${formatDeadline(date)}` : line
  const keyword = /^\w+/.exec(line.slice(found.start))![0]
  const before = line.slice(0, found.start).trimEnd()
  const after = line.slice(found.end)
  if (!date) return (before + after).trimEnd()
  return `${before}${before ? ' ' : ''}${keyword} ${formatDeadline(date)}${after}`
}

/** Rewrite a recognised relative phrase ("by friday") to an absolute date so it cannot drift. */
export function normalizeDeadline(line: string, ref: Date): string {
  const found = parseDeadline(line, ref)
  return found ? setDeadline(line, found.date, ref) : line
}

/** Line text with the deadline phrase removed. */
export function stripDeadline(line: string, ref: Date): string {
  const found = parseDeadline(line, ref)
  return found ? (line.slice(0, found.start) + line.slice(found.end)).replace(/\s+/g, ' ').trim() : line.trim()
}

export function relativeDeadline(date: Date, now: Date): string {
  const diff = date.getTime() - now.getTime()
  const abs = Math.abs(diff)
  const min = Math.floor(abs / 60000)
  let label: string
  if (min < 1) return diff < 0 ? 'just overdue' : 'now'
  if (min < 60) label = `${min}m`
  else if (min < 24 * 60) label = `${Math.floor(min / 60)}h`
  else {
    const days = Math.floor(min / (24 * 60))
    label = days === 1 ? '1 day' : `${days} days`
  }
  return diff < 0 ? `${label} overdue` : `in ${label}`
}

export function snoozeTarget(kind: 'tonight' | 'tomorrow' | 'nextWeek', now: Date): Date {
  if (kind === 'tonight') {
    const eight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 0, 0, 0)
    return now < eight ? eight : endOfDay(now)
  }
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (kind === 'tomorrow' ? 1 : 7))
  return endOfDay(d)
}
