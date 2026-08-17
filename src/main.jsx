import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import { SiteSettingsProvider } from './context/SiteSettingsContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <SiteSettingsProvider>
        <ThemeProvider>
          <BrowserRouter>
            <App />
            <Analytics />
          </BrowserRouter>
        </ThemeProvider>
      </SiteSettingsProvider>
    </HelmetProvider>
  </React.StrictMode>,
)
