import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';

export const AuthCallback = () => {
    const navigate = useNavigate();
    const { checkSession } = useAuth();

    useEffect(() => {
        const processLogin = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                await checkSession();
                // Esperar a que React propague los estados antes de navegar
                await new Promise(resolve => setTimeout(resolve, 200));
                navigate('/dashboard', { replace: true });
            } catch (error) {
                console.error("Error processing Auth callback:", error);
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
