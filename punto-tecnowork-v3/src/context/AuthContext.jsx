import { createContext, useContext, useEffect, useState } from 'react';
import { account, databases } from '../lib/appwrite';
import { OAuthProvider, Query, ID } from 'appwrite';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [dbUser, setDbUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        try {
            const sessionData = await account.get();
            setUser(sessionData);

            // Fetch extra profile data from our custom 'users' collection
            const dbUserData = await databases.listDocuments(
                import.meta.env.VITE_APPWRITE_DATABASE_ID,
                'users',
                [Query.equal('auth_id', sessionData.$id)]
            );

            if (dbUserData.documents.length > 0) {
                setDbUser(dbUserData.documents[0]);
            } else {
                // If it's a first-time Google login, create the DB user record
                const newUser = await databases.createDocument(
                    import.meta.env.VITE_APPWRITE_DATABASE_ID,
                    'users',
                    ID.unique(),
                    {
                        auth_id: sessionData.$id,
                        full_name: sessionData.name || 'Nuevo Usuario',
                        email: sessionData.email || '',
                        user_type: 'client'
                    }
                );
                setDbUser(newUser);
                toast.success('¡Bienvenido! Tu perfil se ha creado exitosamente.');
            }
        } catch (error) {
            console.error('Session check failed:', error);
            setUser(null);
            setDbUser(null);
            // Ignore the "missing scopes" guest log, it's normal when unauthenticated
            if (error.code !== 401) {
                toast.error('Ocurrió un error al verificar la sesión.');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const loginWithGoogle = () => {
        // Redirige al callback que definiremos en VITE (ej. http://localhost:5173/auth/callback)
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
            console.error('Email login failed:', error);
            toast.error('Credenciales inválidas o error de conexión.');
            throw error;
        }
    };

    const registerWithEmail = async (email, password, name) => {
        try {
            await account.create(ID.unique(), email, password, name);
            // After successful registration, log them in
            await loginWithEmail(email, password);
        } catch (error) {
            console.error('Email registration failed:', error);
            toast.error(error.message || 'Error al registrar usuario.');
            throw error;
        }
    };

    const logout = async () => {
        try {
            await account.deleteSession('current');
            setUser(null);
            setDbUser(null);
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    const value = {
        user,
        dbUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        checkSession
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
