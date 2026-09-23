// source/ 媒体交付闸（2026-09-16 免暂存改造）：图片/视频不再经 public/ 镜像——
// dev 由 vite.config.ts 的 staticFromSource 直供 source/、build 由它直接写进 dist；本步只做闸 + 落报告，不碰文件。
// 闸：单文件 ≤25MiB（托管单文件上限，保守取值）· 视频编码须浏览器安全 · mp4 须 faststart（moov 在 mdat 前）。
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { info } from './quiet.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(ROOT, 'source')
const REPORT = path.join(ROOT, '.content', 'media-report.json')

const MAX_BYTES = 25 * 1024 * 1024 // 托管单文件上限：保守取 25 MiB，留足各托管商余量
const SAFE_CODECS = new Set(['avc1', 'avc3', 'av01', 'vp09', 'vp08'])
const HEVC_CODECS = new Set(['hvc1', 'hev1', 'dvh1', 'dvhe'])

const KINDS: { dir: string; url: string }[] = [
  // 素材目录里的 *.md 说明文件不是交付件：不校验、不发布（vite 插件同一条规则）
  { dir: 'images', url: '/images/' },
  { dir: 'video', url: '/media/video/' },
]

const warnings: string[] = []
const errors: string[] = []

/** 被跳过的工具残留（名字含 ~ 或以 . 开头）：备份 / 临时文件不是交付件，别当正片发布。 */
const skipped: string[] = []

function walk(dir: string, base = ''): string[] {
  const out: string[] = []
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    // ★2026-09-23：~1 这类后缀是导出/备份工具留下的临时文件——实测混进过一个无音轨、无 faststart 的旧副本
    // （source/video/18th-ada~1.mp4），被当正片扫进 dist 并随部署上传。它们不是交付件：跳过并记账，末尾报一行。
    if (name.startsWith('.') || name.includes('~')) {
      skipped.push(base ? base + '/' + name : name)
      continue
    }
    const abs = path.join(dir, name)
    const rel = base ? base + '/' + name : name
    if (statSync(abs).isDirectory()) out.push(...walk(abs, rel))
    else out.push(rel)
  }
  return out
}

function inspectMp4(buf: Buffer): { codec: string | null; faststart: boolean | null } {
  type Box = { type: string; start: number; size: number; bodyStart: number; bodyEnd: number }
  function boxes(start: number, end: number): Box[] {
    const out: Box[] = []
    let p = start
    while (p + 8 <= end) {
      let size = buf.readUInt32BE(p)
      const type = buf.toString('latin1', p + 4, p + 8)
      let bodyStart = p + 8
      if (size === 1) {
        size = Number(buf.readBigUInt64BE(p + 8))
        bodyStart = p + 16
      } else if (size === 0) size = end - p
      if (size < 8 || p + size > end) break
      out.push({ type, start: p, size, bodyStart, bodyEnd: p + size })
      p += size
    }
    return out
  }
  const find = (l: Box[], t: string): Box | undefined => l.find((b) => b.type === t)

  const top = boxes(0, buf.length)
  const moov = find(top, 'moov')
  const mdat = find(top, 'mdat')
  const faststart = moov && mdat ? moov.start < mdat.start : null
  if (!moov) return { codec: null, faststart }

  let codec: string | null = null
  for (const trak of boxes(moov.bodyStart, moov.bodyEnd).filter((b) => b.type === 'trak')) {
    const mdia = find(boxes(trak.bodyStart, trak.bodyEnd), 'mdia')
    if (!mdia) continue
    const hdlr = find(boxes(mdia.bodyStart, mdia.bodyEnd), 'hdlr')
    const handler = hdlr ? buf.toString('latin1', hdlr.bodyStart + 8, hdlr.bodyStart + 12) : ''
    if (handler !== 'vide') continue
    const minf = find(boxes(mdia.bodyStart, mdia.bodyEnd), 'minf')
    if (!minf) continue
    const stbl = find(boxes(minf.bodyStart, minf.bodyEnd), 'stbl')
    if (!stbl) continue
    const stsd = find(boxes(stbl.bodyStart, stbl.bodyEnd), 'stsd')
    if (stsd) codec = buf.toString('latin1', stsd.bodyStart + 12, stsd.bodyStart + 16)
  }
  return { codec, faststart }
}

function main(): void {
  if (!existsSync(SOURCE)) {
    info('No source/ dir, skipped')
    return
  }

  let total = 0
  const seen: string[] = []

  for (const k of KINDS) {
    const dir = path.join(SOURCE, k.dir)
    for (const rel of walk(dir)) {
      const norm = rel.split(path.sep).join('/')
      if (/\.md$/i.test(norm)) continue
      const abs = path.join(dir, rel)
      const size = statSync(abs).size
      const label = `source/${k.dir}/${norm}`

      // 闸① 体积：超硬上限即 error
      if (size > MAX_BYTES) {
        errors.push(
          `${label}：${(size / 1048576).toFixed(2)} MiB 超过 25 MiB 上限（超过托管单文件上限，超限=部署直接失败）——` +
            `处理：降码率/降分辨率重导，或改走 A 外链（B站）不用自托管`,
        )
        continue
      }

      if (/\.mp4$/i.test(rel)) {
        let info: { codec: string | null; faststart: boolean | null } = { codec: null, faststart: null }
        try {
          info = inspectMp4(readFileSync(abs))
        } catch {
          warnings.push(`${label}：MP4 头解析失败（文件损坏？）`)
        }
        if (info.codec) {
          if (HEVC_CODECS.has(info.codec)) {
            warnings.push(
              `${label}：视频编码 ${info.codec} = H.265/HEVC，浏览器普遍解不了（Chrome/Edge/Firefox 在未装 HEVC 扩展的 Windows 上` +
                `播不出来，页面是黑框；只 Safari 与部分手机稳）→ 重导出为 H.264：格式 MP4、视频编码 H.264/AVC` +
                `（别选 H.265、"智能"、"自动"）、码率 3~5 Mbps`,
            )
          } else if (!SAFE_CODECS.has(info.codec)) {
            warnings.push(`${label}：视频编码 ${info.codec} 不在已知浏览器安全集内，请人工确认能否播放`)
          }
        }
        if (info.faststart === false) {
          warnings.push(`${label}：moov 在 mdat 之后（无 faststart）→ 首帧要等整段下完，导出时勾"网络优化/faststart"`)
        }
      }

      total += 1
      seen.push(`${k.url}${norm}`)
    }
  }

  // 报告落盘 .content/（不进发布产物）
  mkdirSync(path.dirname(REPORT), { recursive: true })
  writeFileSync(REPORT, JSON.stringify({ generatedAt: new Date().toISOString(), urls: seen, warnings, errors }, null, 2) + '\n', 'utf8')

  // 只拦硬错误（超 25MiB = 部署必炸）；编码 / faststart 这类「素材质量」提醒不再每趟构建都念——
  // 它们已经完整写进 .content/media-report.json，由 `npm run checklist` 播报（2026-09-17 用户令）。
  if (errors.length > 0) {
    console.error(`\n【媒体闸拦截】${errors.length} 处硬错误：`)
    for (const e of errors) console.error(`  ✗ ${e}`)
    process.exit(1)
  }
  info('Checked ' + total + ' media files')
  if (skipped.length > 0) info('Skipped ' + skipped.length + ' backup/temp file(s): ' + skipped.join(', '))
  // 有事才出声：编码 / faststart 这类质量提醒不阻塞构建，但也不能消失（明细在 npm run checklist）
  if (warnings.length > 0) console.log(`⚠ ${warnings.length} 条素材提醒见 npm run checklist`)
}

main()
