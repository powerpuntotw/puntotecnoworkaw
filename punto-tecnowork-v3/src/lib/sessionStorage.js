// Utilidades de sessionStorage para el manejo de cierre de navegador.
// sessionStorage se vacía automáticamente al cerrar la pestaña o el navegador,
// a diferencia de localStorage que persiste indefinidamente.
// Esto nos permite detectar si el usuario cerró el browser y hacer logout.

const SESSION_ALIVE_KEY = 'pt_session_alive';

/** Devuelve true si el navegador fue cerrado (no hay flag activo) */
export const checkBrowserExitLogout = () => {
    return !sessionStorage.getItem(SESSION_ALIVE_KEY);
};

/** Marca la sesión como activa en esta pestaña */
export const markSessionAlive = () => {
    sessionStorage.setItem(SESSION_ALIVE_KEY, '1');
};

/** Limpia el flag — llamar al hacer logout manual */
export const clearSessionAlive = () => {
    sessionStorage.removeItem(SESSION_ALIVE_KEY);
};
