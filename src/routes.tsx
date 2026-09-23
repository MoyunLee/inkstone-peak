import { useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { unlockAllNav } from './lib/nav/navlock'
import RouteMeta from './components/layout/RouteMeta'
import Lightbox from './components/ui/Lightbox'
import Home from './pages/Home'
import PortfolioList from './pages/PortfolioList'
import PortfolioDetail from './pages/PortfolioDetail'
import About from './pages/About'
import BlogList from './pages/BlogList'
import BlogDetail from './pages/BlogDetail'
import FooterPage from './pages/Footer'
import NotFound from './pages/NotFound'

/** 换页回顶：仅 path 变化时执行（挂载首跑不碰）、带 hash 跳过、顺带清 navlock 跳页锁。 */
function ScrollReset() {
  const { pathname, hash } = useLocation()
  const prev = useRef(pathname)
  useEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname
      unlockAllNav()
      if (!hash) window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return null
}

/** 预渲染块（#prerender）只为首帧与爬虫存在：React 一提交，CSS 先隐去它，这里再从 DOM 摘掉。 */
function DropPrerender() {
  useEffect(() => {
    document.getElementById('prerender')?.remove()
  }, [])
  return null
}

/**
 * 应用路由树：三个纯副作用组件（换页回顶 / 元信息改写 / 摘除预渲染块）+ 页面路由表。
 *
 * 路由表与 site.yml 的 nav 派生的页面一一对应；入口在 main.tsx（客户端）与 entry-server.tsx（构建期 SSR）。
 */
export default function AppRoutes() {
  return (
    <>
      <ScrollReset />
      <RouteMeta />
      <DropPrerender />
      <Lightbox />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/portfolio" element={<PortfolioList />} />
        <Route path="/portfolio/:slug" element={<PortfolioDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/blog" element={<BlogList />} />
        <Route path="/blog/:slug" element={<BlogDetail />} />
        <Route path="/footer" element={<FooterPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
