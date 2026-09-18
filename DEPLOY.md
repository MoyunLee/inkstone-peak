# 部署方式（Vercel · 纯静态）

> 规格依据：10-开发计划书 §7（托管）/ §3.2（预渲染）。

## 〇. 纯本地打开（完全不上传网络，也能看整站）

站点是纯静态的，本地起一个微型 HTTP 服务即可（**不能双击 html**——浏览器禁止 `file://` 加载 `/assets` 绝对路径，会白屏）：

```bash
cd <仓库目录>
npm run build      # 产 dist/（内容校验→媒体→素材→中文闸→类型→构建→SSR→10 路由正文预渲染→feeds）
npm run preview    # 起本地服务 → 浏览器打开 http://127.0.0.1:4173
```

- **`npm run preview` 的语义与生产一致**（目录路径直出 `<路径>/index.html`，未知路径给 404 页）：`vite.config.ts` 里的 `previewDirIndex()` 补了这层改写。★此前 vite preview 的 SPA 回退会把**所有非首页路径都喂成 `dist/index.html`**，于是刷新 /portfolio、/blog、/footer 时**首帧先看到首页内容**、React 挂载后才换成真页面（地址栏不变，像被弹回首页）；10 份预渲染正文里只有首页那份在本地可见（2026-09-16 修复）。
- 只投递期自用：这台电脑开着 `npm run preview` 就能逛所有页面（首页五段/案例/关于/流程/404 全功能，粒子、导航、深链都在）。
- 想给别人看但不想上网：同一 Wi-Fi 下用 `npx vite preview --host 0.0.0.0`，手机访问 `http://<你电脑IP>:4173`（防火墙放行即可）——仅限同网段，不出户。
- 改文案/内容想即时看：另开一个终端 `npm run content:watch`，再跑 `npm run dev`（地址 http://127.0.0.1:5173），改 `site.yml`、`source/` 或 `content/` 下的 md 存盘即热更。
- 关掉服务：预览终端里 Ctrl+C。

> 注：微信分享卡片、手机流量访问这类"公网验证"只在真上线后才能做；本地阶段用不上也不影响任何功能。

## 1. 构建（本地或 CI 均可；sharp 只在本脚本链里跑）

```bash
cd <仓库目录>
npm ci            # 依赖照 10 §1 矩阵；cache 已钉工程内 .npm-cache/
npm run build     # = content → media → assets → 中文闸 → tsc → vite build → ssr → prerender → feeds
npm run checklist # 上线检查表：🔴 必须为 0
```

产物在 `dist/`：10 份路由 HTML（5 固定 + 2 案例 + 2 博文 + 404；每页独立 title/description/canonical/keywords **且内嵌预渲染正文**）+ 哈希资源 + `sitemap.xml` `rss.xml` `robots.txt`（三份构建期生成，域名唯一源 = `site.yml` 的 `site.url`）+ 站点根静态件（`hero-base.png`、`mist-a/b.png`、`noise.webp`、`favicon.svg`、`apple-touch-icon.png`，源在 `source/site/`）。★2026-09-13：旧地址重定向桩 ×11 已整层删除。
> ★2026-09-11 用户令：OG 全套（og:title/description/url/image 及 og 图）已移除——微信/QQ 分享不再出卡片，故 `source/site/` 下不再有 `og-default.png` 与 `og/*.png`。

## 2. 部署（Vercel）

1. 把本工程推到 GitHub 仓库（公开或私有均可）：
   ```bash
   git remote add origin <你的仓库地址>
   git push -u origin main   # 本仓库默认分支是 main
   ```
2. Vercel Dashboard → **Add New → Project → Import Git Repository** → 选仓库。
3. 构建设置照抄（**Framework Preset 选 Other**——选 Vite 会把构建命令覆盖成 `vite build`，跳过内容校验与预渲染）：
   | 项 | 值 |
   |---|---|
   | Framework Preset | `Other` |
   | Build Command | `npm run build` |
   | Output Directory | `dist` |
   | Install Command | `npm ci` |
   | Node.js Version | `24`（默认） |

   > ⚠ 托管方必须支持**目录索引**（请求 `/portfolio` 直出 `dist/portfolio/index.html`）——Vercel 默认支持、无需配置；`dist/404.html` 也会被自动用作 404 页。若换成 SPA 回退式托管，非首页的**首帧会看到首页内容**，预渲染正文等于白做（爬虫与无 JS 用户尤其受影响）。
