---
title: 本站 front-matter 全字段速查：一篇配置一篇
date: "2026-09-16"
updated: "2026-09-21"
tags: [写作, 配置, 建站]
categories: [站务]
keywords: front-matter,Butterfly,anzhiyu,博客配置,站点默认值,作品集
description: 本站文章支持 Butterfly / anzhiyu 风格的 front-matter：站点级默认值住 site.yml 的 Post Settings 各节，逐篇只写要改的那几行。
top_img: false
cover: false
comments: false
toc: true
toc_number: false
toc_style_simple: false
copyright: true
copyright_author: 杜康
copyright_author_href: /about
mathjax: false
katex: false
aplayer: false
highlight_shrink: true
aside: true
swiper_index: 1
top_group_index: 1
background: "#fbf9f3"
main_color: "#9e2b25"
---

这篇既是说明，也是模板：它的头部把这套系统支持的字段全写了一遍，新建文章时照抄、删掉不要的行即可。

## 一、五秒上手

全部内容都在一个目录 `source/posts/` 下，按类型分两个子目录归档：

```
source/posts/
├─ portfolio/   作品（tags 含 portfolio 标记）
└─ blog/        博文
```

**子目录只是归档习惯，可以继续往下嵌套任意层**（如 `source/posts/portfolio/practice/2026/x.md`）：构建期**递归**读取，slug 仍取**文件名**、类型仍看 `tags`、URL 与目录无关；文件名（slug）全站唯一（跨子目录同名会被构建拦下并指出两处路径）。最短的一篇只要三行：

```yaml
---
title: 文章标题
date: "2026-09-16"
tags: [标签一]
---
```

正文写在第二个 `---` 之后。**就这三行也能发布**，其余字段缺省即隐藏。

## 二、两个家：站点默认值与逐篇覆盖

配置分两层住，职责不重叠：

- **站点级默认值**住 `site.yml` 顶层的 Post Settings 各节（`cover` / `top_img` / `post_meta` / `toc` / `post_copyright` / `comments` / `math` / `aplayer` / `code_blocks` / `aside`）——仿 Butterfly `_config.yml` 的精神，大多数行为改配置不改代码。
- **逐篇差异**住文章自己的 front-matter——只写你要改的那几行，其余自动继承默认值。

构建期把两者合并成「有效值」钉进 `.content/posts.json`，页面层只读成品、不做默认值推理。所以改 `site.yml` 后要重跑 `npm run content`。

## 三、必需字段

只有三个，**作品与博文同一条底线**：

- `title`：文章标题。
- `date`：创建日期，**必须加引号**（`date: "2026-09-16"`）——裸 ISO 会被 YAML 读成日期对象，当场校验失败。它同时是全站**统一排序键**（作品也按 `date` 倒序；`period` 只是页面上的展示口径，可写可不写）。
- `tags`：标签，至少一个；`tags: [写作, 配置]` 与 `tags: 写作` 两种写法都认。**它同时承载类型标记**（见第五节）。

## 四、全字段速查表

「本站默认」列 = 你不写它时会发生什么。

