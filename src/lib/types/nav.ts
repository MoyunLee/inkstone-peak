// 双导航配置契约（对应 site.yml nav[] 的五个字段）。
export interface NavLink {
  ink: string
  route: string | null
  /** false = 长滚动多模块页（滚动联动高亮）；true = 独立/动态详情页（前缀固定激活） */
  isDetailPage: boolean
  detailPrefix: string | null
  module: string | null
}

export interface PresentSets {
  /** 'main > #module' 在场段：滚动监听候选域，也是详情页免疫守卫。 */
  main: ReadonlySet<string>
  /** getElementById 在场段：深链锚点落地域（含 main 外的页级 #footer）。 */
  any: ReadonlySet<string>
}
