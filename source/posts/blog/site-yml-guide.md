---
title: 本站 site.yml 全字段速查：每个键怎么配，什么时候可以删
date: "2026-09-16"
updated: "2026-09-19"
tags: [写作, 配置, 建站]
categories: [站务]
keywords: site.yml,配置,建站,Butterfly,zod,缺省即隐藏,构建期校验
description: site.yml 是本站骨架与全部界面文案的唯一事实源。本篇按顶层分节逐键列出「怎么写 / 能不能省 / 省了会怎样」，并给出改配置的连锁影响与常见报错对照。
toc_number: false     # 本文标题自带编号（## 一、/ ### 3.1），再叠 toc.number 的自动编号会出双份——与姊妹篇 front-matter-guide 同处理
---

这篇是给未来的自己（和任何一个要接手这份配置的人）写的：`site.yml` 有 13 个顶层分节、几十个键，注释虽密，但「哪些删了当场报错、哪些删了只是少一块 UI」光靠翻文件容易记混。本文按分节逐键过一遍，每个键给三样东西：**怎么写 / 能不能省 / 省了会怎样**。

配套那篇《本站 front-matter 全字段速查》管的是**每一篇文章**的头部；这篇管的是**站点层**。两篇合起来，本站零代码能碰的配置面就齐了。

## 一、先记住三条铁律

1. **界面可见中文只住 `site.yml`。** `scripts/gate-cn.ts` 扫 `src/components` 与 `src/pages`，注释之外出现汉字即构建失败——导航名、按钮字、aria 文案全在这里，不在代码里。
2. **缺省即隐藏。** 可选键缺失 = 对应 UI 整块不渲染，不留空壳。这条现已覆盖 `about` 的全部文案键（除 `hero_title`）。
3. **strict 白名单：拼错键就等于构建失败。** 每个对象都是 strict 的——多一个键、少一个必填键、类型不对，都会在 `npm run content` 阶段被拦下并给出中文解释。**改键名要同步两处**：`scripts/content/schemas/site.ts` 与 `src/lib/types/site.ts`；`scripts/content/contract.ts` 会拦住两者的漂移。

> 改完 `site.yml` 记得重跑 `npm run content`——`.content/*.json` 是构建期产物，页面读的是它，不是 yml 本身。

## 二、顶层总览：哪些节能省，哪些不能

| 顶层节 | 整节可省？ | 节内必填 | 管什么 |
|---|---|---|---|
| `site` | ❌ 不能 | `title` `author` `lang` `description` `url` | 站点元信息 / canonical / sitemap / rss |
| `nav` | ❌ 不能 | 每条 5 个字段全给 | 双导航 / 路由白名单 / 预渲染页面清单 |
| `page_meta` | ✅ 可整节删 | — | 子页 `<title>` 专名 |
| `home` | ❌ 不能 | `sections` ≥1 段；每段 `id` + （`heading` 或 `heading_lines` ≤2 行） | 首页五段 |
| `portfolio` | ✅ 可整节删 | — | 观山轮播张数 / 作品详情目录 |
| `blog` | ✅ 可整节删 | — | 归档列表 / 首页造境段 / 卡片标签 |
| `cover` `top_img` `post_meta` `toc` `post_copyright` `comments` `math` `aplayer` `code_blocks` `aside` | ✅ 十节都可整节删 | — | 文章详情的站点级默认值（Post Settings） |
| `heatmap` | ✅ 可整节删 | 给了就要给全 9 键 | 首页造境段与 `/blog` 的热力图 |
| `about` | ❌ 不能 | **仅 `hero_title`** | `/about` 便当盒（话术 + 事实） |
| `contact` | ❌ 不能 | `email` | 页脚联系方式栏 |
| `footer` | ❌ 不能 | `cta` `columns` `brand_bio` `portfolio_links` `seal_text` `copyright` | 页脚 / 首页传音段 / favicon 印文 |
| `notfound` | ❌ 不能 | `line` `cta` | 404 页 |
| `a11y` | ✅ 可整节删 | —（27 键全可选） | 全站 aria 与可见小字 |

