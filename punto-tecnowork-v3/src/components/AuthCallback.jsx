import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { account, databases, withRetry } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// AuthCallback — flujo createOAuth2Token (cross-domain, sin cookies)
// Appwrite redirige a /auth/callback?userId=...&secret=...
//
// ARQUITECTURA DEL FIX:
// 1. Crear sesión con el token OAuth
// 2. Esperar propagación con retry+backoff (race condition del servidor)
// 3. Llamar checkSession() del contexto y esperar que termine
//    - Si ya estaba corriendo (isCheckingRef=true), checkSession() retorna inmediatamente
//      sin hacer nada. Por eso esperamos con un loop hasta que el estado se actualice.
// 4. Navegar solo cuando user y dbUser ya están en el contexto
export const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { checkSession, user, dbUser } = useAuth();
    const didRun = useRef(false);
    const navigatedRef = useRef(false);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        const processLogin = async () => {
            // 1. Detectar errores OAuth en la URL (?error=...)
            const urlError = searchParams.get('error');
            if (urlError) {
                let msg = urlError;
                try {
                    const parsed = JSON.parse(decodeURIComponent(urlError));
                    msg = parsed?.message || urlError;
                } catch { /* noop */ }

                if (msg.toLowerCase().includes('same email') || msg.toLowerCase().includes('already exists')) {
                    toast.error('Ya existe una cuenta con ese email. Intentá con otra cuenta de Google.');
                } else {
                    toast.error(`Error al iniciar sesión: ${msg}`);
                }
                navigate('/', { replace: true });
                return;
            }

            const userId = searchParams.get('userId');
            const secret = searchParams.get('secret');

            try {
                // 2. Crear sesión y esperar propagación
                if (userId && secret) {
                    await account.createSession(userId, secret);
                    // Delay inicial: Appwrite tarda ~500-800ms en propagar la sesión
                    await new Promise(r => setTimeout(r, 800));
                }

                // 3. Verificar que la sesión exista con retry+backoff
                let sessionData = null;
                for (let i = 0; i < 5; i++) {
                    try {
                        sessionData = await account.get();
                        break;
                    } catch (err) {
                        if (err.code === 401 && i < 4) {
                            await new Promise(r => setTimeout(r, 500 * (i + 1)));
                        } else throw err;
                    }
                }
                if (!sessionData) throw new Error('Sesión no disponible');

                // 4. Crear/verificar doc en DB si no existe
                const dbResult = await withRetry(() => databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users',
                    [Query.equal('auth_id', sessionData.$id)]
                ));
                if (dbResult.documents.length === 0) {
                    await withRetry(() => databases.createDocument(
                        import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', ID.unique(),
                        {
                            auth_id: sessionData.$id,
                            full_name: sessionData.name || 'Nuevo Usuario',
                            email: sessionData.email || '',
                            user_type: sessionData.email === 'powerpuntotw@gmail.com' ? 'admin' : 'client',
                        }
                    ));
                    toast.success('¡Bienvenido! Tu cuenta fue creada correctamente.');
                } else {
                    toast.success(`¡Bienvenido de nuevo, ${sessionData.name?.split(' ')[0] || ''}!`);
                }

                // 5. Forzar actualización del contexto
                // checkSession puede retornar sin hacer nada si ya está corriendo,
                // por eso esperamos máximo 6s a que user/dbUser aparezcan en el contexto
                await checkSession();

            } catch (error) {
                console.error('Error en OAuth callback:', error);
                toast.error('No se pudo iniciar sesión. Por favor intentá de nuevo.');
                navigate('/', { replace: true });
            }
        };

        processLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Efecto separado: navegar cuando el contexto ya tiene user+dbUser cargados
    // Esto desacopla la navegación del flujo async de processLogin
    useEffect(() => {
        if (navigatedRef.current) return;
        if (user && dbUser) {
            navigatedRef.current = true;
            navigate('/dashboard', { replace: true });
        }
    }, [user, dbUser, navigate]);

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
