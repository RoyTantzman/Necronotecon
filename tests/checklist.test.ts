import { formatList, normalizeBody, appendToList, isOpenList, setChecked, checkItems } from '../src/lib/checklist'

const now = new Date(2026, 9, 5, 10, 0)

test('#groc splits on commas', () => {
  expect(formatList('#groc eggs, milk, olive oil')).toBe('#groc\n- [ ] eggs\n- [ ] milk\n- [ ] olive oil')
})
test('#groc splits on spaces when no commas', () => {
  expect(formatList('#groc eggs milk')).toBe('#groc\n- [ ] eggs\n- [ ] milk')
})
test('multi-line: each line is an item, commas are kept', () => {
  expect(formatList('#groc\neggs, large\nmilk')).toBe('#groc\n- [ ] eggs, large\n- [ ] milk')
  expect(formatList('#groc eggs\nmilk')).toBe('#groc\n- [ ] eggs\n- [ ] milk')
})
test('formatting is idempotent and keeps checked state', () => {
  const once = formatList('#groc eggs, milk')
  expect(formatList(once)).toBe(once)
  const edited = setChecked(once, 1, true) + '\nbread'
  expect(formatList(edited)).toBe('#groc\n- [x] eggs\n- [ ] milk\n- [ ] bread')
})
test('text before the tag is preserved; no tag means no change', () => {
  expect(formatList('Shopping\n#groc a, b')).toBe('Shopping\n#groc\n- [ ] a\n- [ ] b')
  expect(formatList('just text, with commas')).toBe('just text, with commas')
  expect(formatList('#home stuff')).toBe('#home stuff')
})
test('#todo: a single sentence is one task (no space splitting)', () => {
  expect(formatList('#todo call landlord by friday')).toBe('#todo\n- [ ] call landlord by friday')
})
test('open list detection and append', () => {
  const list = normalizeBody('#groc eggs, milk', now)
  expect(isOpenList(list, 'groc')).toBe(true)
  expect(isOpenList('#groc\n- [x] eggs', 'groc')).toBe(false)
  expect(appendToList(list, '#groc bread, tea', now)).toBe('#groc\n- [ ] eggs\n- [ ] milk\n- [ ] bread\n- [ ] tea')
  expect(checkItems(list).map((i) => i.line)).toEqual([1, 2])
})