一句话记法：**「骨架进必填，能力进可省」。** 站点身份、页面清单、首页结构、关于页标题、联系方式与页脚、404，这些是骨架；轮播、归档开关、热力图、文章默认值、aria 文案，这些是能力，删了只退场不报错。

## 三、逐节逐键

### 3.1 `site`（必填节）

| 键 | 必填 | 说明 |
|---|---|---|
| `title` | ✅ | 站点名；页面 meta 回落它，也作标题后缀 |
| `author` | ✅ | 作者名；`/about` 深墨卡的名字、版权模块作者回落到它 |
| `lang` | ✅ | 注入 `<html lang>`（如 `zh-CN`） |
| `description` | ✅ | 首页与列表页的 meta 描述 |
| `url` | ✅ | **站点绝对 URL**：逐路由 canonical、sitemap、rss、robots 的域唯一来源；必须是合法 `http(s)` |
| `tagline` | 可选 | 备用副题，**当前无消费者**（写了不报错，也不出现在任何地方） |

### 3.2 `nav`（必填节，双导航共用）

每条五字段，全部必填：

| 字段 | 取值 | 约束 |
|---|---|---|
| `ink` | 显示名 | 全站唯一（React key 与「同 id 同词」律） |
| `route` | `/` 或 `/xxx`，可 `null` | 基础路由；`/` = 首页；**基路径全站唯一** |
| `isDetailPage` | `true` / `false` | 该条目是否带动态详情页 |
| `detailPrefix` | 以 `/` 开头的路径，可含 `#锚点` | `isDetailPage: true` 时**必填**；`false` 时**必须为 `null`** |
| `module` | 首页段 id，可 `null` | 非 null 时必须命中 `home.sections` 的 id，且全站唯一 |

```yaml
nav:
  - { ink: 山门, route: /,          isDetailPage: false, detailPrefix: null,       module: home }
  - { ink: 观山, route: /portfolio, isDetailPage: true,  detailPrefix: /portfolio, module: portfolio }
```

构建期还会逐条查：`ink` 重复、`route` 基路径撞车、`detailPrefix` 撞车、`module` 不在 `home.sections` 或重复。**内链白名单也从这张表派生**——加页面 = 加一行。

### 3.3 `page_meta`（可整节省）

自由 record，**键 = 该页路由的 basename**（`/portfolio` → `portfolio`；`/` 用 `site.title`）。缺键回落 `site.title`。它只喂预渲染的 `<title>`，不进页面可见层。

```yaml
page_meta:
  portfolio: 观山
  about: 观自
```

### 3.4 `home`（必填节）

`sections` 是数组，**顺序即渲染顺序**，至少 1 段：

| 键 | 必填 | 说明 |
|---|---|---|
| `id` | ✅ | 段 id = 锚点 id；必须在 `src/site/sections.ts` 有组件实现（否则「幽灵项」构建失败）；全站唯一 |
| `heading` | 二选一 | 单行标题 |
| `heading_lines` | 二选一 | 横排断句标题，**最多 2 行** |
| `en` | 可选 | 英文副题（可 `null`） |
| `intro` | 可选 | 段引言（可 `null`） |
| `cta` | 可选 | 按钮数组 `[{ label, to }]` |
| `cta_detail` | 可选 | 标题行「查看详细」开关，**缺省 true** |

当前实现的段 id 一共 5 个：`home` `portfolio` `blog` `about` `footer`。`heading` 与 `heading_lines` 至少给一个；两个都不给 = 校验失败。

### 3.5 `portfolio`（可整节省）

| 键 | 必填 | 缺省行为 |
|---|---|---|
| `carousel.max_slides` | 可选 | 删键/整节删 = **不限张数**；候选多于上限时只呈现前 N（构建期给提醒，不阻断） |
| `carousel.interval_ms` | 可选 | 缺省/删 = `5000` 毫秒 |
| `toc.enable` | 可选 | 作品详情页目录；缺省 = 回落 Post Settings 的 `toc.post` |
| `toc.number` | 可选 | 作品目录编号；**缺省/删 = `false`**（博客侧默认 `true`，两型默认值分家） |
| `toc.style_simple` | 可选 | 作品目录简洁模式；缺省/删 = `false` |

