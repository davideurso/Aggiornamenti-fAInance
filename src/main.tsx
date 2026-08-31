import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppWithLogin from './app'
import { EmailActionScreen, hasFainanceEmailAction } from './auth/EmailActionScreen'

// FAINANCE_V57_EMAIL_ACTION_BOOTSTRAP
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {hasFainanceEmailAction() ? <EmailActionScreen /> : <AppWithLogin />}
  </StrictMode>
)
