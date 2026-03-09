# Guía Maestra: Punto Tecnowork v3 (Vite + Appwrite + Google Stitch)

Este documento detalla la arquitectura, los requisitos y la estrategia paso a paso para reproducir el proyecto **Punto Tecnowork** utilizando **Vite** y **Appwrite** (autoalojado en un VPS con Easypanel). Además, se incorpora **Google Stitch** para el diseño de UI/UX. El objetivo es lograr una estabilidad absoluta, un rendimiento ultrarrápido, una interfaz visualmente impactante y el control total sobre los datos.

---

## 🏗️ 1. Arquitectura del Proyecto

**Stack Tecnológico:**
*   **Bundler:** Vite 6+ (HMR instantáneo, builds ultra-rápidos).
*   **UI Framework:** React 19+ con React Router v7 (SPA, navegación fluida sin recargas).
*   **Lenguaje:** JavaScript / TypeScript.
*   **Servicio UI/UX:** Google Stitch (para la generación y gestión de componentes visuales).
*   **Estilos:** Tailwind CSS (reemplazando CSS Modules para mayor rapidez de desarrollo y consistencia).
*   **Animaciones:** Framer Motion (transiciones premium y micro-interacciones).
*   **Iconos:** Lucide React (set moderno, consistente y ligero).
*   **Backend as a Service (BaaS):** Appwrite (Autoalojado).
*   **Infraestructura de Backend:** VPS con Easypanel para el despliegue de Appwrite.
*   **Autenticación:** Appwrite Authentication (Autenticación exclusiva con Google OAuth).
*   **Base de Datos:** Appwrite Databases (Documental, en tiempo real).
*   **Almacenamiento:** Appwrite Storage (Imágenes, comprobantes, avatares).
*   **Despliegue Frontend:** Firebase Hosting, Vercel o VPS propio.

---

## 🌍 2. Infraestructura Backend: Appwrite en VPS con Easypanel

La principal diferencia con Firebase/Supabase es que Appwrite estará autoalojado, brindando control total y evitando costos de escalado imprevistos.

### A. Configuración Inicial (Appwrite ya alojado en Easypanel)
Dado que Appwrite ya se encuentra instalado y corriendo en tu VPS con Easypanel, el primer paso es preparar la instancia para la V3:

1.  **Crear/Configurar Proyecto Appwrite:**
    *   Acceder a la consola de tu Appwrite instalado.
    *   Crear el proyecto "Punto Tecnowork V3" (o utilizar el existente).
    *   Registrar la aplicación web en las opciones del proyecto añadiendo el dominio del frontend (ej. `localhost` para entorno de desarrollo, o el dominio real) a los **CORS rules** de Appwrite para que Vite pueda comunicarse con el servicio sin bloqueos de seguridad.

### B. Integración de Appwrite MCP / mcpappwritedoc
Para facilitar el manejo y desarrollo mediante IA, se utilizará un servidor MCP (Model Context Protocol) para Appwrite:
1.  Configurar el cliente MCP apuntando a la instancia autoalojada.
2.  Proveer las claves de API (Endpoint, Project ID, API Key con permisos necesarios).
3.  Utilizar `mcpappwritedoc` para acceder a la documentación interactiva y generar esquemas de DB automáticamente.

---

## 🎨 3. Diseño Visual UI/UX con Google Stitch

El diseño visual, la experiencia de usuario (UX) y la estructura de los componentes quedan a **total libertad de Google Stitch**. No es necesario recrear o copiar la UI de la versión anterior. 

Google Stitch debe explorar, proponer e implementar las interfaces gráficas de la manera que considere más moderna, eficiente y orientada a la conversión, utilizando sus propias capacidades generativas.

### Reglas para Stitch:
1.  **Libertad Creativa:** Tienes el control total sobre los layouts, tipografías, gráficos, animaciones (puedes usar Framer Motion si lo deseas, o CSS puro, o lo que mejor se adapte), modales y flujos de pantalla.
2.  **Sistema de Colores:** Lo único que debes respetar estrictamente son los colores de la marca proporcionados a continuación. **Puedes usarlos, combinarlos, hacer gradientes o sombras con ellos como mejor te parezca** para lograr un diseño espectacular.
3.  **Framework:** Utiliza Tailwind CSS como base para estilizar.

### Los Colores de la Marca (Para uso libre de Stitch)
```javascript
module.exports = {
  darkMode: 'class', // Si Stitch decide implementar Dark Mode, excelente.
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        foreground: '#f1f5f9',
        card: 'rgba(255, 255, 255, 0.04)',
        'card-hover': 'rgba(255, 255, 255, 0.08)',
        primary: {
          DEFAULT: '#6366f1',
          glow: '#818cf8',
        },
        secondary: '#06b6d4',
        success: '#10b981',
        warning: '#f59e0b',
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #10b981 100%)',
      }
    }
  }
}
```

---

## 🗄️ 4. Estructura de Base de Datos (Appwrite Databases)

En Appwrite, primero se crea una **Database** y luego **Collections** dentro de ella. Se utilizarán permisos (Document Security) para proteger el acceso.

**Database ID**: `main_db`

### Colecciones Principales:

1.  📁 **`users`** (Perfiles extendidos de usuarios)
    *   *Permissions*: Lectura/Escritura solo por el mismo usuario (Rol: `user:[uid]`). Lectura global solo si es estrictamente necesario o mediante lógica de backend.
    *   `auth_id` (String - ID del usuario de Appwrite Auth)
    *   `email` (Email)
    *   `full_name` (String)
    *   `user_type` (Enum: "client", "local", "admin")
    *   `active` (Boolean)
    *   `avatar_id` (String - Referencia a Appwrite Storage)

