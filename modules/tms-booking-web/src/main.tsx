import React from 'react'
import ReactDOM from 'react-dom/client'
import TmsBookingApp from './app/TmsBookingApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TmsBookingApp standalone />
  </React.StrictMode>,
)
