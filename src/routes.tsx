import { lazy, Suspense, useEffect, useRef } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { unlockAllNav } from './lib/nav/navlock'
import { useIsoLayoutEffect } from './lib/hooks/useIsoLayoutEffect'
import RouteMeta from './components/layout/RouteMeta'
import Lightbox from './components/ui/Lightbox'
import ThemeToggle from './components/layout/ThemeToggle'

/* 页面全部走动态 import：首屏只下当前路由那一块（motion 只在 /about、粒子引擎只在首页）。
   常量必须落在模块顶层——写进组件函数里每次渲染都会造出一个新的 lazy 组件，路由会被无限重挂。 */
const Home = lazy(() => import('./pages/Home'))
const PortfolioList = lazy(() => import('./pages/PortfolioList'))
const PortfolioDetail = lazy(() => import('./pages/PortfolioDetail'))
const About = lazy(() => import('./pages/About'))
const BlogList = lazy(() => import('./pages/BlogList'))
const BlogDetail = lazy(() => import('./pages/BlogDetail'))
const Archive = lazy(() => import('./pages/Archive'))
const TagIndex = lazy(() => import('./pages/TagIndex'))
const TagDetail = lazy(() => import('./pages/TagDetail'))
const NotFound = lazy(() => import('./pages/NotFound'))

/** 换页回顶：仅 path 变化时执行（挂载首跑不碰）、带 hash 跳过、顺带清 navlock 跳页锁。 */
function ScrollReset() {
  const { pathname, hash } = useLocation()
  const prev = useRef(pathname)
  // 用 layout 阶段而不是被动 effect：换页回顶必须落在新页这一帧里，
  // 被动 effect 排在绘制之后，会先露出「停在上次滚动位置的新页」再跳一下。
  // 同一处顺手开换页进场窗（写 data-nav，样式见 ui.css 的 page-in）：
  // 只写不撤，所以硬加载没有这个属性、首帧永远不播进场，只有 SPA 换页这一次提交才播。
  useIsoLayoutEffect(() => {
    if (prev.current !== pathname) {
      prev.current = pathname
      unlockAllNav()
      document.documentElement.dataset.nav = '1'
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
 *
 * ★整棵树包在一个 Suspense 边界里，边界内外必须分得清：
 *   路由 chunk 到位前边界**什么都不提交** ⇒ #root 保持 :empty ⇒ 壳里的
 *   `#root:not(:empty) ~ #prerender` 不触发，预渲染正文一直可见（与无 JS 时同一观感）。
 *   边界一旦提交，同一帧隐去预渲染块，DropPrerender 再把它摘掉。
 *   所以 ThemeToggle 这种「常驻但会落 DOM」的也必须留在边界**内**——放外面会让 #root 提前非空，首帧白屏。
 *   换页不会闪：react-router 的 BrowserRouter 用 startTransition 包导航状态更新，React 会继续显示旧页
 *   直到新页就绪（已提交过的边界不回落 fallback）。
 */
export default function AppRoutes() {
  return (
    <Suspense fallback={null}>
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
        <Route path="/archive" element={<Archive />} />
        <Route path="/tags" element={<TagIndex />} />
        {/* 标签名是裸中文时 URL 里是转义串（tagPath 生成）；React Router 匹配前解码，故此处照常收 :tag。 */}
        <Route path="/tags/:tag" element={<TagDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {/* 三态外观徽章：视口左下角常驻。必须挂在这里（#root 直下）——顶栏有 backdrop-filter，
          会给 position:fixed 的后代当包含块，挂进 <header> 就会被钉在顶栏里。
          也必须留在 Suspense 边界**内**：它一落 DOM，`#root:not(:empty)` 就成立、预渲染块当帧被隐去。 */}
      <ThemeToggle />
    </Suspense>
  )
}
