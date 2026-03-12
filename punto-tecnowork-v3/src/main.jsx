import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrandingProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </BrandingProvider>
    </AuthProvider>
  </StrictMode>,
)
