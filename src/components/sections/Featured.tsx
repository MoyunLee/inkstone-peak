/* S2 观山：响应式两列瀑布流；首页=全量作品（tags 含类型标记；顺序=构建期 date 倒序，无精选挑选）。
   文章渲染交给 CaseGrid（与 /portfolio 列表页同源）。 */
import Section from '../layout/Section'
import CaseGrid from '../ui/article/CaseGrid'
import { works } from '../../lib/data/content'
import { sectionById, useSite } from '../../lib/data/site'

export default function Featured() {
  const site = useSite()
  const sec = sectionById(site, 'portfolio')
  if (!sec) return null
  return (
    <Section sec={sec}>
      <CaseGrid items={works} />
    </Section>
  )
}
