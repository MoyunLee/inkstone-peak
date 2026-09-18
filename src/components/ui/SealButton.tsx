import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  to: string
  chip?: 'a' | 'b' | 'foot'
  className?: string
  ariaLabel?: string
  onNavGuard?: (to: string) => boolean
  children: ReactNode
}

/**
 * 全站唯一墨框按钮（.seal-btn）：山门两枚 CTA、各段「查看详细」、页脚「联系我」都用它。
 *
 * 按目标自动分流：`http(s):` / `mailto:` 走原生 <a>（http 外链开新窗并带 rel="noopener noreferrer"），其余走 <Link>。
 *
 * @param to 目标地址；决定渲染 <a> 还是 <Link>。
 * @param chip 视觉变体 a / b / foot；省略则为素框。
 * @param className 追加类名（与变体类拼接）。
 * @param ariaLabel 可访问名；纯图标型按钮必须给。
 * @param onNavGuard 点击守卫——返回 false 表示拦下，组件会 preventDefault；省略则不拦截。
 * @param children 按钮内容。
 * @example
 * <SealButton to="/portfolio" chip="a" onNavGuard={() => false}>查看详细</SealButton>
 */
export default function SealButton({ to, chip, className = '', ariaLabel, onNavGuard, children }: Props) {
  const cls = ['seal-btn', chip === 'a' ? 'chip-a' : chip === 'b' ? 'chip-b' : chip === 'foot' ? 'foot-cta' : '', className].filter(Boolean).join(' ')
  const guard = onNavGuard
    ? (e: { preventDefault: () => void }) => {
        if (!onNavGuard(to)) e.preventDefault()
      }
    : undefined
  const external = /^(https?:|mailto:)/.test(to)
  return external ? (
    <a className={cls} href={to} aria-label={ariaLabel} onClick={guard} target={to.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer">
      {children}
    </a>
  ) : (
    <Link className={cls} to={to} aria-label={ariaLabel} onClick={guard}>
      {children}
    </Link>
  )
}
