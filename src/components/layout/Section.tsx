import type { ReactNode } from 'react'
import SectionHeading from './SectionHeading'

/**
 * 通用段壳：id 锚点 + 版心 + 标题行（标题本体在 SectionHeading）。
 *
 * @param sec 首页段配置（提供 id 与标题话术）。
 * @param height 'full'=整屏段（.section-full）；'auto'=按内容高。
 * @param children 段内容。
 * @param className 追加类名。
 * @example
 * <Section sec={sec}><Cards /></Section>
 */
export default function Section({
  sec,
  height = 'auto',
  children,
  className = '',
}: {
  sec: Parameters<typeof SectionHeading>[0]['sec']
  height?: 'full' | 'auto'
  children?: ReactNode
  className?: string
}) {
  return (
    <section id={sec.id} className={`${height === 'full' ? 'section-full' : 'section-auto'} ${className}`.trim()}>
      <div className="shell">
        <SectionHeading sec={sec} />
        {children}
      </div>
    </section>
  )
}
