import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useMotionSafe } from '../../../lib/hooks/useMotionSafe'
import { useTocSpy } from '../../../lib/hooks/useTocSpy'
import type { TocItem } from '../../../lib/types/content'

interface Node {
  item: TocItem
  children: Node[]
}

function buildTree(items: TocItem[]): Node[] {
  const root: Node[] = []
  const stack: Node[] = []
  for (const item of items) {
    const node: Node = { item, children: [] }
    while (stack.length > 0 && (stack[stack.length - 1] as Node).item.level >= item.level) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) parent.children.push(node)
    else root.push(node)
    stack.push(node)
  }
  return root
}

function tocLink(id: string, text: string, activeId: string | null): ReactNode {
  return (
    <a href={`#${id}`} data-toc-id={id} aria-current={id === activeId ? 'location' : undefined}>
      {text}
    </a>
  )
}

function renderNodes(nodes: Node[], activeId: string | null): ReactNode {
  return (
    <ol className="post-toc-list">
      {nodes.map((n) => (
        <li key={n.item.id} className="post-toc-item">
          {tocLink(n.item.id, n.item.text, activeId)}
          {n.children.length > 0 ? renderNodes(n.children, activeId) : null}
        </li>
      ))}
    </ol>
  )
}

/**
 * 文章目录（TOC）：把构建期的标题清单渲染成嵌套 <ol>，并高亮当前章节。
 *
 * number=目录与正文标题同步编号，simple=扁平不嵌套；当前章节由 useTocSpy 跟踪，命中项染朱。
 * 侧栏落位时只滚目录自身（手算 scrollTop），不惊动整页。
 *
 * @param items 构建期标题清单（level / id / text）。
 * @param number true=自动编号。
 * @param simple true=扁平列表，不做层级嵌套。
 * @param label 可访问名（site.yml a11y）。
 * @param variant 'aside'=侧栏落位（跟随当前行）；'inline'=正文内联。
 * @example
 * <PostToc items={entry.tocItems} number={entry.toc_number} simple={entry.toc_style_simple} label={a.post_toc_label} variant="aside" />
 */
export default function PostToc({
  items,
  number,
  simple,
  label,
  variant,
}: {
  items: TocItem[]
  number: boolean
  simple: boolean
  label?: string
  variant: 'aside' | 'inline'
}) {
  const navRef = useRef<HTMLElement | null>(null)
  const reduceMotion = useMotionSafe()
  const activeId = useTocSpy(items.map((it) => it.id))

  // 目录跟到当前行：只在侧栏落位（目录自身可滚）时动手，且已经看得见就不动——
  // 否则每次换段都把目录抖一下。手算 scrollTop 是为了不惊动整页（scrollIntoView 会连带滚页面）。
  useEffect(() => {
    if (activeId === null || variant !== 'aside') return
    const nav = navRef.current
    if (nav === null) return
    const link = nav.querySelector<HTMLElement>(`a[data-toc-id="${CSS.escape(activeId)}"]`)
    if (link === null) return
    const navBox = nav.getBoundingClientRect()
    const linkBox = link.getBoundingClientRect()
    const margin = 16
    if (linkBox.top >= navBox.top + margin && linkBox.bottom <= navBox.bottom - margin) return
    const target = nav.scrollTop + (linkBox.top - navBox.top) - (navBox.height - linkBox.height) / 2
    nav.scrollTo({ top: Math.max(0, target), behavior: reduceMotion ? 'auto' : 'smooth' })
  }, [activeId, variant, reduceMotion])

  if (items.length === 0) return null
  return (
    <nav
      ref={navRef}
      className="post-toc"
      data-simple={simple ? 'true' : 'false'}
      data-number={number ? 'true' : 'false'}
      data-variant={variant}
      aria-label={label}
    >
      {simple ? (
        <ol className="post-toc-list">
          {items.map((it) => (
            <li key={it.id} className="post-toc-item">
              {tocLink(it.id, it.text, activeId)}
            </li>
          ))}
        </ol>
      ) : (
        renderNodes(buildTree(items), activeId)
      )}
    </nav>
  )
}
