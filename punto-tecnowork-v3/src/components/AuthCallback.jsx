import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { markAlive } from '../lib/sessionStorage';

export const AuthCallback = () => {
    const navigate = useNavigate();
    const { checkSession } = useAuth();
    const didRun = useRef(false);

    useEffect(() => {
        if (didRun.current) return;
        didRun.current = true;

        const processLogin = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                // Marcar sesión activa ANTES de checkSession
                markAlive();
                await checkSession();
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
