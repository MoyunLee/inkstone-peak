import { Link } from 'react-router-dom'
import { tagPath } from '../../lib/data/content'

/**
 * 标签一枚（**唯一一枚**）：/tags 标签墙与 /tags/:tag 顶部筛选带共用本组件。
 *
 * 框 = **四角括线**（2026-10-11 用户令，参考图那种）：四条边各留中段空档，只画四只带外圆角的角，
 * 线取浓墨 `--ink`——那是"章"，不是卡片那种发丝界。四只角要四个伪元素槽，而一枚元素只有
 * `::before` / `::after` 两个，故借下面那枚空壳 `.tags-chip-frame` 补齐左下 / 右下两角。
 *
 * 大小统一（同日用户令）：不再按条目数分墨阶，全站一枚尺寸——等宽格子由容器（`.tags-wall` / `.tags-rail`）给，
 * 本组件只负责铺满格子（`flex:1`）与居中。
 *
 * 两处差别只在调用方给的东西：
 *   · /tags 标签墙：无当前项；
 *   · /tags/:tag 筛选带：给自己那一枚 `current`（= 括线转印朱，`aria-current="page"`）。
 *
 * @param tag 标签名（原样中文，非空）。
 * @param count 该标签下的条目数（现算，非空）。
 * @param current 是否就是当前页那个标签（只有筛选带会给）。
 * @example
 * <TagChip tag={b.tag} count={b.items.length} />
 * <TagChip tag={b.tag} count={b.items.length} current={b.tag === name} />
 */
export default function TagChip({
  tag,
  count,
  current = false,
}: {
  /** 标签名（原样中文）。 */
  tag: string
  /** 该标签下的条目数。 */
  count: number
  /** 是否当前页那一枚（挂 `aria-current="page"`，样式见 tags.css）。 */
  current?: boolean
}) {
  return (
    <Link className="tags-chip" to={tagPath(tag)} aria-current={current ? 'page' : undefined}>
      {/* `#` 是标签的记号，不是内容：可访问名由「标签名 + 计数」给，故这枚字形 aria-hidden
          （与全站「装饰一律 aria-hidden」同处置）。它也住在组件里而不是 CSS 的 ::before——
          CSS 生成的内容挡不住读屏，挂不上 aria-hidden。 */}
      <span className="tags-chip-mark" aria-hidden="true">
        #
      </span>
      <span className="tags-chip-name">{tag}</span>
      {/* 计数随链接一起进可访问名（`写作 3`）——它是这枚链接的信息，不做 aria-hidden。
          等宽字与全站日期/数目字同一档（--font-mono），好让同一行里的数字对齐。 */}
      <span className="tags-chip-count">{count}</span>
      {/* 左下 / 右下两只角（装饰，空壳不承载任何内容）：见组件注释——四角四个伪元素槽，
          本元素自己只有两个。 */}
      <span className="tags-chip-frame" aria-hidden="true" />
    </Link>
  )
}
