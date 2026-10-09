import type { ReactNode } from 'react'
import SectionHeading from './SectionHeading'
import { useReveal } from '../../lib/hooks/useReveal'

/**
 * 通用段壳：id 锚点 + 版心 + 标题行（标题本体在 SectionHeading）+ 段的滚动进场总闸。
 *
 * 进场（2026-10-09）：本组件是「段」这一级的唯一观察者，只管 .heading 与 .sec-intro 两处；
 * 段内的卡片网格由 Grid 组件自己观察（各管各的，契约写在 tokens.css 的「滚动进场契约」）。
 * 与 useReveal 既有口径一致：首帧已在视口内的段直接停在终态（不重播、不闪，理由见该 hook 注释），
 * reduced-motion 下永不隐藏；SSR 输出的 data-revealed 恒为 true ⇒ 无 JS 与爬虫看到的是完整正文。
 *
 * ★threshold 必须显式给 0：段的可见面积比会随内容长度稀释（观山段随作品数增长），
 *   沿用默认的 0.1 时「比视口高十倍以上的段」永远凑不满比例 ⇒ 整段**永久停在隐藏态**。
 *   触发点因此改由 rootMargin 定：段顶边探进视口下缘 12% 即算进入（约等于刚露头就播）。
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
  const { ref, revealed } = useReveal<HTMLElement>({ rootMargin: '0px 0px -12% 0px', threshold: 0 })
  return (
    <section
      id={sec.id}
      ref={ref}
      data-revealed={revealed ? 'true' : 'false'}
      className={`${height === 'full' ? 'section-full' : 'section-auto'} ${className}`.trim()}
    >
      <div className="shell">
        <SectionHeading sec={sec} />
        {children}
      </div>
    </section>
  )
}
