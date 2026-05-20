import React from 'react'
import ReactDOM from 'react-dom/client'
import TrackTraceApp from './app/TrackTraceApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TrackTraceApp standalone />
  </React.StrictMode>,
)
