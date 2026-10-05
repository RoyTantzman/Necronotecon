import type { ReactNode } from 'react'
import { parseCheckLine } from '../lib/checklist'
import { hasTag } from '../lib/tags'
import { highlight } from '../lib/search'
import { parseDeadline, setDeadline, stripDeadline } from '../lib/deadline'
import { DeadlineChip } from './DeadlineChip'

function Hl({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((s, i) => (s.match ? <mark key={i}>{s.text}</mark> : <span key={i}>{s.text}</span>))}
    </>
  )
}

interface Props {
  body: string
  query: string
  now: Date
  onToggle: (line: number, checked: boolean) => void
  onLineChange: (line: number, text: string) => void
}

/** Read-only rendering of a note: checkboxes are tickable, dates show as chips. */
export function NoteBody({ body, query, now, onToggle, onLineChange }: Props) {
  const isTodo = hasTag(body, 'todo')
  const rows: ReactNode[] = body.split('\n').map((line, i) => {
    const c = parseCheckLine(line)
    if (!c) return <div key={i} className="line">{line ? <Hl text={line} query={query} /> : ' '}</div>
    const dl = isTodo ? parseDeadline(c.text, now) : null
    const text = isTodo && dl ? stripDeadline(c.text, now) : c.text
    return (
      <label key={i} className={'line check' + (c.checked ? ' done' : '')} onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={c.checked} onChange={(e) => onToggle(i, e.target.checked)} />
        <span className="check-text">
          <Hl text={text} query={query} />
        </span>
        {dl && (
          <DeadlineChip
            date={dl.date}
            now={now}
            muted={c.checked}
            onChange={(d) => onLineChange(i, setDeadline(line, d, now))}
          />
        )}
      </label>
    )
  })
  return <div className="note-body">{rows}</div>
}
