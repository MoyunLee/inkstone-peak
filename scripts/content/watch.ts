// --watch：监听 site.yml / source/** / src/site/sections.ts，150ms 去抖后重跑一次。
import { watch } from 'node:fs'
import { P } from './paths.ts'
import { runOnce } from './build.ts'

export function startWatch(): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  const kick = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      runOnce(true)
    }, 150)
  }
  watch(P('source'), { recursive: true }, kick)
  watch(P('site.yml'), kick)
  watch(P('src', 'site', 'sections.ts'), kick)
  console.log('👁 content:watch 已启动 —— 监听 site.yml / source/** / src/site/sections.ts')
}
