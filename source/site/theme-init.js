/* 三态外观的防闪烁引导：经典脚本（非 module），必须同步跑在样式表与模块脚本之前。
   只做一件事——读 localStorage 的显式选择，算出最终 light|dark，写 <html> 的 data-theme 与 color-scheme；
   显式选择时再把两枚 media 版 theme-color 一起改成所选纸底（system 态留给各自的媒体查询）。
   键名与取值必须与 src/lib/theme.ts 一致（那边是运行期真源，这里不能 import，只能同口径自持）。 */
(function () {
  var el = document.documentElement
  var pref = 'system'
  try {
    pref = localStorage.getItem('inkstone-theme') || 'system'
  } catch (e) {
    pref = 'system'
  }
  var explicit = pref === 'light' || pref === 'dark'
  var dark = explicit ? pref === 'dark' : false
  if (!explicit) {
    try {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } catch (e) {
      dark = false
    }
  }
  var theme = dark ? 'dark' : 'light'
  el.setAttribute('data-theme', theme)
  el.style.colorScheme = theme
  if (!explicit) return
  var metas = document.querySelectorAll('meta[name="theme-color"]')
  for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', dark ? '#16181d' : '#f7f4ee')
})()
