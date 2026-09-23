// 第三方嵌入 iframe 的属性母版（**唯一家**）：构建期正文渲染（scripts/content/paths.ts）与运行层 JSX
// （components/ui/article/articleRecipe.tsx）共用同一份——权限属性一旦长在两处，收口就名存实亡。
// 它不是数据源（数据是 .content/posts.json），只是「嵌入长什么样」的唯一事实源，故与 content.ts 同目录放着。
//
// ★2026-09-23 撤 sandbox（用户报「移动端视频一律播不了」）：
//   WebKit 的 MSE 在带 sandbox 的 iframe 里被误挡（bugs.webkit.org 252755，状态仍是 NEW，Safari 桌面/iPad 均可复现），
//   而 B 站这类播放器靠 MediaSource + blob: 起播——于是同一个嵌入「电脑能放、手机（Safari/WebKit）不能放」。
//   旧值 sandbox=allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox
//   正是那堵墙；而它并不决定「能嵌哪些站」——那件事由 CSP 的 frame-src 白名单单点决定（见 vercel.json + gate-headers）。
//   撤掉后：嵌入方与普通第三方 iframe 同权，allow 仍按播放器所需能力逐项放行，referrerPolicy 不动。
export const EMBED_ATTRS = {
  loading: 'lazy',
  allowFullScreen: true,
  referrerPolicy: 'no-referrer-when-downgrade',
  // autoplay 是 Permissions Policy 里的一项：不发就默认拒绝，播放器点播后自播会被静默拦掉（移动端尤甚）
  allow: 'autoplay; encrypted-media; picture-in-picture; fullscreen',
} as const

/** 顶部槽用属性：首屏媒件必须立刻加载——lazy 会把它排到空闲之后，慢链路（移动端）上等于「点了半天没反应」。 */
export const EMBED_ATTRS_HERO = { ...EMBED_ATTRS, loading: 'eager' } as const

/** 同一份属性 → HTML 属性串（构建期字符串渲染用；camelCase 映射回 HTML 属性名，布尔项写空值）。 */
export function embedAttrString(): string {
  return [
    'loading="' + EMBED_ATTRS.loading + '"',
    'allowfullscreen',
    'referrerpolicy="' + EMBED_ATTRS.referrerPolicy + '"',
    'allow="' + EMBED_ATTRS.allow + '"',
  ].join(' ')
}

/** HTML 文本/属性转义（构建期手写字符串用；运行层走 React，自带转义）。 */
export function escapeHtml(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * 构建期渲染一个嵌入 iframe：与运行层 <iframe {...EMBED_ATTRS}> 同一套属性。
 *
 * @param url 播放器地址（调用方须已过白名单校验）。
 * @param label 可访问名（iframe title）。
 * @example
 * embedIframeHtml('https://player.bilibili.com/player.html?bvid=BV1...', 'B 站 · 12集合集')
 */
export function embedIframeHtml(url: string, label: string): string {
  return '<iframe src="' + escapeHtml(url) + '" title="' + escapeHtml(label) + '" ' + embedAttrString() + '></iframe>'
}
