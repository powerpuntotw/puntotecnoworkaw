import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { account, databases, withRetry, ConnectionMonitor } from '../lib/appwrite';
import { OAuthProvider, Query, ID } from 'appwrite';
import toast from 'react-hot-toast';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isCheckingRef = useRef(false);
    const checkingPromiseRef = useRef(null); // Promise compartida: evita fetches paralelos
    const sessionRefreshTimerRef = useRef(null);

    // checkSession: patron Promise-sharing
    // Si ya hay un check en curso, el segundo caller recibe la MISMA Promise
    // en lugar de lanzar un segundo fetch paralelo. Esto resuelve el race condition
    // del flujo OAuth donde AuthCallback y AuthContext compiten por checkSession.
    const checkSession = useCallback(() => {
        // Ya hay un check en curso -> compartir su Promise
        if (checkingPromiseRef.current) {
            return checkingPromiseRef.current;
        }
        if (isCheckingRef.current) return Promise.resolve();
        isCheckingRef.current = true;

        const doCheck = async () => {
            try {
                const sessionData = await withRetry(() => account.get(), {
                    maxRetries: 3, baseDelayMs: 800,
                });

                const dbUserData = await withRetry(
                    () => databases.listDocuments(
                        import.meta.env.VITE_APPWRITE_DATABASE_ID,
                        'users',
                        [Query.equal('auth_id', sessionData.$id)]
                    ),
                    { maxRetries: 3, baseDelayMs: 600 }
                );

                let currentUserDoc = null;
                if (dbUserData.documents.length > 0) {
                    currentUserDoc = dbUserData.documents[0];
                    if (currentUserDoc.email === 'powerpuntotw@gmail.com' && currentUserDoc.user_type !== 'admin') {
                        try {
                            currentUserDoc = await withRetry(
                                () => databases.updateDocument(
                                    import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', currentUserDoc.$id,
                                    { user_type: 'admin' }
                                )
                            );
                            toast.success('Cuenta promovida a Administrador.');
                        } catch {
                            currentUserDoc.user_type = 'admin';
                        }
                    }
                } else {
                    currentUserDoc = await withRetry(
                        () => databases.createDocument(
                            import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', ID.unique(),
                            {
                                auth_id: sessionData.$id,
                                full_name: sessionData.name || 'Nuevo Usuario',
                                email: sessionData.email || '',
                                user_type: sessionData.email === 'powerpuntotw@gmail.com' ? 'admin' : 'client',
                            }
                        )
                    );
                }

                setUser(sessionData);
                setDbUser(currentUserDoc);

                clearTimeout(sessionRefreshTimerRef.current);
                sessionRefreshTimerRef.current = setTimeout(() => checkSession(), 45 * 60 * 1000);

            } catch (error) {
                setUser(null);
                setDbUser(null);
                clearTimeout(sessionRefreshTimerRef.current);
                if (error.code !== 401) toast.error('Error al verificar la sesion.');
            } finally {
                setLoading(false);
                isCheckingRef.current = false;
                checkingPromiseRef.current = null;
            }
        };

        checkingPromiseRef.current = doCheck();
        return checkingPromiseRef.current;
    }, []);


    useEffect(() => {
        checkSession();
        return () => clearTimeout(sessionRefreshTimerRef.current);
    }, [checkSession]);

    // Reconectar al recuperar internet
    useEffect(() => {
        const unsubscribe = ConnectionMonitor.subscribe((isOnline) => {
            if (isOnline && !isCheckingRef.current) {
                setTimeout(() => checkSession(), 1500);
            }
        });
        return unsubscribe;
    }, [checkSession]);

    // Reconectar cuando la ventana vuelve a estar en foco
    useEffect(() => {
        const handleFocus = () => {
            if (!document.hidden && ConnectionMonitor.isOnline && !isCheckingRef.current) {
                checkSession();
            }
        };
        document.addEventListener('visibilitychange', handleFocus);
        return () => document.removeEventListener('visibilitychange', handleFocus);
    }, [checkSession]);

    const loginWithGoogle = () => {
        account.createOAuth2Token(
            OAuthProvider.Google,
            `${window.location.origin}/auth/callback`,
            `${window.location.origin}/`
        );
    };

    const logout = async () => {
        clearTimeout(sessionRefreshTimerRef.current);
        try {
            await withRetry(() => account.deleteSession('current'));
            setUser(null);
            setDbUser(null);
        } catch (error) { console.error('Error logout:', error); }
    };

    const updateProfile = async (data) => {
        try {
            const updated = await withRetry(
                () => databases.updateDocument(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', dbUser.$id, data
                )
            );
            setDbUser(updated);
            toast.success('Perfil actualizado correctamente');
            return updated;
        } catch (error) {
            toast.error('Error al actualizar el perfil');
            throw error;
        }
    };

    const isProfileComplete = () => {
        if (!dbUser) return false;
        return !!(dbUser.full_name && dbUser.email && dbUser.phone && dbUser.dni && dbUser.address);
    };

    return (
        <AuthContext.Provider value={{
            user, dbUser, loading, isProfileComplete, updateProfile,
            loginWithGoogle, logout, checkSession
        }}>
            {children}
        </AuthContext.Provider>
    );
};