注意：**轮播成员不在这里点名**——由各作品 front-matter 的 `carousel: true` 且**有 `cover`** 决定，这里只管「最多几张、多久换一张」。

### 3.6 `blog`（可整节省）

| 键 | 取值 | 缺省行为 |
|---|---|---|
| `order` | `desc` / `asc` | 缺省 `desc`（新文章在前） |
| `show_date` | 布尔 | 缺省/删 = 归档卡不显示日期 |
| `tags_max` | 正整数 | 删键 = 不限量 |
| `preview_max` | 正整数 | 缺省 `6`（首页造境段预览卡上限，超出的不渲染、不占 DOM） |
| `work_tag` | 字符串 | 作品在归档卡上的中文标签；删键 = 卡片不加这枚标签 |

### 3.7 Post Settings 十节（每节都可整节删）

优先级：**逐篇 front-matter > 本节 > 内置缺省**。下表「内置缺省」列 = 整节删掉之后的行为：

| 键 | 内置缺省 | 说明 |
|---|---|---|
| `cover.enable` | 视为开 | `false` = 全站强制色块，无视逐篇 `cover` |
| `top_img.enable` | 视为开 | `false` = 全站禁顶部大图 |
| `post_meta.post.date_type` | `both` | `created` 只出发布 / `updated` 只出更新（缺则回落发布）/ `both` 都出 |
| `post_meta.post.categories` | `true` | 详情页 meta 是否出分类 |
| `post_meta.post.tags` | `true` | 是否出标签 |
| `post_meta.post.label` | `true` | 是否出「更新于 / 分类」这类行首词 |
| `toc.post` | `true` | 详情页出目录（有 h2/h3 才出） |
| `toc.number` | `true` | 目录与正文标题同时编号 |
| `toc.style_simple` | `false` | 简洁模式（扁平内联） |
| `post_copyright.enable` | `false` | 版权模块开关 |
| `post_copyright.author` | `null` | `null` = 回落 `site.author` |
| `post_copyright.author_href` | `null` | `null` = 作者名不出链接 |
| `post_copyright.url` | `null` | `null` = 回落本站该文绝对地址 |
| `post_copyright.info` | `null` | 声明文字；开后不给 = 空串（开版权务必给 `info`） |
| `comments.enable` | `false` | 评论开关 |
| `comments.provider` | `null` | `null` = 即便逐篇 `comments: true` 也不挂载（不留空壳） |
| `math.per_page` | `true` | `true` = 逐篇声明才加载 |
| `math.mathjax.enable` / `math.katex.enable` | `false` | 引擎开关（`per_page: false` 时才全站生效） |
| `aplayer.enable` | `false` | 音乐播放器开关 |
| `aplayer.per_page` | `true` | 同 math 的逐篇语义 |
| `code_blocks.shrink` | `false` | 代码框默认折叠 |
| `aside.enable` | **`false`** | ⚠ 整节删掉文章就**没有右侧信息栏**；本站现配 `true` |

### 3.8 `heatmap`（可整节省；给了就要给全）

整节删 = 热力图整块不出。给了，则下面 9 个键**一个都不能少**（长度即刻度，写死防错位）：

| 键 | 约束 |
|---|---|
| `title` | 支持 `{year}`（所选年）与 `{n}`（该年条数） |
| `less` / `more` | 图例两端文字 |
| `tip` | 有更新悬浮提示，`{date}` `{n}` |
| `tip_empty` | 空白格悬浮提示，`{date}` |
| `region_label` | 区块 aria-label |
| `years_label` | 年份页签组 aria-label |
| `weekdays` | **恰好 7 项**，周日起 |
| `months` | **恰好 12 项**，索引 0 = 1 月 |

数据口径：热力图吃**全部文章**（含作品），每篇按「发布日 + 更新日」各记 1 条（`updated` 缺省、或与 `date` 同日时只记 1 条）——所以 `{n}` 是**条数**（发布 + 更新事件数），不是文章数。口径住在代码里（`src/lib/data/content.ts` 的 `heatItems`），本节只管文案与刻度。

