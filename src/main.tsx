import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppWithLogin from './app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithLogin />
  </StrictMode>
)
