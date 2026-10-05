const URL_RE = /https?:\/\/[^\s<>"]+/g

export interface LinkPreview {
  url: string
  title: string
  domain: string
}

/** URLs in a line, without trailing punctuation. */
export function extractUrls(line: string): string[] {
  return [...line.matchAll(URL_RE)].map((m) => m[0].replace(/[.,;:!?)\]'"]+$/, ''))
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function slugTitle(url: string): string {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''
    const t = decodeURIComponent(seg).replace(/\.\w{2,5}$/, '').replace(/[-_+]+/g, ' ').trim()
    return /[\p{L}]{2}/u.test(t) ? t : ''
  } catch {
    return ''
  }
}

/**
 * Title and domain for each URL on a line. No network access: the title is the
 * text the user wrote next to the link, else the last path segment, else the domain.
 */
export function previewsOf(line: string): LinkPreview[] {
  const urls = extractUrls(line)
  if (urls.length === 0) return []
  const label = line
    .replace(URL_RE, ' ')
    .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, ' ')
    .replace(/^\s*(?:[-*]\s+)?/, '')
    .replace(/\s+/g, ' ')
    .trim()
  return urls.map((url) => ({
    url,
    title: (urls.length === 1 && label) || slugTitle(url) || domainOf(url),
    domain: domainOf(url),
  }))
}
