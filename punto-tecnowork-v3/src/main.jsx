import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { AuthProvider } from './context/AuthContext'
import { BrandingProvider } from './context/BrandingContext'
import { ThemeProvider } from './context/ThemeContext'
import './index.css'
import App from './App.jsx'
import { account } from './lib/appwrite'
import { isSessionAlive, markAlive } from './lib/sessionStorage'

// ── Chequeo de cierre de navegador ─────────────────────────────────────────
// sessionStorage se vacía al cerrar pestaña/navegador (NO al recargar).
// Si hay sesión de Appwrite pero no hay flag → el browser fue cerrado
// con sesión activa → borramos la sesión de Appwrite antes de montar React.
// Esto corre sincrónicamente ANTES de cualquier render, sin race conditions.
const bootApp = async () => {
    try {
        // Verificar si hay configuración que requiere cierre al salir
        // (por defecto activo si no hay config)
        let closeOnExit = true;
        try {
            const { databases } = await import('./lib/appwrite');
            const { Query } = await import('appwrite');
            const res = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'system_config',
                [Query.equal('type', 'session_config')]
            );
            if (res.documents.length > 0) {
                const cfg = JSON.parse(res.documents[0].data);
                closeOnExit = cfg.close_on_browser_exit !== false;
            }
        } catch { /* usa default */ }

        if (closeOnExit && !isSessionAlive()) {
            // No hay flag → browser fue cerrado → borrar sesión si existe
            try { await account.deleteSession('current'); } catch { /* no había sesión */ }
        }
    } catch { /* ignorar errores de boot */ }

    // Montar React
    createRoot(document.getElementById('root')).render(
        <StrictMode>
            <ThemeProvider>
                <AuthProvider>
                    <BrandingProvider>
                        <BrowserRouter>
                            <App />
                        </BrowserRouter>
                    </BrandingProvider>
                </AuthProvider>
            </ThemeProvider>
        </StrictMode>,
    );
};

bootApp();
