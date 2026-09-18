import type { PostCopyright as PostCopyrightData } from '../../../lib/types/content'

/**
 * 版权模块（对应 Butterfly 的 post_copyright）：作者 / 原文链接 / 声明文字。
 *
 * 文案全走 props（唯一家 = site.yml a11y），组件不硬编码任何可见文字。
 * 作者主页与原文链接仅在 http(s) 时开新窗并带 rel="noopener noreferrer"，站内地址保持同标签页。
 *
 * @param data 版权事实（author / author_href / url / info），构建期已解析好。
 * @param labels 四个文案标签；缺省则对应元素不渲染。
 * @example
 * <PostCopyright
 *   data={b.copyright}
 *   labels={{ heading: a.post_copyright_heading, author: a.post_copyright_author, link: a.post_copyright_link, notice: a.post_copyright_notice }}
 * />
 */
export default function PostCopyright({
  data,
  labels,
}: {
  data: PostCopyrightData
  labels: { heading?: string; author?: string; link?: string; notice?: string }
}) {
  return (
    <section className="post-copyright">
      {labels.heading ? <h2>{labels.heading}</h2> : null}
      <ul className="pc-rows">
        <li>
          {labels.author ? <b>{labels.author}</b> : null}
          {data.author_href ? (
            <a
              href={data.author_href}
              target={/^https?:/.test(data.author_href) ? '_blank' : undefined}
              rel={/^https?:/.test(data.author_href) ? 'noopener noreferrer' : undefined}
            >
              {data.author}
            </a>
          ) : (
            <span>{data.author}</span>
          )}
        </li>
        <li>
          {labels.link ? <b>{labels.link}</b> : null}
          <a
            href={data.url}
            target={/^https?:/.test(data.url) ? '_blank' : undefined}
            rel={/^https?:/.test(data.url) ? 'noopener noreferrer' : undefined}
          >
            {data.url}
          </a>
        </li>
      </ul>
      {data.info ? (
        <p className="pc-info">
          {labels.notice ? <b>{labels.notice}</b> : null}
          {data.info}
        </p>
      ) : null}
    </section>
  )
}
