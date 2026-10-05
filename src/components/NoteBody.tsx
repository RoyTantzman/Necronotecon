import type { ReactNode } from 'react'
import { parseCheckLine } from '../lib/checklist'
import { hasTag } from '../lib/tags'
import { highlight } from '../lib/search'
import { parseDeadline, setDeadline, stripDeadline } from '../lib/deadline'
import { DeadlineChip } from './DeadlineChip'
import { domainOf, extractUrls, previewsOf } from '../lib/links'

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
  const isRead = hasTag(body, 'read')
  const rows: ReactNode[] = body.split('\n').map((line, i) => {
    const c = parseCheckLine(line)
    if (!c && isRead && extractUrls(line).length) {
      return (
        <div key={i} className="line previews" onClick={(e) => e.stopPropagation()}>
          {previewsOf(line).map((p, j) => (
            <a key={j} className="preview" href={p.url} target="_blank" rel="noopener noreferrer">
              <span className="preview-title"><Hl text={p.title} query={query} /></span>
              <span className="preview-domain">{p.domain}</span>
            </a>
          ))}
        </div>
      )
    }
    if (!c) return <div key={i} className="line">{line ? <Hl text={line} query={query} /> : ' '}</div>
    const dl = isTodo ? parseDeadline(c.text, now) : null
    const text = isTodo && dl ? stripDeadline(c.text, now) : c.text
    return (
      <label key={i} className={'line check' + (c.checked ? ' done' : '')} onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={c.checked} onChange={(e) => onToggle(i, e.target.checked)} />
        <span className="check-text">
          {isRead && extractUrls(text).length ? <Linkified text={text} /> : <Hl text={text} query={query} />}
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

/** Plain text with URLs turned into links labelled by domain. */
function Linkified({ text }: { text: string }) {
  const urls = extractUrls(text)
  const out: ReactNode[] = []
  let rest = text
  urls.forEach((u, i) => {
    const at = rest.indexOf(u)
    out.push(<span key={`t${i}`}>{rest.slice(0, at)}</span>)
    out.push(
      <a key={`a${i}`} href={u} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
        {domainOf(u)}
      </a>,
    )
    rest = rest.slice(at + u.length)
  })
  out.push(<span key="end">{rest}</span>)
  return <>{out}</>
}
