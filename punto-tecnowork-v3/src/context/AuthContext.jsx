import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { account, databases } from '../lib/appwrite';
import { OAuthProvider, Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import { clearAlive } from '../lib/sessionStorage';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const fetchGoogleAvatar = async () => {
    try {
        const session = await account.getSession('current');
        if (session.provider !== 'google' || !session.providerAccessToken) return null;
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${session.providerAccessToken}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.picture || null;
    } catch { return null; }
};

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const isCheckingRef = useRef(false);

    const checkSession = async () => {
        if (isCheckingRef.current) return;
        isCheckingRef.current = true;
        try {
            const sessionData = await account.get();

            // Obtener avatar de Google si no tiene
            if (!sessionData.prefs?.avatar) {
                const pic = await fetchGoogleAvatar();
                if (pic) {
                    try {
                        await account.updatePrefs({ ...sessionData.prefs, avatar: pic });
                        sessionData.prefs = { ...sessionData.prefs, avatar: pic };
                    } catch { /* ignorar */ }
                }
            }

            const dbUserData = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users',
                [Query.equal('auth_id', sessionData.$id)]
            );

            let currentUserDoc = null;
            if (dbUserData.documents.length > 0) {
                currentUserDoc = dbUserData.documents[0];
                if (currentUserDoc.email === 'powerpuntotw@gmail.com' && currentUserDoc.user_type !== 'admin') {
                    try {
                        currentUserDoc = await databases.updateDocument(
                            import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', currentUserDoc.$id,
                            { user_type: 'admin' }
                        );
                        toast.success('¡Cuenta promovida a Administrador automáticamente!');
                    } catch { currentUserDoc.user_type = 'admin'; }
                }
            } else {
                currentUserDoc = await databases.createDocument(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', ID.unique(),
                    {
                        auth_id: sessionData.$id,
                        full_name: sessionData.name || 'Nuevo Usuario',
                        email: sessionData.email || '',
                        user_type: sessionData.email === 'powerpuntotw@gmail.com' ? 'admin' : 'client'
                    }
                );
                toast.success('¡Bienvenido! Tu perfil se ha creado exitosamente.');
            }

            setUser(sessionData);
            setDbUser(currentUserDoc);
        } catch (error) {
            setUser(null);
            setDbUser(null);
            if (error.code !== 401) toast.error('Ocurrió un error al verificar la sesión.');
        } finally {
            setLoading(false);
            isCheckingRef.current = false;
        }
    };

    useEffect(() => { checkSession(); }, []);

    const loginWithGoogle = () => {
        account.createOAuth2Session(
            OAuthProvider.Google,
            `${window.location.origin}/auth/callback`,
            `${window.location.origin}/`
        );
    };

    const loginWithEmail = async (email, password) => {
        try {
            await account.createEmailPasswordSession(email, password);
            await checkSession();
            toast.success('¡Sesión iniciada correctamente!');
        } catch (error) {
            toast.error('Credenciales inválidas o error de conexión.');
            throw error;
        }
    };

    const registerWithEmail = async (email, password, name) => {
        try {
            await account.create(ID.unique(), email, password, name);
            await loginWithEmail(email, password);
        } catch (error) {
            toast.error(error.message || 'Error al registrar usuario.');
            throw error;
        }
    };

    const logout = async () => {
        try {
            clearAlive();
            await account.deleteSession('current');
            setUser(null);
            setDbUser(null);
        } catch (error) { console.error('Error logging out:', error); }
    };

    const updateProfile = async (data) => {
        try {
            const updated = await databases.updateDocument(
                import.meta.env.VITE_APPWRITE_DATABASE_ID, 'users', dbUser.$id, data
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
            loginWithGoogle, loginWithEmail, registerWithEmail, logout, checkSession
        }}>
            {children}
        </AuthContext.Provider>
    );
};