### 3.9 `about`（必填节；话术 + 事实同家）

`about` 这一节本身不能删，但节内**只有 `hero_title` 是必填**：

| 键 | 必填 | 说明 |
|---|---|---|
| `hero_title` | ✅ | `/about` 顶部书法大题，**本页唯一 h1** 的文本 |
| `anchors` | 可选 | 本页声明的锚点段；**给了就必须含 `about` + `footer`**，作内链 `/about#碎片` 校验的事实源（**构建期硬校验**：缺一端点即报错）。不写就不校验 |

以下 20 个文案键**全部可省**，删键即不渲染对应元素：

| 键 | 管哪一块 | 删了会怎样 |
|---|---|---|
| `tags_left` / `tags_right` | 顶部印章左右标签列 | 该列不出（另一列与印章照常） |
| `label_intro` | 深墨卡左上小字 | 不出 |
| `intro_lead` | 深墨卡大字前缀（如「我叫」） | 只出后面的名字 |
| `intro_sub` | 深墨卡第三行定位句 | 少这一行 |
| `label_pursuit` | 追求卡左上小字 | 不出 |
| `title_pursuit_a` | 追求卡大字前段 | 不出（若 `title_pursuit_b` 也缺则整行不出） |
| `title_pursuit_b` | 追求卡朱砂高亮段 | 只出前段 |
| `label_skill` | 技能卡左上小字 | 不出 |
| `title_skill` | 技能卡大字题 | 不出 |
| `label_career` | 生涯卡左上小字 | 不出 |
| `title_career` | 生涯卡大字题 | 不出 |
| `label_stats` | 数据卡左上小字 | 不出 |
| `title_stats` | 数据卡大字题 | 不出 |
| `label_place` | 坐标卡左上小字 | 不出 |
| `title_place` | 坐标卡大字题 | 不出 |
| `place_note` | 坐标卡配文，支持 `{city}` | 该行不出；与 `place_avail` 同时缺则整块 meta 区不出 |
| `place_avail` | 可实习城市 / 合作方式 | 该行不出 |
| `place_coord` | 装饰坐标（纯装饰） | 不出 |
| `hours_unit` | 时长单位后缀（本站 `h`） | 单位后缀不出 |

还有一个**可整块省**的 `skill_groups`（技能卡四组，唯一事实源）：

```yaml
skill_groups:
  - id: brush        # 图标键：brush / ink / paper / inkstone 有内置图标，未知回落默认；组内唯一
    title: 笔 · 建模雕刻
    desc: 一句话定位
    tier: mastered   # 自由英文码；本站约定 mastered/skilled/basic/drybrush → 浓墨/淡墨/清墨/飞白
    tools: [3ds Max, ZBrush]
```

整块删 = 技能卡整张不渲染；**给了就不能给空数组**，组内 `id` 不能重复，`tools` 至少一项。

**事实层**（2026-09-16 由 `content/about/about.md` 整份并入；`site/content/` 已删）——三块都**可整块省**，缺省即隐藏：

| 键 | 说明 | 删了会怎样 |
|---|---|---|
| `timeline` | 生涯卡节点 `{ period, text }` 数组；**数组顺序即从上到下** | 生涯卡整张不出 |
| `gameLog` | 数据卡 `{ game, hours, insight? }` 数组（`insight` 缺省 = 该条不出解析行） | 数据卡整张不出 |
| `location` | 现居城市；填 `place_note` 的 `{city}` | `{city}` 填空，卡片照旧 |

```yaml
about:
  timeline:
    - { period: "2024 - 2027", text: 动漫制作技术专业（在读） }
  gameLog:
    - { game: 我的世界（MC）, hours: 1000, insight: 体素逻辑与程序化生成思维 }
  location: 中国，长沙市
  anchors: [about, footer]
```

### 3.10 `contact`（必填节）

`email` 必填且必须通过邮箱正则。其余键是 **catchall**：平台名随意，值必须是这个形状（strict）：

