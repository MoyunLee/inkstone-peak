// 诊断与报错：字段路径中文化、errors/warnings 收集、zod 结果翻译、构建失败用的错误类型。
// ── 报错中文化：字段路径 → 中文说明 ─────────────────
const FIELD_CN: Record<string, string> = {
  site: '站点元信息段', title: '标题', author: '作者', lang: '语言', description: '定位句（只进 meta/OG，不上首页）',
  url: 'URL（site.url=预渲染 canonical 唯一来源；links/embeds 的 url=外部地址）', tagline: '副题（备用字段）',
  nav: '双导航配置数组（2026 配置驱动：顶栏/题签/页脚栏2 唯一事实源）', ink: '导航显示名（山门/观山/造境/观自/传音）', route: '页面基础路由（null=山门首页根）', isDetailPage: '独立/动态详情页开关（true=按 detailPrefix 前缀固定高亮、滚动免疫、点击命中回顶）', detailPrefix: '详情页路由前缀（仅 isDetailPage=true，激活匹配用，可含 #锚点）', module: '长滚动共享页段锚点 id（全站唯一；滚动联动高亮与题签落点）',
  home: '首页配置', sections: '段落序列（顺序权威）', id: 'id', heading: '段标题',
  heading_lines: '段标题·横排断句两行（09-05 七轮终版）', en: '英文副题', intro: '段引言',
  cta_detail: '标题行「查看详细」按钮开关（缺省开）',
  cta: '按钮', label: '文字', to: '指向', arrow: '箭头标记',
  blog: '造境归档列表与卡片控制台（=全站文章中心库）', order: '排列方向（desc|asc）',
  work_tag: '作品在归档卡上的显示标签（界面中文唯一家）',
  show_date: '条目显示日期开关', tags_max: '条目标签显示上限', preview_max: '首页造境段预览卡片上限（扁平网格最多渲染几张；缺省 6）',
  carousel: '是否上观山顶部轮播（true=上，false 或缺省=不上；纯图，须有 cover）',
  max_slides: '轮播最多呈现几张（缺省或删键=不限）',
  post_meta: '详情页 meta 行（Butterfly post_meta）', post: '详情页 meta 开关组', date_type: '日期口径（Choose: created / updated / both）',
  post_copyright: '版权模块（Butterfly post_copyright）',
  math: '数学公式（Butterfly math）', code_blocks: '代码框（Butterfly code_blocks）', shrink: '代码框默认折叠',
  show_tags: '详情显示标签开关',
  contact: '联系方式', email: '邮箱', douyin: '抖音', bilibili: 'B 站', pending: '占位注记',
  platform: '平台名（/about 便当盒「联系方式」左列）', value: '账号值 / 状态值（url=null 时即 pending 措辞）',
  footer: '页脚', columns: '页脚栏序列', brand_bio: '个人简介（求职意向全站唯一落点）', portfolio_links: '「创作」栏链接',
  seal_text: '印文', copyright: '版权行（同名两处：site.yml footer.copyright=页脚版权行；front-matter copyright=文章版权模块开关）', demo_note: '演示站小字（M4 删行即消失）', cv: '简历 PDF（文件缺失=警告并隐藏，zod⑤）',
  from: '自动来源（nav/contact）', links: '链接表',
  notfound: '404 段', line: '提示语',
  a11y: '无障碍文案（aria/title 唯一家——中文闸无例外通道）', nav_label: '顶栏 aria-label', tabs_label: '题签 aria-label',
  seal_copy_hint: '大印 title/aria', brand_label: '徽章 aria-label',
  period: '周期', cover: '封面',
  caption: '图注',
  video: '自托管视频（占案例页封面槽位）', src: '视频文件路径（母版 source/video/x.mp4 或交付地址 /media/video/x.mp4）', poster: '视频封面图（缺省回落 cover）',
  controls: '播放控件开关（true=带控件不自动播｜缺省=静音自动循环当动态封面）', embeds: '第三方播放器嵌入（仅白名单平台）',
  desc: '技能组一句话定位（技能卡副题）', tier: '墨档英文码（技能卡上色：浓墨/淡墨/清墨/飞白）',
  gameLog: '游戏时长（site.yml about.gameLog；/about 数据卡 2×3 网格数据源）', game: '游戏名', hours: '时长', insight: '该游戏的收获解析（/about 数据卡小字；缺省=该条不显示解析行）',
  anchors: '/about 声明的锚点段（site.yml about.anchors，可省；给了须含 about+footer）', slug: 'slug（=文件名=URL 段）',
  date: '发布日期', tags: '标签', relatedWork: '关联案例 slug',
  updated: '文章更新日期（ISO，缺省不显示）', categories: '文章分类（1~多个）', keywords: '文章关键字（喂预渲染 meta keywords）',
  top_img: '详情页顶部大图槽（false=关闭；缺省回落 cover）', main_color: '文章主色（必须 6 位十六进制且不可缩写，如 #9e2b25）',
  background: '文章背景色', aside: '显示文章侧栏', highlight_shrink: '代码框默认折叠',
  comments: '显示文章评论模块（缺省 false）', toc: '显示文章 TOC', toc_number: 'TOC/正文标题编号', toc_style_simple: 'TOC 简洁模式（扁平内联）',
  copyright_author: '版权模块文章作者', copyright_author_href: '版权模块作者链接', copyright_url: '版权模块文章链接', copyright_info: '版权声明文字',
  mathjax: '加载 MathJax（受 math.per_page 语义控制）', katex: '加载 KaTeX（受 math.per_page 语义控制）', aplayer: '音乐播放器 APlayer（受 aplayer.per_page 语义控制）',
  swiper_index: '首页轮播图索引（数字越小越靠前）', top_group_index: '首页卡片组索引（数字越小越靠前）',
  enable: '开关', number: '编号', style_simple: '简洁模式', info: '版权声明文字', per_page: '逐篇开关语义（true=需逐篇声明｜false=按 enable 全站生效）', provider: '评论服务提供方（null=不挂载，缺省即隐藏）',
  post_date: '发布标签', post_updated: '更新于标签', post_categories: '分类标签', post_toc_label: '目录可访问名',
  post_aside_label: '文章侧栏可访问名', post_comments_label: '评论区可访问名',
  post_copyright_heading: '版权模块标题', post_copyright_author: '版权模块作者行标签', post_copyright_link: '版权模块链接行标签', post_copyright_notice: '版权声明行标签',
  post_code_expand: '代码展开按钮文字', post_code_collapse: '代码收起按钮文字',
  page_meta: '子页 meta 专名（只喂预渲染，M1 补录·10 §9-34）',
  carousel_prev: '轮播左箭头 aria', carousel_next: '轮播右箭头 aria',
  heatmap: '贡献热力图话术（2026-09-10，可复用组件 Heatmap.tsx 唯一文案源）',
  less: '图例左端（浅=少）', more: '图例右端（深=多）', tip: '悬浮提示模板（有更新：{date}/{n}）', tip_empty: '悬浮提示模板（空白格）',
  region_label: '热力图可访问名', years_label: '年份页签组可访问名', weekdays: '纵轴星期序（长度 7，周日起；索引 0=首行）', months: '横轴月名（长度 12）',
  about: '/about 便当盒（话术 + 事实层；2026-09-16 事实层由 content/about 整份并入）',
  tags_left: '顶部印章左侧标签序列', tags_right: '顶部印章右侧标签序列',
  hero_title: '顶部书法大题＝本页唯一 h1 的文本（配置驱动，改此行即改页面标题）',
  label_intro: '深墨卡左上极小字', intro_lead: '深墨卡大字前缀（如「我叫」）', intro_sub: '深墨卡第三行定位句',
  label_pursuit: '追求卡左上极小字', title_pursuit_a: '追求卡大字·朱砂前段', title_pursuit_b: '追求卡大字·朱砂高亮段',
  label_skill: '技能卡左上极小字', title_skill: '技能卡大字题', label_career: '生涯卡左上极小字', title_career: '生涯卡大字题',
  label_stats: '数据卡左上极小字', title_stats: '数据卡大字题', label_place: '坐标卡左上极小字', title_place: '坐标卡大字题',
  place_note: '坐标卡配文（{city} 运行时替换为 about.location）', place_avail: '坐标卡配文第二行（可实习城市/合作方式）', place_coord: '坐标卡装饰坐标（可删）',
  hours_unit: '时长单位后缀（贴在大字时长后）',
  timeline: '生涯卡时间轴（site.yml about.timeline；period=时段、text=事件）', text: '生涯时间轴的事件文字', location: '现居城市（site.yml about.location；求职目标城市仍只在页脚 brand_bio）',
  skill_groups: '/about 技能卡四组（唯一事实源，2026-09-13 由 content/ability 并入）', tools: '技能组的工具胶囊列表',
  about_seal_label: '/about 顶部印章可访问名', about_tags_label: '/about 顶部标签组可访问名', about_timeline_label: '/about 生涯时间轴可访问名',
}

