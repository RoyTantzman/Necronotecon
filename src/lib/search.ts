import { extractTags } from './tags'

export interface Segment {
  text: string
  match: boolean
}

function tokens(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean)
}

/**
 * Case-insensitive, partial-word search. Every token must match (AND).
 * A token starting with '#' matches notes having a tag that starts with it.
 */
export function matchesQuery(body: string, query: string): boolean {
  const ts = tokens(query)
  if (ts.length === 0) return true
  const lower = body.toLowerCase()
  const tags = extractTags(body)
  return ts.every((t) => {
    if (t.startsWith('#') && t.length > 1) return tags.some((g) => g.startsWith(t.slice(1)))
    return lower.includes(t)
  })
}

/** Split text into segments, flagging the parts that match query tokens. */
export function highlight(text: string, query: string): Segment[] {
  const ts = [...new Set(tokens(query).filter((t) => t !== '#'))].sort((a, b) => b.length - a.length)
  if (ts.length === 0 || !text) return [{ text, match: false }]
  const re = new RegExp(ts.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gi')
  const out: Segment[] = []
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m[0] === '') continue
    if (m.index! > last) out.push({ text: text.slice(last, m.index), match: false })
    out.push({ text: m[0], match: true })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last), match: false })
  return out.length ? out : [{ text, match: false }]
}
