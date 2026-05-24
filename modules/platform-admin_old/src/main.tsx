import React from 'react'
import ReactDOM from 'react-dom/client'
import PlatformAdminApp from './app/PlatformAdminApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlatformAdminApp standalone />
  </React.StrictMode>,
)
