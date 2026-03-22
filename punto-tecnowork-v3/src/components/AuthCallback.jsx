import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { account, databases } from '../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { markSessionAlive } from '../lib/sessionStorage';

// AuthCallback maneja el OAuth sin depender del AuthContext
// para evitar conflictos con el isCheckingRef del contexto
export const AuthCallback = () => {
    const navigate = useNavigate();
    const didRun = useRef(false);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        const processLogin = async () => {
            try {
                // Esperar a que Appwrite SDK procese las cookies del OAuth
                await new Promise(resolve => setTimeout(resolve, 800));

                const sessionData = await account.get();

                const dbUserData = await databases.listDocuments(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'users',
                    [Query.equal('auth_id', sessionData.$id)]
                );

                if (dbUserData.documents.length === 0) {
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
                }

                // CLAVE: marcar la sesión como activa ANTES de navegar al dashboard.
                // Así checkSession en AuthContext no lo interpreta como un cierre de navegador.
                markSessionAlive();

                navigate('/dashboard', { replace: true });

            } catch (error) {
                console.error("Error en OAuth callback:", error);
                toast.error("Error al iniciar sesión. Intentá de nuevo.");
                navigate('/', { replace: true });
            }
        };

        processLogin();
    }, []);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 font-medium">Iniciando sesión...</p>
            </div>
        </div>
    );
};
