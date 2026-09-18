import type { ReactNode } from 'react'

export interface AsideRow {
  key: string
  label?: string
  value: ReactNode
}

/**
 * 详情页侧栏内层（作品 / 博文共用）：署名 + 若干「标签: 值」行 + 可选标签胶囊 + 目录槽。
 *
 * 行内容由各页面自己组装（内容配方留在页面），本组件只管结构与样式。
 *
 * @param lead 署名，通常是 site.site.author。
 * @param rows 键值行；label 省略则只渲染值。
 * @param tags 标签胶囊；省略或空数组则不渲染整块。
 * @param children 目录槽，由外壳按落位传入（可为 null）。
 * @example
 * <ArticleAside lead={site.site.author} rows={asideRows} tags={b.tags}>{toc}</ArticleAside>
 */
export default function ArticleAside({
  lead,
  rows,
  tags,
  children,
}: {
  lead: string
  rows: AsideRow[]
  tags?: string[]
  children?: ReactNode
}) {
  return (
    <div className="post-aside-inner">
      <p className="pa-author">{lead}</p>
      <ul className="pa-rows">
        {rows.map((r) => (
          <li key={r.key}>
            {r.label ? <b>{r.label}</b> : null}
            <span>{r.value}</span>
          </li>
        ))}
      </ul>
      {tags && tags.length > 0 ? (
        <ul className="pa-tags">
          {tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : null}
      {children}
    </div>
  )
}
