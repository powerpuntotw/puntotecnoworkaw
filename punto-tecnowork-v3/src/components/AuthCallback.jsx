import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { account, databases } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';

// Retry con backoff exponencial para el race-condition del OAuth
const accountGetWithRetry = async (maxRetries = 6, baseDelayMs = 600) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await account.get();
        } catch (err) {
            const isAuthError = err?.code === 401 || err?.message?.includes('missing scopes');
            if (isAuthError && attempt < maxRetries) {
                // backoff: 600ms, 1.2s, 2.4s, 4.8s, 9.6s
                await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
                continue;
            }
            throw err;
        }
    }
};

// AuthCallback maneja el OAuth sin depender del AuthContext
// para evitar conflictos con el isCheckingRef del contexto
export const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const didRun = useRef(false);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        const processLogin = async () => {
            // Detectar errores que Appwrite devuelve en la URL (?error=...)
            const urlError = searchParams.get('error');
            if (urlError) {
                let errorObj = {};
                try { errorObj = JSON.parse(decodeURIComponent(urlError)); } catch { /* noop */ }
                const msg = errorObj?.message || urlError;

                if (msg.toLowerCase().includes('same email') || msg.toLowerCase().includes('already exists')) {
                    toast.error('Ya existe una cuenta con ese email. Intentá con otra cuenta de Google.');
                } else {
                    toast.error(`Error al iniciar sesión: ${msg}`);
                }
                navigate('/', { replace: true });
                return;
            }

            try {
                // Retry con backoff para manejar el race-condition OAuth
                const sessionData = await accountGetWithRetry();

                const dbUserData = await databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'users',
                    [Query.equal('auth_id', sessionData.$id)]
                );

                if (dbUserData.documents.length === 0) {
                    // Usuario nuevo — crear registro
                    await databases.createDocument(
                        import.meta.env.VITE_APPWRITE_DATABASE_ID,
                        'users',
                        ID.unique(),
                        {
                            auth_id: sessionData.$id,
                            full_name: sessionData.name || 'Nuevo Usuario',
                            email: sessionData.email || '',
                            user_type: sessionData.email === 'powerpuntotw@gmail.com' ? 'admin' : 'client'
                        }
                    );
                    toast.success('¡Bienvenido! Tu perfil se ha creado exitosamente.');
                } else {
                    toast.success(`¡Bienvenido de nuevo, ${sessionData.name?.split(' ')[0] || ''}!`);
                }

                // Navegar al dashboard — AuthContext va a leer la sesión al montar
                navigate('/dashboard', { replace: true });

            } catch (error) {
                console.error("Error en OAuth callback:", error);
                toast.error("No se pudo iniciar sesión. Por favor intentá de nuevo.");
                navigate('/', { replace: true });
            }
        };

        processLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-medium">Iniciando sesión...</p>
                <p className="text-gray-600 text-sm">Verificando tu cuenta con Google...</p>
            </div>
        </div>
    );
};
