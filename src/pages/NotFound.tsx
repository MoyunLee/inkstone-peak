// 404："此路云雾深处，请折返" + [回山门]——措辞全部自 site.yml notfound 段注入。
import { Link } from 'react-router-dom'
import { useSite } from '../lib/data/site'

export default function NotFound() {
  const site = useSite()
  return (
    <main id="main-content" className="page-pad page-main notfound">
      <h1 className="kai">{site.notfound.line}</h1>
      <Link className="seal-btn" to={site.notfound.cta.to}>
        {site.notfound.cta.label}
      </Link>
    </main>
  )
}
