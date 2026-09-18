import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { pageMeta } from '../../lib/meta/page-meta'
import { posts } from '../../lib/data/content'
import { useSite } from '../../lib/data/site'

function setMeta(name: string, content: string | undefined): void {
  const head = document.head
  const el = head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!content) {
    el?.remove()
    return
  }
  if (el) el.setAttribute('content', content)
  else {
    const meta = document.createElement('meta')
    meta.setAttribute('name', name)
    meta.setAttribute('content', content)
    head.append(meta)
  }
}

function setCanonical(href: string): void {
  const head = document.head
  const el = head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (el) el.setAttribute('href', href)
  else {
    const link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    link.setAttribute('href', href)
    head.append(link)
  }
}

/**
 * SPA 换页时改写 document 元信息（title / description / canonical / keywords / robots）。
 *
 * 口径唯一家 = lib/meta/page-meta：构建期预渲染写的是同一份结果，本组件只管之后的路由内跳转。
 * 没有它：直接访问页面是对的，但点进详情页会退回入口页标题（标签页 / 收藏 / 历史 / 分享全错）。
 *
 * 渲染 null，是纯副作用组件，挂在路由树顶层即可。
 *
 * @example
 * <RouteMeta />
 */
export default function RouteMeta() {
  const site = useSite()
  const { pathname } = useLocation()
  useEffect(() => {
    const m = pageMeta(pathname, site, posts)
    document.title = m.title
    document.documentElement.lang = m.lang
    setMeta('description', m.description)
    setMeta('keywords', m.keywords)
    setMeta('robots', m.noindex ? 'noindex' : undefined)
    setCanonical(m.canonical)
  }, [pathname, site])
  return null
}