| 写法 | 解释 | 本站默认 |
|---|---|---|
| `title` | 【必需】文章标题 | — |
| `date` | 【必需】文章创建日期（`"YYYY-MM-DD"`，必须加引号）；进热力图的「发布格」 | — |
| `updated` | 【可选】文章更新日期（ISO，加了才显示）；与发布日**各占热力图一格** | 不显示 |
| `tags` | 【必需】标签 ≥1；**也是类型标记的载体** | — |
| `categories` | 【可选】文章分类 | 空 |
| `keywords` | 【可选】文章关键字（喂预渲染 `<meta keywords>`） | 空 |
| `description` | 【可选】文章描述（喂预渲染 `<meta description>`；也是卡片提要行与**详情页侧栏的提要段**——署名之下、两型同源） | 回落站点描述 |
| `top_img` | 【可选】详情页顶部大图 | 回落 `cover`；站点 `top_img.enable` 一票否决 |
| `cover` | 【可选】归档卡缩略图（`false` 关 / 图片地址 / 留空回落） | 无图出五档色块 |
| `comments` | 【可选】显示评论模块 | **false**；且站点 `comments.provider: null` 时，写 true 也不挂载（不留空壳） |
| `toc` | 【可选】显示目录（有 h2/h3 才出） | `toc.post: true` |
| `toc_number` | 【可选】目录与正文标题同时编号 | `toc.number: true` |
| `toc_style_simple` | 【可选】目录简洁模式（扁平内联） | `toc.style_simple: false` |
| `copyright` | 【可选】显示版权模块 | `post_copyright.enable: false` |
| `copyright_author` | 【可选】版权模块的文章作者 | 回落 `site.author` |
| `copyright_author_href` | 【可选】作者名链接 | 不出链接 |
| `copyright_url` | 【可选】版权模块的文章链接 | 回落本站该文绝对地址 |
| `copyright_info` | 【可选】版权声明文字（Butterfly 的 `license` / `license_url` 折进这一句） | 回落 `post_copyright.info` |
| `mathjax` | 【可选】公式引擎开关 | false；`math.per_page: true` = 逐篇声明才生效 |
| `katex` | 【可选】公式引擎开关（与 mathjax 二选一生效） | false |
| `aplayer` | 【可选】音乐播放器开关 | false；`aplayer.per_page: true` |
| `highlight_shrink` | 【可选】代码框默认折叠（true/false） | `code_blocks.shrink: false` |
| `aside` | 【可选】显示右侧信息栏 | `aside.enable: true` |
| `background` | 【可选】文章背景色 | 不设 |
| `main_color` | 【可选】文章主色，必须 6 位十六进制**不可缩写**（`#ffffff` 不能写 `#fff`） | 不设 |
| `swiper_index` | 【可选】一级置顶序号，数字越小越靠前 | 不设 |
| `top_group_index` | 【可选】次级置顶序号 | 不设 |
| `relatedWork` | 【可选】关联案例 slug | 仅构建期校验悬空，暂无界面落点 |

## 五、类型：加一个标记就变作品

**一篇是作品还是博文，只看 `tags`**：

- `tags` 里含 `portfolio` → **作品**，走 `/portfolio/<slug>`，可选用下列作品专属字段；
- `tags` 里不含该标记 → **博文**，走 `/blog/<slug>`。

> 标记词是**构建期**的分流指令：判定只做一处（`scripts/content/schemas/article.ts` 的常量），随后构建期会把它从产物的标签里剔掉——所以卡片上不会出现 `portfolio` 这枚标签，运行层也不认识这个词。它**不可在 `site.yml` 里配置**（历史上有过 `blog.portfolio_tag` 键，会与常量分叉、改了就静默出错，已删）。

所以下面这段就是一篇作品，多写一行可选的 `description` 提要即可（`period` 同样可选）：

```yaml
---
title: 作品名
date: "2026-09-16"
tags: [portfolio, 特效]
description: 一句话提要（卡片与详情页侧栏都用它）
period: 2026.09 – 至今
---
```

**详情页只有一套壳子**：案例页与文章页共用同一个外壳——顶图槽（有视频出视频 → 有图出图 → 都没有不出）· 题头（标题 → 发丝线）· 正文 · 嵌入槽 · 版权槽 · 侧栏（一张信息卡：作者 / 提要 / 发布 · 更新于 · 分类 · 标签；目录在卡外自成一块）全是同一份实现；**提要与元信息只住侧栏这一处**（关掉侧栏的篇目才回落到标题下）；作品只多一项「周期」，并把类型标签显示为 `site.yml` 里 `blog.work_tag` 的「作品」——两型的差别在页面上只剩标签与作品自带的数据。

**两个视图、一份数据**：`/blog` 是中心库，展示**全部**文章（含作品）；`/portfolio` 只是同一份数据里带标记的那个子集。两者由同一次构建产出，不存在两份事实。

作品专属字段（都可缺省，缺省即不渲染那一块）：

