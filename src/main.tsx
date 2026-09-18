import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppRoutes from './routes'
import './styles/index.css'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('#root missing')

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  </StrictMode>,
)
