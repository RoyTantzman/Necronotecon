const TAG_RE = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_-]+)/gu

/** Lowercase tags in a note body, in order of first appearance, without '#'. */
export function extractTags(body: string): string[] {
  const out: string[] = []
  for (const m of body.matchAll(TAG_RE)) {
    const t = m[2].toLowerCase()
    if (!out.includes(t)) out.push(t)
  }
  return out
}

export function hasTag(body: string, tag: string): boolean {
  return extractTags(body).includes(tag.toLowerCase())
}

/** All distinct tags across notes, most used first. */
export function allTags(bodies: string[]): string[] {
  const counts = new Map<string, number>()
  for (const b of bodies) for (const t of extractTags(b)) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t)
}

/** The partial #tag being typed immediately before the caret, if any. */
export function tagBeingTyped(text: string, caret: number): { prefix: string; start: number } | null {
  const m = /(^|[^\p{L}\p{N}_&#])#([\p{L}\p{N}_-]*)$/u.exec(text.slice(0, caret))
  if (!m) return null
  return { prefix: m[2].toLowerCase(), start: caret - m[2].length - 1 }
}

export function suggestTags(known: string[], prefix: string, limit = 5): string[] {
  return known.filter((t) => t.startsWith(prefix) && t !== prefix).slice(0, limit)
}