4. Deploy。以后 `git push` 自动重新构建发布。
   - ⚠ 构建环境跑不了 sharp 的场合（极少见）：只把 `assets`（唯一吃 sharp 的一步）拆出去——本地 `npm run assets` 后提交 `source/site/*`，云端 Build Command 改 `npm run content && npm run media && npm run gate && tsc --noEmit && vite build && npm run ssr && npm run prerender && npm run feeds`。
     `media` **不含 sharp**（纯媒体闸：体积/编码/faststart + MP4 头解析），留在链上做交付前校验；图片/视频的搬运由 `vite.config.ts` 的 `staticFromSource` 插件负责（dev 直供 `source/`、build 直写 `dist/`）。

### 安全响应头（**当前未配置**）

> ⚠ 2026-09-18：安全响应头机制整体移除——原生成器与配套静态闸门已退役，`npm run build` 不再产出任何响应头文件。
> 定稿后按新形态加回：**托管侧声明**（Vercel 走根目录 `vercel.json` 的 `headers`）+ **内容侧闸门**（沿用 `gate:csp` 式静态核对）。
> 在此之前整站没有 CSP / HSTS / X-Frame-Options / `nosniff` / Referrer-Policy / Permissions-Policy 等响应头，`/assets/*` 也没有 immutable 缓存声明。

## 3. SPA 路由与 404

- `dist/404.html` 会被 Vercel 自动用作 404 页（含 noindex）。
- 已知深链（如 `/portfolio/18th-ada`）由预渲染目录直出；未知路径的真 404 由**托管商侧的 fallback / 重定向规则**提供——本工程不含托管专有配置（2026-09-16 已移除）。
- 本地 `vite preview` 的等价语义写在 `vite.config.ts` 的 `previewDirIndex()`（只挂 preview，产物零改动）。
- ★2026-09-13 起已退役的旧地址（/work、/works、/pipeline 及其 :slug 族）不再兜底，一律返回真 404。

## 4. 绑自定义域名（以后再说也完全可以）

1. Vercel 项目 → **Settings → Domains → Add**，填你的域名。
2. 按 Vercel 提示到 DNS 服务商加记录（apex 用 A 记录 `76.76.21.21`，`www` 用 CNAME 指向 Vercel 给出的目标——以域名卡显示的值为准）。
3. **改 `site.yml` 的 `site.url` 一行** → `npm run build` → 重新部署（预渲染逐路由 canonical 的绝对域唯一来源就是这行，10 §3.2）。

## 5. 上线前验收（10 §8 M4，需你本人过一遍）

- [ ] 手机**关 Wi-Fi 用流量**访问 Vercel 地址：首屏粒子山、滚动不掉帧（中端手机 60fps 口径）。
- [ ] **逐个路由直访**：页面标题/描述正确、无控制台报错（★OG 卡片已于 2026-09-11 移除，微信/QQ 分享不再出卡片）。
- [ ] `npm run checklist` 的 🟢 开关处理：`contact.bilibili` 补真地址或维持「筹建中」。
- [ ] 🟡 占位替换（不阻塞投递，素材来一张换一张）：案例封面 → `source/images/<slug>/cover.webp`（列表卡与案例页共用）。
- [ ] 想挂简历 / 资料 PDF：文件放进 `site/source/site/`（如 `source/site/resume/du-kang.pdf`），再在 `site.yml` 的 `footer.columns` 加一栏，例：`{ id: files, title: 资料, links: [ { label: 简历, to: /resume/du-kang.pdf } ] }`——没有专门的简历字段，构建期会校文件是否落盘。
- [ ] 换完任何素材：`npm run build` → 重新部署（push 即自动部署）。

## 6. 日常改内容（不碰代码）

- 改话术/导航/页脚 → `site.yml`；改事实 → 见下方目录表。

### 目录布局（2026-09-12 目录改制后）

**`source/` + `site.yml` = 你唯一要动的地方**（作者入口）。`dist/`、`.content/` 是构建产物，别直接往里放东西（`public/` 已取消：站点根静态件住 `source/site/`）。

