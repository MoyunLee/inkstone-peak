import { useEffect, useRef } from 'react'

/**
 * 正文渲染：把构建期生成的 HTML 直出（dangerouslySetInnerHTML），并在 highlight_shrink 打开时
 * 给每个 <pre> 后置套一层带按钮的折叠壳。
 *
 * ⚠ `html` 必须是**构建期受信产物**（markdown-it html:false + 内容 schema 校验）：本组件不做任何转义，
 *    传入不受信内容等于 XSS。安全不变量写在 scripts/content/paths.ts。
 * 折叠壳是 effect 里手工包裹、卸载时还原的，React 不接管这段 DOM。
 *
 * @param html 构建期渲染好的正文 HTML（受信）。
 * @param shrink true=代码框默认折叠。
 * @param expandLabel 展开态按钮文案（site.yml a11y）。
 * @param collapseLabel 折叠态按钮文案（site.yml a11y）。
 * @param math 数学引擎标记，只落成 data-math 供 CSS 用。
 * @param aplayer 是否落成 data-aplayer 供 CSS 用。
 * @example
 * <PostBody html={entry.bodyHtml} shrink={entry.highlight_shrink} math={entry.mathjax ? 'mathjax' : null} aplayer={entry.aplayer} />
 */
export default function PostBody({
  html,
  shrink,
  expandLabel,
  collapseLabel,
  math,
  aplayer,
}: {
  html: string
  shrink: boolean
  expandLabel?: string
  collapseLabel?: string
  math: 'mathjax' | 'katex' | null
  aplayer: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    if (!root || !shrink) return
    const wraps: HTMLDivElement[] = []
    for (const pre of Array.from(root.querySelectorAll('pre'))) {
      if (pre.parentElement?.classList.contains('cs-wrap')) continue
      const wrap = document.createElement('div')
      wrap.className = 'cs-wrap'
      pre.parentNode?.insertBefore(wrap, pre)
      wrap.appendChild(pre)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'cs-btn'
      btn.textContent = expandLabel ?? ''
      btn.addEventListener('click', () => {
        const open = wrap.classList.toggle('cs-open')
        btn.textContent = open ? (collapseLabel ?? '') : (expandLabel ?? '')
      })
      wrap.appendChild(btn)
      wraps.push(wrap)
    }
    return () => {
      for (const wrap of wraps) {
        const pre = wrap.querySelector('pre')
        const parent = wrap.parentNode
        if (pre && parent) parent.insertBefore(pre, wrap)
        wrap.remove()
      }
    }
  }, [html, shrink, expandLabel, collapseLabel])

  return (
    <div
      ref={ref}
      className="prose"
      data-shrink={shrink ? 'true' : 'false'}
      data-math={math ?? undefined}
      data-aplayer={aplayer ? 'true' : 'false'}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
