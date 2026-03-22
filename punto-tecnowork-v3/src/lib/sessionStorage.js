// Utilidades de sessionStorage para detectar cierre de navegador.
// sessionStorage se vacía automáticamente al cerrar pestaña/navegador.

const KEY = 'pt_alive';

export const isSessionAlive = () => !!sessionStorage.getItem(KEY);
export const markAlive = () => sessionStorage.setItem(KEY, '1');
export const clearAlive = () => sessionStorage.removeItem(KEY);
