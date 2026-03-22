import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { databases } from '../lib/appwrite';
import { clearSessionAlive } from '../lib/sessionStorage';
import { Query } from 'appwrite';
import { Clock, AlertTriangle } from 'lucide-react';

const DEFAULT_TIMEOUT_MINUTES = 15;
const WARNING_SECONDS = 60;
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
const DB_ID = () => import.meta.env.VITE_APPWRITE_DATABASE_ID;

export const SessionManager = () => {
    const { user, logout } = useAuth();
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(WARNING_SECONDS);
    const [timeoutMinutes, setTimeoutMinutes] = useState(DEFAULT_TIMEOUT_MINUTES);

    const inactivityTimer = useRef(null);
    const countdownTimer = useRef(null);
    const showWarningRef = useRef(false);

    // Cargar configuración desde Appwrite
    useEffect(() => {
        if (!user) return;
        const loadConfig = async () => {
            try {
                const res = await databases.listDocuments(DB_ID(), 'system_config', [
                    Query.equal('type', 'session_config')
                ]);
                if (res.documents.length > 0) {
                    const config = JSON.parse(res.documents[0].data);
                    if (config.session_timeout_minutes !== undefined) setTimeoutMinutes(config.session_timeout_minutes);
                }
            } catch {
                // usa default
            }
        };
        loadConfig();
    }, [user]);

    const doLogout = useCallback(async () => {
        setShowWarning(false);
        showWarningRef.current = false;
        clearTimeout(inactivityTimer.current);
        clearInterval(countdownTimer.current);
        clearSessionAlive();
        await logout();
    }, [logout]);

    const resetTimer = useCallback(() => {
        if (showWarningRef.current) return;
        clearTimeout(inactivityTimer.current);
        if (timeoutMinutes <= 0) return;

        inactivityTimer.current = setTimeout(() => {
            setShowWarning(true);
            showWarningRef.current = true;
            setCountdown(WARNING_SECONDS);

            let remaining = WARNING_SECONDS;
            countdownTimer.current = setInterval(() => {
                remaining -= 1;
                setCountdown(remaining);
                if (remaining <= 0) {
                    clearInterval(countdownTimer.current);
                    doLogout();
                }
            }, 1000);
        }, timeoutMinutes * 60 * 1000);
    }, [timeoutMinutes, doLogout]);

    // Eventos de actividad
    useEffect(() => {
        if (!user) return;
        ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();
        return () => {
            ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
            clearTimeout(inactivityTimer.current);
            clearInterval(countdownTimer.current);
        };
    }, [user, resetTimer]);

    const handleStillHere = () => {
        setShowWarning(false);
        showWarningRef.current = false;
        clearInterval(countdownTimer.current);
        resetTimer();
    };

    if (!showWarning) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="bg-dark/90 border border-warning/30 rounded-3xl p-8 sm:p-10 max-w-sm w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center">
                        <AlertTriangle className="text-warning" size={32} />
                    </div>
                </div>
                <h2 className="text-xl font-black text-white text-center italic uppercase tracking-tight mb-2">
                    ¿Seguís siendo vos?
                </h2>
                <p className="text-gray-400 text-sm text-center mb-6">
                    Detectamos inactividad. Tu sesión se cerrará automáticamente por seguridad.
                </p>
                <div className="flex items-center justify-center gap-3 mb-6">
                    <Clock className="text-warning" size={20} />
                    <div className="text-4xl font-black text-white tabular-nums">
                        {String(Math.floor(countdown / 60)).padStart(2, '0')}:
                        {String(countdown % 60).padStart(2, '0')}
                    </div>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-8">
                    <div
                        className="h-full bg-warning rounded-full transition-all duration-1000"
                        style={{ width: `${(countdown / WARNING_SECONDS) * 100}%` }}
                    />
                </div>
                <div className="flex flex-col gap-3">
                    <button onClick={handleStillHere}
                        className="w-full bg-primary hover:bg-primary-glow text-white font-black py-4 rounded-2xl shadow-glow transition text-sm uppercase tracking-wider">
                        Sí, seguir usando la app
                    </button>
                    <button onClick={doLogout}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-3 rounded-2xl transition text-sm">
                        Cerrar sesión ahora
                    </button>
                </div>
            </div>
        </div>
    );
};