| 放什么 | 母版位置 | 线上 URL | 谁读它 |
|---|---|---|---|
| 文章 | 作品 `source/posts/portfolio/<slug>.md` ｜ 博文 `source/posts/blog/<slug>.md`（还能继续嵌套任意层） | 作品 `/portfolio/<slug>` ｜ 博文 `/blog/<slug>` | scripts/content/ **递归读取** |
| 图片 | `source/images/<slug>/x.webp` | `/images/<slug>/x.webp` | vite 插件 `staticFromSource`（dev 直供 / build 直写 dist） |
| 视频 | `source/video/x.mp4` | `/media/video/x.mp4` | 同上 |
| 关于页话术 + 事实（生涯/游戏阅历/坐标/锚点） | `site.yml` `about:` | `/about` | scripts/content/ 读取 |
| 话术/导航/页脚 | `site.yml` | 全站 | scripts/content/ 读取 |
| 简历 / 资料 PDF | `source/site/resume/x.pdf` | `/resume/x.pdf` | vite 直出（由 `site.yml` 页脚链接指向）⚠ 见下 |

- **一篇是作品还是博文，只看标签**（2026-09-16 通用化）：`tags` 里含 `portfolio` → 作品（渲染到 `/portfolio/<slug>`，可选用 `description` 提要 / `period` 等作品字段）；不含 → 博文（`/blog/<slug>`）。标记值可在 `site.yml` 的 `blog.portfolio_tag` 改。
- **一份数据、两个视图**：`/blog` 是中心库，展示**全部**文章（含作品）；`/portfolio` 只是带该标记的那个子集。构建期产出单份 `.content/posts.json`，两个页面由同一次构建渲染，不存在两份事实。
- `source/posts/` 的文件名 = slug = URL 段，必须 kebab-case 且全站唯一。
- **子目录只是归档习惯，可任意嵌套**（`source/posts/portfolio/x.md`、`source/posts/portfolio/practice/2026/x.md` 都行）：构建期递归读取，slug 取**文件名**、类型取 **tags**、URL 不受目录影响——子目录**不参与**任何路由或类型判定；跨子目录同名会被拦下并报出两处完整路径。
- `source/site/` = **站点根静态件**（favicon / apple-touch-icon / hero-base / mist / noise；手工件如简历 PDF 也放这里）：`vite.config.ts` 的 `publicDir: 'source/site'`（Vite 原生语义＝该目录内容映射到站点根），dev 直接供、build 直接拷进 `dist/` 根。
- `source/images/`、`source/video/` 由 `vite.config.ts` 的 `staticFromSource` 插件搬运（URL 与源目录**异名**：`/images/*`、`/media/video/*`）：dev 直接读源目录，build 直写 `dist/`。两段合起来**不再有 `public/` 暂存层**（2026-09-16 免暂存改造），仓库只存母版一份。
- 字体**不做自托管**（2026-09-16 用户令）：全站只吃系统字体栈（`tokens.css` 的 `--font-kai` / `--font-song`），产物里没有 `/fonts/`、没有 `@font-face`。子集自托管一度做过又撤掉，缘由与恢复做法见 `Dev_Docs/90` 已否决表。
- ⚠ 简历/资料 PDF 直放 `source/site/`（与 `favicon.svg` 同级，走 Vite 的 `publicDir` 原样直出）；只有媒体（images/video）那种「URL 与源目录异名」的映射才需要动 `vite.config.ts` 的 `MIRRORS`。`robots.txt` 自 2026-09-16 起改由 `scripts/feeds.ts` 生成（为了 sitemap 指路用 `site.url`，不再手写双主）。
- 开发预览：`npm run content:watch` + `npm run dev` 两个终端并跑（改完即热更）；或直接 `npm run build && npx vite preview`。
- 校验永远在构建里兜底：缺字段=中文报错+构建失败（M0 机制）。

## 7. 视频上传（三路线，2026-09-12 落地）

案例页支持三种视频形态，**可同时用**，都写在 `source/posts/<slug>.md`（tags 含 `portfolio` 标记）的 frontmatter 里：

| 路线 | 字段 | 文件在哪 | 观众体验 | 适用 |
|---|---|---|---|---|
| **A 外链** | `links:` | B站/抖音 | 点链接**跳走**去平台 | 任何时长；主片、合集 |
| **B 自托管** | `video:` | 你的 `source/video/`（构建期直写 `/media/video/`） | 站内直接播 | 短片（≤25MiB）当动态封面 |
| **C 嵌入** | `embeds:` | B站（播放器嵌你站） | 站内 iframe 播 | 长片，但会带平台弹幕/推荐 |

