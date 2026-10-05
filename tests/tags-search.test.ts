import { extractTags, tagBeingTyped, suggestTags, allTags } from '../src/lib/tags'
import { matchesQuery, highlight } from '../src/lib/search'

test('extracts lowercase unique tags, ignoring non-tags', () => {
  expect(extractTags('#Groc eggs #home #groc a#b C#')).toEqual(['groc', 'home'])
  expect(extractTags('no tags & ## here')).toEqual([])
})

test('tag autocomplete', () => {
  expect(tagBeingTyped('hi #gr', 6)).toEqual({ prefix: 'gr', start: 3 })
  expect(tagBeingTyped('hi gr', 5)).toBeNull()
  expect(suggestTags(allTags(['#groc', '#groc #green', '#todo']), 'g')).toEqual(['groc', 'green'])
})

test('search is case-insensitive, partial, AND-ed', () => {
  expect(matchesQuery('Buy Olive Oil', 'oliv')).toBe(true)
  expect(matchesQuery('Buy Olive Oil', 'OIL buy')).toBe(true)
  expect(matchesQuery('Buy Olive Oil', 'butter')).toBe(false)
  expect(matchesQuery('anything', '  ')).toBe(true)
})

test('#tag search filters by tag, not by text', () => {
  expect(matchesQuery('#groc eggs', '#groc')).toBe(true)
  expect(matchesQuery('mention groc here', '#groc')).toBe(false)
  expect(matchesQuery('#grocery', '#groc')).toBe(true)
})

test('highlight marks matches and survives regex characters', () => {
  expect(highlight('Hello world', 'o')).toEqual([
    { text: 'Hell', match: false },
    { text: 'o', match: true },
    { text: ' w', match: false },
    { text: 'o', match: true },
    { text: 'rld', match: false },
  ])
  expect(highlight('a (b) c', '(b')).toContainEqual({ text: '(b', match: true })
})
