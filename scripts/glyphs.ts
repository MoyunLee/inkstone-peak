// 抽取全站实际用到的字符集：读 .content/ 全部文件 + 追加 UI 静态字符，去重写入 .shots/glyph-set.txt。
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const P = (...s: string[]): string => path.join(ROOT, ...s)

let all = ''
for (const f of readdirSync(P('.content'))) all += readFileSync(P('.content', f), 'utf8')
// UI/CSS 用到的 ASCII + 中文标点 + 箭头/间隔号
all += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
all += ' \u00b7\u2014\u2013-/\u2192\uff5c|()\uff08\uff09\uff1a:\uff1b;\uff0c,\u3002.\u3001?？!！\u201c\u201d\u2018\u2019\u3010\u3011\u300a\u300b\u00d7+&@#%~\u00a9'
const set = new Set<string>()
for (const ch of all) {
  if (ch === '\\') continue
  if ('{}[]<>'.includes(ch)) continue
  set.add(ch)
}
const chars = [...set].join('')
const cjk = [...set].filter((c) => /[\u3400-\u9fff\uf900-\ufaff]/.test(c)).length
mkdirSync(P('.shots'), { recursive: true })
writeFileSync(P('.shots', 'glyph-set.txt'), chars, 'utf8')
console.log(`总去重字符=${chars.length} 汉字=${cjk} → .shots/glyph-set.txt`)
