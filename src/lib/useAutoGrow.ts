import { useLayoutEffect, type RefObject } from 'react'

/** Grow a textarea to fit its content (CSS max-height then makes it scroll). */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    if (el.scrollHeight) el.style.height = el.scrollHeight + 2 + 'px'
  }, [ref, value])
}
