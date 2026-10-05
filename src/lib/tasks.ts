import type { Note } from './types'
import { checkItems } from './checklist'
import { hasTag } from './tags'
import { parseDeadline, stripDeadline } from './deadline'

export interface Task {
  noteId: string
  line: number
  checked: boolean
  /** Task text with the deadline phrase removed. */
  text: string
  deadline: Date | null
}

/** Tasks of one note: checkbox lines in a #todo note. */
export function tasksOf(note: Pick<Note, 'id' | 'body'>, ref: Date): Task[] {
  if (!hasTag(note.body, 'todo')) return []
  return checkItems(note.body).map((i) => ({
    noteId: note.id,
    line: i.line,
    checked: i.checked,
    text: stripDeadline(i.text, ref),
    deadline: parseDeadline(i.text, ref)?.date ?? null,
  }))
}

export interface NextUp {
  overdue: Task[]
  today: Task[]
  tomorrow: Task[]
  thisWeek: Task[]
  later: Task[]
  none: Task[]
}

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

/** Sunday 00:00 local time of the week containing d (weeks start on Sunday). */
export function startOfWeek(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
}

export function buildNextUp(notes: Note[], now: Date): NextUp {
  const res: NextUp = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [], none: [] }
  const dayStart = startOfDay(now)
  const tomorrowStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1)
  const dayAfter = new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 2)
  const wk = startOfWeek(now)
  const nextWeekStart = new Date(wk.getFullYear(), wk.getMonth(), wk.getDate() + 7)

  for (const note of notes) {
    if (note.deleted_at) continue
    for (const t of tasksOf(note, now)) {
      if (t.checked) continue
      const d = t.deadline
      if (!d) res.none.push(t)
      else if (d < now) res.overdue.push(t)
      else if (d < tomorrowStart) res.today.push(t)
      else if (d < dayAfter) res.tomorrow.push(t)
      else if (d < nextWeekStart) res.thisWeek.push(t)
      else res.later.push(t)
    }
  }
  const byDeadline = (a: Task, b: Task) => a.deadline!.getTime() - b.deadline!.getTime()
  for (const k of ['overdue', 'today', 'tomorrow', 'thisWeek', 'later'] as const) res[k].sort(byDeadline)
  return res
}

/** Tasks that need attention now: overdue plus due today. */
export function urgentCount(n: NextUp): number {
  return n.overdue.length + n.today.length
}
