import { hasTag } from './tags'
import { normalizeDeadline } from './deadline'

export type ListTag = 'groc' | 'todo'

const CHECK_RE = /^(\s*)- \[( |x|X)\] ?(.*)$/
const TAG_LINE_RE = (tag: string) => new RegExp(`(^|[^\\p{L}\\p{N}_&#])#${tag}(?![\\p{L}\\p{N}_-])`, 'iu')

export interface CheckItem {
  line: number
  checked: boolean
  text: string
}

export function parseCheckLine(line: string): { checked: boolean; text: string } | null {
  const m = CHECK_RE.exec(line)
  return m ? { checked: m[2] !== ' ', text: m[3] } : null
}

/** The list tag that drives formatting: whichever of #groc / #todo appears first in the text. */
export function listTagOf(body: string): ListTag | null {
  const cands = (['groc', 'todo'] as const)
    .filter((t) => hasTag(body, t))
    .map((t) => ({ t, at: TAG_LINE_RE(t).exec(body)?.index ?? Infinity }))
    .sort((a, b) => a.at - b.at)
  return cands[0]?.t ?? null
}

function splitItems(rest: string, tag: ListTag): string[] {
  const t = rest.trim()
  if (!t) return []
  if (t.includes(',')) return t.split(',').map((s) => s.trim()).filter(Boolean)
  // Spaces split groceries ("eggs milk"), but a todo is a sentence: one task.
  return tag === 'groc' ? t.split(/\s+/) : [t]
}

/**
 * Turn the text after the list tag into checkbox lines. Idempotent: existing
 * "- [ ]" / "- [x]" lines are kept, other text lines become unchecked items.
 */
export function formatList(body: string): string {
  const tag = listTagOf(body)
  if (!tag) return body
  const lines = body.split('\n')
  const idx = lines.findIndex((l) => TAG_LINE_RE(tag).test(l))
  const m = TAG_LINE_RE(tag).exec(lines[idx])!
  const tagStart = m.index + m[1].length
  const tagEnd = tagStart + 1 + tag.length
  const before = lines[idx].slice(0, tagStart).trimEnd()
  const rest = lines[idx].slice(tagEnd)
  const following = lines.slice(idx + 1)

  const out: string[] = [(before ? before + ' ' : '') + lines[idx].slice(tagStart, tagEnd)]
  const asItem = (s: string) => (parseCheckLine(s) ? s : `- [ ] ${s.trim()}`)

  if (following.some((l) => l.trim())) {
    if (rest.trim()) out.push(asItem(rest))
    for (const l of following) out.push(l.trim() ? asItem(l) : l)
  } else {
    for (const it of splitItems(rest, tag)) out.push(asItem(it))
  }
  return [...lines.slice(0, idx), ...out].join('\n')
}

/** Everything done on save: list formatting, then deadline normalisation on todo task lines. */
export function normalizeBody(body: string, now: Date): string {
  const formatted = formatList(body)
  if (listTagOf(formatted) !== 'todo') return formatted
  return formatted
    .split('\n')
    .map((l) => {
      const c = parseCheckLine(l)
      return c ? normalizeDeadline(l, now) : l
    })
    .join('\n')
}

export function checkItems(body: string): CheckItem[] {
  const out: CheckItem[] = []
  body.split('\n').forEach((l, line) => {
    const c = parseCheckLine(l)
    if (c) out.push({ line, ...c })
  })
  return out
}

export function setChecked(body: string, line: number, checked: boolean): string {
  const lines = body.split('\n')
  lines[line] = lines[line].replace(/^(\s*- \[)[ xX](\])/, `$1${checked ? 'x' : ' '}$2`)
  return lines.join('\n')
}

export function replaceLine(body: string, line: number, text: string): string {
  const lines = body.split('\n')
  lines[line] = text
  return lines.join('\n')
}

/** An open list: has the tag and at least one unchecked item. */
export function isOpenList(body: string, tag: ListTag): boolean {
  return hasTag(body, tag) && checkItems(body).some((i) => !i.checked)
}

/** Append the items of `incoming` (after normalising) to an existing list note. */
export function appendToList(existing: string, incoming: string, now: Date): string {
  const norm = normalizeBody(incoming, now).split('\n')
  const tag = listTagOf(incoming)
  const idx = tag ? norm.findIndex((l) => TAG_LINE_RE(tag).test(l)) : -1
  const items = norm.slice(idx + 1).filter((l) => l.trim())
  if (items.length === 0) return existing
  return existing.replace(/\s+$/, '') + '\n' + items.join('\n')
}
