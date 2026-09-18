/* 首页段落注册：id→组件映射，只此一职；顺序/文案权威在 site.yml home.sections。
   五个段落一律**静态注册**（2026-09-16 由 lazy 改回）：
   ① 构建期 SSR 走 renderToPipeableStream，懒段会落在「隐藏 div + template + 引导脚本」的
      迟到分支里 —— 预渲染正文于是只有骨架、正文进了 inert template，爬虫与首帧都白搭；
   ② 三枚段组件本来就只占 ~1.6KB，切出去的收益抵不过首屏多一次 chunk 往返（Hero 是 LCP 元素）；
   ③ 段同步挂载 = 导航心器「候选段全量挂载」条件立刻成立，F5 期的 URL 写闸更早解锁。
   Hero 内部对 fx/ink-field 的动态 import 不受影响，那才是真正的重货。 */
import Hero from '../components/sections/Hero'
import Featured from '../components/sections/Featured'
import BlogPreview from '../components/sections/BlogPreview'
import AboutPreview from '../components/sections/AboutPreview'
import SiteFooter from '../components/sections/SiteFooter'

export const sectionComponents = {
  home: Hero,
  portfolio: Featured,
  blog: BlogPreview,
  about: AboutPreview,
  footer: SiteFooter,
} as const

export type SectionId = keyof typeof sectionComponents
