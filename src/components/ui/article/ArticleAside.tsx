import type { ReactNode } from 'react'

export interface AsideRow {
  key: string
  label?: string
  value: ReactNode
}

/**
 * 详情页侧栏内层（作品 / 博文共用）：**一张信息卡**（署名 + 提要 + 「标签: 值」行 + 可选标签胶囊）
 * ＋卡外的目录槽。
 *
 * 卡只框信息、目录自成一块：目录条目多时它要自己滚（见 `20-设计规范.md` 的侧栏吸顶），
 * 与信息同框会让整卡跟着变高。
 *
 * 内容由外壳从文章数据算好传入（配方在 articleRecipe），本组件只管结构与样式。
 *
 * @param author 署名，通常是 site.site.author。
 * @param desc 文章提要（front-matter 的 description）；没写即不出，不留空壳。
 * @param rows 键值行；label 省略则只渲染值。
 * @param tags 标签胶囊；省略或空数组则不渲染整块。
 * @param children 目录槽，由外壳按落位传入（可为 null）。
 * @example
 * <ArticleAside author={site.site.author} desc={entry.description} rows={asideRows} tags={entry.tags}>{toc}</ArticleAside>
 */
export default function ArticleAside({
  author,
  desc,
  rows,
  tags,
  children,
}: {
  author: string
  desc?: string | null
  rows: AsideRow[]
  tags?: string[]
  children?: ReactNode
}) {
  return (
    <div className="post-aside-inner">
      <div className="pa-card">
        <p className="pa-author">{author}</p>
        {desc ? <p className="pa-desc">{desc}</p> : null}
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
      </div>
      {children}
    </div>
  )
}
