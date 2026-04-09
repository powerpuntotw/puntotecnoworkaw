import { Client, Account, Databases, Storage, Avatars } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const avatars = new Avatars(client);
export { client };
export default client;

// ─────────────────────────────────────────────────────────────
// BLINDAJE: withRetry — reintenta cualquier llamada a Appwrite
// con backoff exponencial ante fallos de red/servidor.
//
// Uso: const data = await withRetry(() => databases.listDocuments(...));
// ─────────────────────────────────────────────────────────────
export async function withRetry(fn, { maxRetries = 3, baseDelayMs = 500, onRetry } = {}) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            // No reintentar errores de autorización/negocio (4xx excepto 429 y 503)
            const code = err?.code ?? err?.status;
            const isNetworkOrServer = !code || code >= 500 || code === 429 || code === 0;
            if (!isNetworkOrServer || attempt === maxRetries) throw err;
            const delay = baseDelayMs * Math.pow(2, attempt);
            if (onRetry) onRetry(attempt + 1, delay, err);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
}

// ─────────────────────────────────────────────────────────────
// BLINDAJE: ConnectionMonitor — singleton que trackea online/offline
// y notifica subscribers cuando la conexion cambia.
// ─────────────────────────────────────────────────────────────
class ConnectionMonitorClass {
    constructor() {
        this._listeners = new Set();
        this._online = navigator.onLine;
        window.addEventListener('online',  () => this._set(true));
        window.addEventListener('offline', () => this._set(false));
    }
    _set(val) {
        if (this._online === val) return;
        this._online = val;
        this._listeners.forEach(fn => fn(val));
    }
    get isOnline() { return this._online; }
    subscribe(fn) {
        this._listeners.add(fn);
        return () => this._listeners.delete(fn);
    }
}

export const ConnectionMonitor = new ConnectionMonitorClass();
