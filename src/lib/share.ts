/**
 * Body for a note created through the Android share sheet (manifest share_target).
 * Chrome usually puts the link in `text`, so the URL is only added when missing.
 */
export function shareBody(params: URLSearchParams): string | null {
  const title = (params.get('title') ?? '').trim()
  const text = (params.get('text') ?? '').trim()
  const url = (params.get('url') ?? '').trim()
  const parts: string[] = []
  if (title && title !== text) parts.push(title)
  if (text) parts.push(text)
  if (url && !text.includes(url)) parts.push(url)
  return parts.length ? parts.join('\n') : null
}
