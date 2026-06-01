import React from 'react'
import ReactDOM from 'react-dom/client'
import TmsBookingApp from './app/TmsBookingApp'
import '../../../src/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TmsBookingApp standalone />
  </React.StrictMode>,
)
