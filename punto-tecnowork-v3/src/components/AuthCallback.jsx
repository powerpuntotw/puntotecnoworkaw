import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { account, databases } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// AuthCallback — flujo createOAuth2Token (sin cookies cross-domain)
// Appwrite redirige a /auth/callback?userId=...&secret=...
// IMPORTANTE: después de createSession hay que esperar un breve delay
// antes de llamar account.get() para que la sesión se propague correctamente.
export const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { checkSession } = useAuth();
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

            // Leer userId + secret del token OAuth (createOAuth2Token flow)
            const userId = searchParams.get('userId');
            const secret = searchParams.get('secret');

            try {
                if (userId && secret) {
                    // Crear sesión con los parámetros de la URL
                    await account.createSession(userId, secret);
                    // Esperar a que Appwrite propague la sesión antes de consultarla.
                    // Sin este delay, account.get() devuelve 401 aunque la sesión
                    // se haya creado exitosamente (race condition en el servidor).
                    await new Promise(resolve => setTimeout(resolve, 800));
                }

                // Reintentos: la sesión puede tardar un poco en estar disponible
                let sessionData = null;
                for (let attempt = 0; attempt < 4; attempt++) {
                    try {
                        sessionData = await account.get();
                        break; // éxito
                    } catch (err) {
                        if (err.code === 401 && attempt < 3) {
                            // Sesión aún no propagada — esperar y reintentar
                            await new Promise(resolve => setTimeout(resolve, 600 * (attempt + 1)));
                        } else {
                            throw err;
                        }
                    }
                }

                if (!sessionData) throw new Error('No se pudo obtener la sesión tras varios intentos');

                const dbUserData = await databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'users',
                    [Query.equal('auth_id', sessionData.$id)]
                );

                if (dbUserData.documents.length === 0) {
                    // Usuario nuevo — crear registro en la colección users
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

                // Forzar re-lectura del contexto antes de navegar
                // Esto evita el bug del F5 donde el dashboard carga en blanco
                // porque AuthContext ya hizo su checkSession inicial sin sesión
                await checkSession();

                // Navegar al dashboard — AuthContext leerá la sesión al montar
                navigate('/dashboard', { replace: true });

            } catch (error) {
                console.error('Error en OAuth callback:', error);
                toast.error('No se pudo iniciar sesión. Por favor intentá de nuevo.');
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
