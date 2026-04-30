import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import VendorApp from './app/VendorApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <VendorApp standalone />
    </BrowserRouter>
  </React.StrictMode>
)
