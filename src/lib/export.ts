import type { Note } from './types'

const live = (notes: Note[]) =>
  notes.filter((n) => !n.deleted_at).sort((a, b) => b.created_at.localeCompare(a.created_at))

export function exportJson(notes: Note[]): string {
  return JSON.stringify(live(notes), null, 2)
}

/** One Markdown file; notes are separated by rules, each headed by its creation time. */
export function exportMarkdown(notes: Note[]): string {
  const parts = live(notes).map((n) => `<!-- ${n.id} -->\n## ${n.created_at}${n.pinned ? ' (pinned)' : ''}\n\n${n.body.trim()}\n`)
  return `# Necronotecon export\n\n${parts.join('\n---\n\n')}`
}

export function download(filename: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
