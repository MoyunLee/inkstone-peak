// 构建期 SSR 入口：`vite build --ssr` 打包成本文件，node 直跑把每个路由渲染成静态 HTML 串。
// 客户端 bundle 从不引用本文件；产物落 .ssr/（gitignore），消费者只有 scripts/pre-render.ts。
// 用 renderToPipeableStream + onAllReady 取整段 HTML；若树里出现 Suspense 且迟到落定，
// React 会输出「隐藏 div + template + 引导脚本」——那是给 hydrate 用的，预渲染块不吃这套，
// 故 scripts/pre-render.ts 带硬闸：正文里出现 script/template/hidden 即构建失败。
// （当前首页段落全部静态注册，正常不该命中该分支。）
import { Writable } from 'node:stream'
import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import AppRoutes from './routes'

const SSR_TIMEOUT_MS = 20000

/**
 * 把一条路由渲染成完整 HTML 串（构建期专用；客户端 bundle 从不引用本文件）。
 *
 * @param url 路由路径，例如 '/portfolio/qwen-spot'。
 * @returns 该路由的 HTML 字符串（不含 <html> 壳，由 pre-render.ts 注入到 #prerender 占位块）。
 * @throws 渲染超过 20s、shell 渲染失败，或 React 报告了树内错误。
 * @example
 * const body = await render('/blog')
 */
export function render(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = ''
    let settled = false
    const errors: string[] = []
    const sink = new Writable({
      write(chunk: Buffer | string, _enc, cb): void {
        html += chunk.toString()
        cb()
      },
    })
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error(`SSR 渲染超时（${SSR_TIMEOUT_MS}ms）：${url}`))
      }
    }, SSR_TIMEOUT_MS)
    const done = (fn: () => void): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn()
    }

    // handle 会在 renderToPipeableStream 返回后才有值；onAllReady 走微任务，故此处取值安全。
    let handle: { pipe: (dest: NodeJS.WritableStream) => void; abort: () => void } | null = null
    handle = renderToPipeableStream(
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>,
      {
        onAllReady() {
          queueMicrotask(() => {
            if (handle === null) return
            sink.on('finish', () => {
              done(() => (errors.length > 0 ? reject(new Error(errors.join(' | '))) : resolve(html)))
            })
            handle.pipe(sink)
          })
        },
        onShellError(err) {
          done(() => reject(err))
        },
        onError(err) {
          errors.push(err instanceof Error ? err.message : String(err))
        },
      },
    )
  })
}
