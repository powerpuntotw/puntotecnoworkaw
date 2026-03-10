import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import client from '../lib/appwrite';

export const AuthCallback = () => {
    const navigate = useNavigate();
    const { checkSession } = useAuth();
    const [debugInfo, setDebugInfo] = useState('');

    useEffect(() => {
        // Log all URL parameters and localStorage for debugging Appwrite
        const urlParams = new URLSearchParams(window.location.search);
        const urlHash = window.location.hash;
        const cookieFallback = localStorage.getItem('cookieFallback');
        
        const debugData = {
            search: window.location.search,
            hash: urlHash,
            localStorageFallback: cookieFallback || 'none',
            cookie: document.cookie || 'none',
        };
        
        console.log("Appwrite OAuth Callback Debug:", debugData);
        setDebugInfo(JSON.stringify(debugData, null, 2));

        const processLogin = async () => {
            try {
                // Wait briefly for Appwrite SDK to parse URL if it hasn't
                await new Promise(resolve => setTimeout(resolve, 1000));
                await checkSession();
                navigate('/dashboard', { replace: true });
            } catch (error) {
                console.error("Error processing Auth callback:", error);
                // navigate('/', { replace: true }); // DO NOT navigate away so we can see the error!
            }
        };

        processLogin();
    }, [checkSession, navigate]);

    return (
        <div className="flex h-screen items-center justify-center bg-background text-foreground p-8">
            <div className="flex flex-col items-center gap-4 max-w-2xl w-full">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-xl font-medium">Validando Sesión de Appwrite...</h2>
                <div className="bg-muted p-4 rounded-md w-full overflow-auto text-xs font-mono whitespace-pre-wrap">
                    <p className="font-bold text-red-400 mb-2">DEBUG INFO (Por favor, tómale foto a esto si se queda atascado):</p>
                    {debugInfo}
                </div>
                <button 
                    onClick={() => navigate('/')}
                    className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md"
                >
                    Volver al login
                </button>
            </div>
        </div>
    );
};
