import React from 'react'
import ReactDOM from 'react-dom/client'
import TmsDriverAppApp from './app/TmsDriverAppApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TmsDriverAppApp standalone />
  </React.StrictMode>,
)
