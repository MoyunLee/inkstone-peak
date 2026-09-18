import { useEffect, useState } from 'react'

/** 探针线在顶栏之下再多探出去这一段——与 .prose 标题的 scroll-margin-top 同源（post.css）。 */
const PROBE_GAP = 16

/**
 * 跟踪详情页目录的「当前章节」：以标题的 scroll-margin-top 线为探针，滚过这条线的最后一段即当前段。
 *
 * 停在标题区（还没进入任何一段）返回 null；滚动触底时兜底认最后一段，避免短末段永远选不中。
 *
 * @param ids 目录项的 DOM id 列表；**必须按文档顺序**给出，函数依赖此序做提前退出。
 * @returns 当前激活标题的 id；没有命中时返回 null。
 * @example
 * const activeId = useTocSpy(items.map((it) => it.id))
 * <a href={'#' + it.id} aria-current={it.id === activeId ? 'location' : undefined}>{it.text}</a>
 */
export function useTocSpy(ids: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null)
  // 依赖用拼串算：调用方每次渲染都递新数组，按引用比对会把监听反复拆装。
  const key = ids.join('\u0001')
  useEffect(() => {
    const list = key === '' ? [] : key.split('\u0001')
    if (list.length === 0) {
      setActiveId(null)
      return
    }
    const navH = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64
    const line = navH + PROBE_GAP
    let raf = 0
    const pick = (): void => {
      raf = 0
      // 触底兜底：末段短到永远压不过探针线时，直接把最后一条认作当前
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
        setActiveId(list[list.length - 1] ?? null)
        return
      }
      let found: string | null = null
      for (const id of list) {
        const el = document.getElementById(id)
        if (el === null) continue
        // list 即文档序：一旦某条还没到线，后面的更到不了，可以收工
        if (el.getBoundingClientRect().top <= line + 1) found = id
        else break
      }
      setActiveId(found)
    }
    const schedule = (): void => {
      if (raf === 0) raf = requestAnimationFrame(pick)
    }
    pick()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // 字体迟到 / 图片撑开会挪标题，两处各补一拍（与 SideTabs 的抖法一致）
    if (document.fonts) void document.fonts.ready.then(schedule)
    const settle = window.setTimeout(schedule, 400)
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      window.clearTimeout(settle)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [key])
  return activeId
}