### B 自托管（占案例页 16/9 封面槽）

**母版放 `source/video/`，页面里写站点路径即可。**

```
source/video/18th_ada.mp4          ← 母版唯一家（进 git）
      ↓ vite.config.ts staticFromSource（dev 直供 / build 直写）
dist/media/video/18th_ada.mp4      ← 线上 URL = /media/video/18th_ada.mp4
```

```yaml
video:
  src: /media/video/18th_ada.mp4     # 未到位时写 【占位】/... → 自动退化为占位槽，不产生死链
  poster: /images/<slug>/xxx.webp    # 可选；缺省回落 cover
  caption: 一句话说明                  # 可选；作 aria-label
  controls: true                     # 省略=静音自动循环（动态封面）；true=带控件不自动播（有声成片）
```

**构建期三道闸（`npm run media`，已并入 `npm run build` 与 `npm run dev`）：**

| 闸 | 行为 | 为什么 |
|---|---|---|
| 单文件 > 25 MiB | 🔴 **构建失败** | 托管单文件上限（保守取 25 MiB）；超限=部署直接失败，不如本地早失败 |
| mp4 编码 = `hvc1`/`hev1`（H.265/HEVC） | ⚠️ 警告 | **Chrome/Edge/Firefox 在多数 Windows 上解不了**（页面是黑框，只 Safari 与部分手机稳） |
| moov 在 mdat 之后（无 faststart） | ⚠️ 警告 | 首帧要等整段下完才开始播 |

**导出规格（2026-09-12 一次真实事故换来的）：**

| 项 | 值 |
|---|---|
| 容器 | MP4 |
| 视频编码 | **H.264 / AVC**（别选 H.265/HEVC，别选"智能/自动"） |
| 码率 | 1080p 约 5 Mbps / 720p 约 3 Mbps |
| 其它 | 勾"网络优化"/faststart |

- 封面槽是 **16:9**，正好匹配 1920×1080（不裁不拉伸）；其他比例会被 `object-fit: cover` 裁切。
- 静音循环封面建议 3–6 MiB。工具：**HandBrake**（图形界面，选 WebM/VP9、勾掉音轨）。
- 建议 `cover` 静帧与 `video` 并存：`poster` 缺失时自动回落 `cover`，视频加载前不空窗。
- 单条自检（换素材后跑一遍，别等构建警告）：
  ```powershell
  node .shots/mp4-probe.mjs source/video/x.mp4            # 编码/分辨率/时长/faststart
  node .shots/verify-video-playable.mjs source/video/x.mp4 # 真浏览器试解码，须 PASS
  ```

### C 嵌入（站内 iframe 播第三方）

```yaml
embeds:
  - { label: B 站 · 12集合集, url: "https://player.bilibili.com/player.html?bvid=BV号&autoplay=0&high_quality=1" }
```

- **必须是播放器地址**，不是视频页地址。粘 `https://www.bilibili.com/video/BV...` 会被构建**当场击落**并打印可照抄的模板。
- host 须在 `scripts/content/schemas/shared.ts` 的 `EMBED_HOSTS` 白名单内（B站 / 优酷 / 腾讯视频 / 抖音开放平台 / YouTube / Vimeo）。**新增平台 = 加一行**。
- 必须 `https`（http 会被浏览器按"混合内容"拦掉）。`bvid` 取视频页 URL 的 `BV...` 段；`autoplay=0` 避免多个嵌入同时出声。

### A 外链

```yaml
links:
  - { label: B 站 · 12集合集, url: "https://www.bilibili.com/video/BV..." }
```

- 最省事、无体积限制。**投递建议用 B 站而非抖音**：微信内打不开抖音链接，B 站可以。
- ⚠ **别把 BOSS直聘 作品集的视频直链粘进来**：那是分钟级签名 URL（`…zhipin.com/…?sign=…&t=<过期时间戳>`），几十分钟后就 403——而语法校验只查是不是合法 http(s)，**查不出这种死链**。

### 加完素材后

```bash
npm run build && npm run checklist   # 🔴 必须为 0；🟡 会逐条列出 video/cover 等待补槽位
```
