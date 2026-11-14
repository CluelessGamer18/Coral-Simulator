import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Poppins, served with the game instead of fetched from Google Fonts, so the page doesn't wait on another
// site before it can draw and still looks right in a classroom with no internet. One file per weight in use.
import '@fontsource/poppins/latin-300-italic.css'
import '@fontsource/poppins/latin-400.css'
import '@fontsource/poppins/latin-500.css'
import '@fontsource/poppins/latin-600.css'
import '@fontsource/poppins/latin-700.css'
import '@fontsource/poppins/latin-800.css'
import './styles/index.css'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

// basename keeps the routes working when the game is hosted under a sub-path (set `base` in vite.config.js)
createRoot(document.getElementById('root')).render(
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  </BrowserRouter>
)