| 字段 | 必填 | 说明 |
|---|---|---|
| `description` | 可选 | 一句话提要：卡片与详情页侧栏（署名之下）都用它（就是「全字段速查」里的那个 `description`，作品不另起字段） |
| `period` | 可选 | 项目周期，出现于案例页元信息行与侧栏行（`2026.09 – 2026.12`） |
| `links` | 可选 | 外链 `[{ label, url }]`（必须合法 http(s)） |
| `video` | 可选 | 站内自托管视频 `{ src, poster, controls, caption }` |
| `embeds` | 可选 | 第三方播放器嵌入（仅白名单平台，必须 https） |
| `carousel` | 可选 | `true` = 上观山顶部纯图轮播；**必须同时有 `cover`** 才进得去 |

## 六、图片槽三态与回落链

`cover` 与 `top_img` 支持三态：**图片地址**=用这张、**`false`**=显式关闭、**留空/不写**=回落。

回落链：`top_img` 缺省回落 `cover`；站点 `cover.enable` / `top_img.enable` 设为 `false` 是全站一票否决。

素材母版一律放 `source/images/<slug>/`（构建期由 vite 插件直接搬进 `dist/images/`；站点根静态件住 `source/site/`，别把图放那儿）。

写路径时**就近写母版位置**即可：`cover: source/images/<slug>/cover.webp` 与 `cover: /images/<slug>/cover.webp` 等价，Windows 绝对路径（如 `D:\my-site\source\...`）与反斜杠也认——构建期一律归一成交付地址。视频同理：`source/video/x.mp4` ↔ `/media/video/x.mp4`。`top_img` 与 `video.poster` 同规。

## 七、首页索引：swiper_index 与 top_group_index

设了 `swiper_index` 的文章排在最前，其次是设了 `top_group_index` 的，数字越小越靠前；两个都没设就按 `date` 倒序。本文设了 `swiper_index: 1`，所以它排在归档最前面。

> ⚠ **本站语义与 Butterfly 不同**：这两个字段在本站是**`/blog` 归档网格的置顶序号**（同样作用于首页造境段），**不是**一套独立的轮播图列表。观山顶部轮播的成员由作品的 `carousel: true` + `cover` 决定，与这两个字段无关。

## 八、代码框与第三方能力

- `highlight_shrink: true`：每个代码块默认收成一段，右下角出按钮展开——下面就是被折叠的样子。
- `comments` / `mathjax` / `katex` / `aplayer` 是四个受控开关：`comments` 只有在 `site.yml` 配好评论服务提供方后才会真正挂载评论区；`mathjax` / `katex` / `aplayer` 按 Butterfly 的 `per_page` 语义走（`per_page: true` 缺省时只有逐篇声明才加载）。

```ts
// 展开按钮的文字住 site.yml a11y（post_code_expand / post_code_collapse），组件零中文字面量
export function resolvePost(fm: FrontMatter, cfg: PostDefaults) {
  return {
    toc: fm.toc ?? cfg.toc.enable,
    copyright: fm.copyright ?? cfg.copyright.enable,
  }
}
```

## 九、本站 ≠ Butterfly：照抄原文档会踩的坑

| Butterfly 的写法 | 在本站 |
|---|---|
| `comments` 默认 true | 本站默认 **false**，且 `provider: null` 时写了也不挂载 |
| `page` 的 `top_single_background` | **不支持** |
| `license` / `license_url` | 折进 `copyright_info` 一句（文案只有一个家） |
| `post_meta` 逐篇覆盖 | 只在 `site.yml` 的 `post_meta` 配，无逐篇开关 |
| `swiper_index` = 首页轮播图 | 本站 = 归档网格置顶序号（见第七节） |
| `mathjax` / `katex` / `aplayer` 会加载对应 js/css | 本站**只落成容器上的 `data-*` 钩子**，第三方脚本尚未接入——写了不报错，但也不会真的渲染公式或播放器（如实标注） |
| `date` / `tags` 必填 | 一致；本站另把 `date` 当作全站统一排序键 |

本站额外提供的字段：`relatedWork` `main_color`（6 位十六进制且不可缩写）`background`，以及作品专属一整套（见第五节）。

想看每一篇的真实头部，直接读 `site/source/posts/` 里任意一篇；字段的中文解释住 `scripts/content/diagnostics.ts` 的 `FIELD_CN` 表，报错时逐字段给你翻译。站点侧每个键怎么配，看配套的[《本站 site.yml 全字段速查》](/blog/site-yml-guide)——那份管站点，这份管文章。
