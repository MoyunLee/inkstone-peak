// 集合 schema 的共用件：nullable 字符串、嵌入白名单与 host 工具、社交链接形状、http URL 判定、素材路径归一。
import { z } from 'zod'
import { toMediaUrl } from '../paths.ts'

/** 可空字符串：site.yml 里「不填」与「显式 null」都合法的字段统一用它。 */
export const urlOrNull = z.union([z.string(), z.null()])

// ── 第三方播放器嵌入白名单 ──
// 新增平台 = 此处加一行 host
export const EMBED_HOSTS = new Set([
  'player.bilibili.com',
  'player.youku.com',
  'v.qq.com',
  'open.douyin.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
])
// B 站「页面地址」最易误粘：单独识别并给出可照抄的播放器地址
export const BILI_PAGE_HOSTS = new Set(['www.bilibili.com', 'bilibili.com', 'm.bilibili.com'])

export function hostOf(v: string): string {
  try {
    return new URL(v).hostname
  } catch {
    return ''
  }
}

/**
 * 社交联系条目的形状（site.yml 的 contact.*）：platform 必填，value / url 可为 null。
 *
 * url 为 null 时页脚渲染「筹建中」（见 scripts/checklist.ts 的 🟢 提醒）。
 *
 * @example
 * // site.yml:
 * // contact:
 * //   bilibili: { platform: B站, value: null, url: null, pending: 筹建中 }
 */
export function socialShape() {
  return z.object({ platform: z.string(), value: urlOrNull, url: urlOrNull.optional(), pending: z.string().optional() }).strict()
}

export function isHttpUrl(v: string): boolean {
  if (!/^https?:\/\//.test(v)) return false
  try {
    const u = new URL(v)
    return u.hostname.includes('.')
  } catch {
    return false
  }
}

/** 渲染成 href/src 的内容字段：站内绝对路径（/ 开头，排除协议相对 //host）或 http(s) 绝对地址。
 *  React 会拦 javascript: 协议（sanitizeURL），这里是内容层的第一道，别让坏值进 posts.json。 */
export function isSafeRef(v: string): boolean {
  if (v.length === 0) return false
  if (v.startsWith('/') && !v.startsWith('//')) return true
  return isHttpUrl(v)
}
export const safeRef = (label: string) =>
  z.string().min(1).refine(isSafeRef, `${label} 必须是站内绝对路径（/ 开头）或 http(s) 绝对地址`)

/** 图片/视频槽专用：除 http(s) 与站内地址外，**直接认母版在 source/ 下的位置**并归一成对外 URL——
 *  写 source/images/<slug>/x.webp（或 images/… / Windows 绝对路径）与写 /images/<slug>/x.webp 等价，
 *  落 posts.json 的永远是交付地址，页面层不必知道母版目录。 */
export const mediaRef = (label: string) =>
  z
    .string()
    .min(1)
    .refine(
      (v) => isSafeRef(v) || toMediaUrl(v) !== null,
      `${label} 必须是 http(s) 地址、站内交付地址（/images/… 或 /media/video/…），或母版位置（如 source/images/<slug>/cover.webp）`,
    )
    .transform((v) => toMediaUrl(v) ?? v)