```yaml
contact:
  email: someone@example.com
  douyin:   { platform: 抖音, value: 重生1985, url: "https://v.douyin.com/xxxx/" }
  bilibili: { platform: B 站, value: null, url: null, pending: 筹建中 }
```

`url: null` 时渲染成灰字、不留死链；`url` 若给了就必须是合法 `http(s)`。

### 3.11 `footer`（必填节）

| 键 | 必填 | 说明 |
|---|---|---|
| `cta` | ✅ | `{ label, arrow?, to }`，首页传音段的行动按钮 |
| `columns` | ✅ | 栏目数组（见下） |
| `brand_bio` | ✅ | 页脚简介；**求职意向/地域口径的全站唯一落点** |
| `portfolio_links` | ✅ | `[{ label, to }]` 链接表，栏目可按名字引用 |
| `seal_text` | ✅ | 印文；页脚大印与**构建期生成**的 favicon / apple-touch-icon 都用它 |
| `copyright` | ✅ | 版权行 |
| `demo_note` | 可选 | 演示站小字；发布前删，`checklist` 会提醒 |

`columns` 的三种写法：

```yaml
columns:
  - { id: brand,     title: null }              # 特例：印章 + brand_bio，无栏题
  - { id: site,      title: 站内, from: nav }    # 从 nav 自动生成，加页面自动出现
  - { id: portfolio, title: 创作, links: portfolio_links }  # 引用 footer 下的链接表
  - { id: social,    title: 联系, from: contact }            # 从 contact 自动生成
```

规则：`id === brand` 是特殊栏；**非 brand 栏必须给 `from`（`nav` / `contact`）或 `links`（footer 下链接表键名，或内联 `[{ label, to }]`）之一**，两者都没有 = 构建失败。

`to` 允许四类：**站内路由**（须命中从 `nav` 派生的白名单）· **`http(s)` 外链** · **`mailto:`** · **`source/site/` 下的静态件**（如 `/resume/du-kang.pdf`，构建期查落盘）。想挂简历 PDF 就走最后一类，没有专门的 `cv` 字段。

### 3.12 `notfound`（必填节）

`line`（提示语）+ `cta`（`{ label, to }`）。同一套文案生成 `dist/404.html` 并注入 noindex。

### 3.13 `a11y`（可整节省；27 键全可选）

缺键 = 不输出该属性；但键名仍走 strict 白名单，**拼错照样报错**。27 键按用途分四组：

- 布局：`nav_label` `tabs_label` `brand_label` `seal_copy_hint` `skip_link_label`
- 案例与按钮：`case_period` `case_embeds` `case_aside_label` `detail_cta` `detail_aria`（支持 `{ink}`）`carousel_prev` `carousel_next`
- 关于：`about_seal_label` `about_tags_label` `about_timeline_label`
- 博客：`post_date` `post_updated` `post_categories` `post_toc_label` `post_aside_label` `post_comments_label` `post_copyright_heading` `post_copyright_author` `post_copyright_link` `post_copyright_notice` `post_code_expand` `post_code_collapse`

## 四、删了会怎样（速查）

| 删掉 | 结果 |
|---|---|
| `site.tagline` | 无影响（当前无消费者） |
| `page_meta.<某页>` | 该页 `<title>` 回落 `site.title` |
| `portfolio` 整节 | 轮播不限张数、间隔 5000ms、作品目录用通用默认 |
| `blog` 整节 | 新在前 / 卡不显示日期 / 标签不限 / 首页预览 6 张 / 不出「作品」标签 |
| `heatmap` 整节 | 首页造境段与 `/blog` 的热力图整块不出 |
| `about` 任一文案键 | 对应那一行 / 那一块不出 |
| `about.skill_groups` | 技能卡整张不出 |
| `about.timeline` / `about.gameLog` | 生涯卡 / 数据卡整张不出 |
| `about.location` | 坐标卡的 `{city}` 填空（卡片仍在） |
| `about.anchors` | 不再校验 `/about#碎片`（页面无变化） |
| Post Settings 任一节 | 走第三节「内置缺省」列 |
| `aside` 整节 | 文章不出右侧信息栏 |
| `footer.demo_note` | 页脚右下小字消失 |
| `about.place_coord` | 坐标卡右下角坐标消失 |
| `a11y` 任一键 | 该 aria / 可见小字不输出 |
| 非 brand 栏的 `from` / `links` | ❌ **构建失败**（不能省） |

