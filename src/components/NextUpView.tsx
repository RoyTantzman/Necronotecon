import type { Note } from '../lib/types'
import { buildNextUp, type Task } from '../lib/tasks'
import { relativeDeadline, setDeadline, snoozeTarget } from '../lib/deadline'
import { replaceLine, setChecked } from '../lib/checklist'

interface Props {
  notes: Note[]
  now: Date
  onPatch: (id: string, body: string) => void
  onOpenNote: (id: string) => void
}

export function NextUpView({ notes, now, onPatch, onOpenNote }: Props) {
  const n = buildNextUp(notes, now)
  const byId = new Map(notes.map((x) => [x.id, x]))

  const row = (t: Task) => {
    const note = byId.get(t.noteId)!
    const lineText = note.body.split('\n')[t.line]
    const snooze = (kind: 'tonight' | 'tomorrow' | 'nextWeek') =>
      onPatch(note.id, replaceLine(note.body, t.line, setDeadline(lineText, snoozeTarget(kind, now), now)))
    return (
      <li key={`${t.noteId}:${t.line}`} className={'task' + (t.deadline && t.deadline < now ? ' overdue' : '')}>
        <label>
          <input
            type="checkbox"
            checked={false}
            onChange={() => onPatch(note.id, setChecked(note.body, t.line, true))}
          />
          <span className="task-text">{t.text || '(empty task)'}</span>
        </label>
        {t.deadline && <span className="rel">{relativeDeadline(t.deadline, now)}</span>}
        <button type="button" className="link" onClick={() => onOpenNote(note.id)}>
          source note
        </button>
        <span className="snooze">
          <button type="button" onClick={() => snooze('tonight')}>Tonight</button>
          <button type="button" onClick={() => snooze('tomorrow')}>Tomorrow</button>
          <button type="button" onClick={() => snooze('nextWeek')}>Next week</button>
        </span>
      </li>
    )
  }

  const group = (title: string, tasks: Task[], cls = '') =>
    tasks.length > 0 && (
      <section className={'group ' + cls} aria-label={title}>
        <h2>{title}</h2>
        <ul>{tasks.map(row)}</ul>
      </section>
    )

  const total = Object.values(n).reduce((a, g) => a + g.length, 0)
  return (
    <div className="nextup">
      {total === 0 && <p className="empty">Nothing left undone. Suspicious.</p>}
      {group('Overdue', n.overdue, 'overdue')}
      {group('Today', n.today)}
      {group('Tomorrow', n.tomorrow)}
      {group('This week', n.thisWeek)}
      {group('Later', n.later)}
      {n.none.length > 0 && (
        <details className="group none">
          <summary>No deadline ({n.none.length})</summary>
          <ul>{n.none.map(row)}</ul>
        </details>
      )}
    </div>
  )
}
