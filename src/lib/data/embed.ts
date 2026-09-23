// 第三方嵌入 iframe 的属性母版（**唯一家**）：构建期正文渲染（scripts/content/paths.ts）与运行层 JSX
// （components/ui/article/articleRecipe.tsx）共用同一份——sandbox 白名单这类安全属性一旦长在两处，收口就名存实亡。
// 它不是数据源（数据是 .content/posts.json），只是「嵌入长什么样」的唯一事实源，故与 content.ts 同目录放着。
export const EMBED_ATTRS = {
  loading: 'lazy',
  allowFullScreen: true,
  referrerPolicy: 'no-referrer-when-downgrade',
  allow: 'encrypted-media; picture-in-picture; fullscreen',
  sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox',
} as const

/** 同一份属性 → HTML 属性串（构建期字符串渲染用；camelCase 映射回 HTML 属性名，布尔项写空值）。 */
export function embedAttrString(): string {
  return [
    'loading="' + EMBED_ATTRS.loading + '"',
    'allowfullscreen',
    'referrerpolicy="' + EMBED_ATTRS.referrerPolicy + '"',
    'allow="' + EMBED_ATTRS.allow + '"',
    'sandbox="' + EMBED_ATTRS.sandbox + '"',
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