## 五、改配置会连锁影响什么

- **`nav` 加一行**：预渲染页面清单、sitemap、rss、页面 meta、双导航、滚动高亮、内链白名单全部自动跟；如果是一个**新页面**，还要写页面组件并在 `src/routes.tsx` 注册。
- **`home.sections` 加一段**：三件事一起做——yml 加段、`src/site/sections.ts` 注册组件、`nav` 挂 `module`。
- **`footer.seal_text`**：页脚大印与构建期生成的 favicon / apple-touch-icon 都用它，改完重跑 `npm run assets`。
- **类型标记**：不在 `site.yml` 里配——「作品 / 博文」的判定住构建期（`scripts/content/schemas/article.ts` 的常量），运行层只看 `kind`；构建期还会把标记词从产物标签里剔除，所以卡片上不会露出 `portfolio`。
- **`about.skill_groups`**：技能卡的唯一事实源，改表即改卡。
- **`site.yml about` 的事实层**：`timeline` / `gameLog` / `location` / `anchors` 与话术同住 `about`（2026-09-16 由 `content/about/about.md` 整份并入，`site/content/` 已删）；`place_note` 的 `{city}` 由 `about.location` 填。

## 六、常见报错对照

| 报错 | 大概率原因 |
|---|---|
| 「xx」不在 `home.sections` 的 id 之列 | `nav[].module` 拼错，或段还没加 |
| 「xx」在 `src/site/sections.ts` 无组件实现（幽灵项） | `home.sections` 写了段 id，但没注册组件 |
| 「…」不是合法邮箱 | `contact.email` 格式 |
| 「…」必须是合法的绝对 http(s) URL | `site.url`（或某个社交 `url`） |
| 「…」的 path 段未命中路由表（白名单：…） | 内链指向了不存在的站内路由——加页面请先在 `nav` 加一行 |
| 非 brand 栏必须给 from 或 links | `footer.columns` 某栏两样都没给 |
| 「…」不是 `footer` 下的链接表键名 | `columns[].links` 写了字符串，但该名字在 `footer` 下不存在 |
| 组 id「…」重复 | `about.skill_groups[].id` 撞车 |
| 横排断句标题最多两行 | `heading_lines` 超了 2 行 |
| 未知键 / 类型错误 / 必填缺失 | strict 会直接点出键名，中文解释见 `scripts/content/diagnostics.ts` 的 `FIELD_CN` 表 |

## 七、最小可用 `about` 段（已实测）

`about` 是必填节，但除 `hero_title` 外**整节删到只剩一行也能过**：

```yaml
about:
  hero_title: 观自
```

这份配置跑 `npm run content`、`npx tsc --noEmit`、中文闸与完整 `npm run build` 全部通过：页面只出顶部大题，标签列、深墨卡第三行、生涯卡、数据卡与坐标卡 meta 行全部安静退场。这就是「缺省即隐藏」的实际手感——**删键 = 删除 UI，不是删除校验**。

## 八、加东西的完整清单

| 想做的事 | 要动的文件 |
|---|---|
| 改文案 / 导航名 / 段序 / 社交链接 / a11y | 只动 `site.yml` |
| 加一个普通页面 | `nav` 加一行 + 写页面组件 + `src/routes.tsx` 注册 |
| 加一个首页段 | `site.yml home.sections` + `src/site/sections.ts` 注册 + `nav` 挂 `module` |
| 新构建期校验 | `scripts/**` |

字段的中文解释住 `scripts/content/diagnostics.ts` 的 `FIELD_CN` 表，报错时会逐字段翻译。要理解每一篇文章头部怎么写，看配套的[《本站 front-matter 全字段速查》](/blog/front-matter-guide)——那份管文章，这份管站点。