2.  📁 **`points_accounts`**
    *   `client_id` (String - Referencia a `users`)
    *   `total_points` (Integer)

3.  📁 **`transactions`**
    *   `account_id` (String)
    *   `points` (Integer)
    *   `type` (Enum: "earned", "redeemed", "adjustment")
    *   `description` (String)
    *   `admin_id` (String)

4.  📁 **`rewards`** (Catálogo de premios)
    *   `title` (String)
    *   `points_cost` (Integer)
    *   `image_id` (String - Ref. a Storage)
    *   `active` (Boolean)

5.  📁 **`tickets`** (Soporte)
    *   `client_id` (String)
    *   `subject` (String)
    *   `status` (Enum: "open", "closed")
    *   *Subdocumentos/mensajes*: En Appwrite, puede manejarse como un array de objetos JSON o como una colección separada `ticket_messages` con un índice hacia `ticket_id`.

---

## 🛠️ 5. Migración e Inicialización del Cliente Appwrite

### A. Configuración en Vite

1.  **Variables de Entorno (`.env.local`):**
    ```env
    VITE_APPWRITE_ENDPOINT=https://api.tudominio.com/v1
    VITE_APPWRITE_PROJECT_ID=tu_project_id
    VITE_APPWRITE_DATABASE_ID=main_db
    ```

2.  **Inicialización del SDK (`src/lib/appwrite.js`):**
    ```javascript
    import { Client, Account, Databases, Storage, Avatars } from 'appwrite';

    const client = new Client()
        .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
        .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

    export const account = new Account(client);
    export const databases = new Databases(client);
    export const storage = new Storage(client);
    export const avatars = new Avatars(client);
    
    export default client;
    ```

### B. Autenticación Integrada (Contexto/Hooks)

Appwrite gestiona las sesiones automáticamente mediante cookies seguras (`fallback` a LocalStorage) cuando se conecta desde el navegador.

```javascript
// Ejemplo del uso de Appwrite Auth con Google OAuth
import { account } from '@/lib/appwrite';
import { OAuthProvider } from 'appwrite';

export const loginWithGoogle = () => {
    try {
        // Redirige al flujo de login de Google
        // Importante: Configurar la URL de callback válida en la consola de Appwrite
        account.createOAuth2Session(OAuthProvider.Google, `${window.location.origin}/auth/callback`, `${window.location.origin}/login`);
    } catch (error) {
        console.error("Login con Google falló", error);
        throw error;
    }
};

export const getCurrentUser = async () => {
    try {
        return await account.get();
    } catch (error) {
        return null; // No hay sesión activa
    }
}
```

---

## 🚫 6. Prevención de Problemas y Mejores Prácticas (Vite + Appwrite)

1.  **Manejo de Rutas Protegidas:**
    Ya que utilizarás Vite (SPA), asegura la protección de las rutas en el lado del cliente (React Router) envolviendo los componentes en un `<ProtectedRoute>` que verifique la sesión de Appwrite.
    
2.  **Imágenes y Archivos:**
    Usa `storage.getFileView()` para obtener la URL de las imágenes. Si descargas o subes imágenes grandes, puedes emplear utilidades de compresión en el cliente antes de crear los registros en Appwrite.

3.  **Realtime WebSockets:**
    Appwrite ofrece suscripciones Realtime. Utiliza `client.subscribe('collections.[ID].documents', callback)` para actualizar notificaciones o chats (tickets) en tiempo real en los paneles de cliente o local, asegurando envolver estas llamadas en `useEffect` limpios para evitar memory leaks.

4.  **Permisos de Colección Robustos:**
    Al reemplazar las Row Level Security (RLS) de Supabase o reglas de Firebase, asegúrate de configurar los **Document Level Permissions** en el panel de Appwrite para que un usuario estándar no pueda modificar el saldo de puntos u órdenes que pertenecen a otros.

---

## 🚀 7. Checklist de Despliegue (Appwrite + Vite)

1.  **Backend (Appwrite):**
    *   Instancia estable en VPS (Easypanel).
    *   Dominio vinculado con SSL (HTTPS).
    *   Dominios Frontend agregados a la lista de **Plataformas** autorizadas.
    *   SMTP Configurado en Appwrite para envío de correos, recovery de contraseñas y magic links.
    
2.  **Frontend (Vite):**
    *   Variables de acceso correctamente inyectadas (`VITE_APPWRITE_ENDPOINT`, etc).
    *   Build exitoso (`npm run build`).
    *   Despliegue configurado como SPA estática (Firebase Hosting, Vercel, o nginx en el VPS).

3.  **MCP Listos:**
    *   Añadir las herramientas de Appwrite MCP al entorno de desarrollo.
    *   Verificar que **Stitch MCP** está habilitado para el diseño visual.
    *   Probar la lectura de esquemas con `mcpappwritedoc`.

---
Con esta configuración autoalojada usando Easypanel y Appwrite junto a la potencia UI de Google Stitch y la velocidad de Vite, Punto Tecnowork v3 consolida la total soberanía sobre su infraestructura de datos, abriendo la puerta a escalado infinito sin cobros sorpresa y simplificando dramáticamente el desarrollo con herramientas de inteligencia artificial.
