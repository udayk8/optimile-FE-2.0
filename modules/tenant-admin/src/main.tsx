import React from 'react'
import ReactDOM from 'react-dom/client'
import TenantAdminApp from './app/TenantAdminApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantAdminApp standalone />
  </React.StrictMode>,
)