type IssueLine = { file: string; where: string; why: string }
export const errors: IssueLine[] = []
export const warnings: string[] = []

export function issue(file: string, where: string, why: string): void {
  errors.push({ file, where, why })
}
export function warn(msg: string): void {
  warnings.push(msg)
}

// zod v4 issue 无统一枚举承诺 → 宽松结构取值，文案中文兜底
interface LooseIssue {
  path?: unknown
  message?: unknown
  code?: unknown
  input?: unknown
  keys?: unknown
}
function cnLeaf(p: unknown[]): string {
  const last = p[p.length - 1]
  const key = typeof last === 'string' ? last : String(last ?? '')
  return FIELD_CN[key] ?? key
}
function translateIssue(i: LooseIssue): string {
  const raw = typeof i.message === 'string' ? i.message : ''
  if (/[\p{sc=Han}]/u.test(raw)) return raw // superRefine/自定义消息已是中文
  const code = typeof i.code === 'string' ? i.code : ''
  if (code === 'invalid_type') {
    // zod v4 的 issue 不带 input 字段，只能从英文原文里取 "received X"
    const got = /received (\w+)/.exec(raw)?.[1]
    const expected = String((i as { expected?: unknown }).expected ?? '给定类型')
    if (got === undefined || got === 'undefined') return '缺少必填字段'
    if (got === 'null') return '不允许为空（null）'
    return `类型不对（期望 ${expected}，实际 ${got}）`
  }
  if (code === 'unrecognized_keys') return `出现了 10 §5 未定义的字段：${Array.isArray(i.keys) ? i.keys.join('、') : '?'}`
  if (code === 'too_small') return '不能为空 / 数量不足'
  if (code === 'invalid_value') return '取值不在允许的枚举内'
  return raw || code || '校验未通过'
}
export function pushZod(file: string, prefix: (string | number)[], result: { success: boolean; error?: { issues: unknown[] }; data?: unknown }): void {
  if (result.success) return
  for (const raw of result.error?.issues ?? []) {
    const i = raw as LooseIssue
    const p = prefix.concat(Array.isArray(i.path) ? (i.path as (string | number)[]) : [])
    issue(file, p.length > 0 ? `${p.join(' › ')}（${cnLeaf(p)}）` : '（根对象）', translateIssue(i))
  }
}

export class ContentError extends Error {
  readonly lines: string[]
  constructor(lines: string[]) {
    super(lines.join('\n'))
    this.name = 'ContentError'
    this.lines = lines
  }
}
