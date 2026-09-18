/* /portfolio/:slug 案例页（2026-09-16 统一渲染层：骨架交给 ArticleDetail / .bd-layout + .bd-main + .post-aside）。
   本页只提供「作品」的内容配方：hero（视频/封面）· 提要（description）· 周期 · 嵌入/外链 · 侧栏行。 */
import { useParams } from 'react-router-dom'
import Seal from '../components/ui/Seal'
import VideoHero from '../components/ui/VideoHero'
import ArticleDetail from '../components/ui/article/ArticleDetail'
import ArticleAside from '../components/ui/article/ArticleAside'
import type { AsideRow } from '../components/ui/article/ArticleAside'
import { workBySlug } from '../lib/data/content'
import { useSite } from '../lib/data/site'
import NotFound from './NotFound'

export default function PortfolioDetail() {
  const { slug } = useParams()
  const site = useSite()
  const a = site.a11y
  const w = workBySlug(slug)
  if (!w) return <NotFound />
  const video = w.video && w.video.src ? w.video : null
  // 作品 meta 行只剩可选的「周期」：没写就不出行，不留「周期: 」空壳
  const asideRows: AsideRow[] = []
  if (w.period) asideRows.push({ key: 'period', label: a.case_period, value: w.period })
  return (
    <ArticleDetail
      entry={w}
      hero={
        video ? (
          <div className="cover">
            {/* 播放失败（含 H.265 解不了）自动换封面图；无封面时退回印章占位 */}
            <VideoHero
              src={video.src}
              poster={video.poster}
              cover={w.cover ?? w.top_img}
              controls={video.controls === true}
              label={video.caption}
              title={w.title}
              fallback={<Seal variant="mark" />}
            />
          </div>
        ) : w.cover ? (
          <div className="cover">
            <img src={w.cover} alt={w.title} decoding="async" />
          </div>
        ) : (
          <div className="cover cover-ph" aria-hidden="true">
            <Seal variant="mark" />
          </div>
        )
      }
      lead={w.description ? <p className="case-lead">{w.description}</p> : null}
      meta={
        w.period ? (
          <ul className="meta-bar">
            <li>
              {a.case_period ? a.case_period + ': ' : ''}
              {w.period}
            </li>
          </ul>
        ) : null
      }
      preBody={
        <>
          {w.embeds && w.embeds.length > 0 ? (
            <div className="embeds">
              {a.case_embeds ? <h2>{a.case_embeds}</h2> : null}
              <ul>
                {w.embeds.map((e) => (
                  <li key={e.url}>
                    <iframe
                      src={e.url}
                      title={e.label}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      allow="encrypted-media; picture-in-picture; fullscreen"
                      // 默认拒绝 allow-top-navigation（防被嵌页把整站顶走）；播放器所需能力显式放行
                      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {w.links ? (
            <ul className="ext-links">
              {w.links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      }
      renderAside={(toc) => (
        <ArticleAside lead={site.site.author} rows={asideRows}>
          {toc}
        </ArticleAside>
      )}
    />
  )
}
