# Análisis de Lógica Actual: Punto Tecnowork

Este documento extrae la lógica de negocio **exacta** del proyecto actual (Next.js + Supabase) para asegurar su replicación 1:1 en el nuevo entorno (Vite + Appwrite + Google Stitch).

---

## 1. Autenticación y Perfiles
*   **Roles Existentes:** `client` (Cliente), `local` (Sucursal), `admin` (Administrador).
*   **Aprovisionamiento:** El acceso a la plataforma se realizará **exclusivamente mediante Google Auth** a través del proveedor OAuth de Appwrite. Al iniciar sesión, la app carga el usuario local y sincroniza con la base de datos (colección `users`).
*   **Diferencia clave en Appwrite:** Deberemos usar el `Account` de Appwrite (`createOAuth2Session`) y una colección `users` personalizada que vincule el ID del usuario de sesión con su rol y datos de perfil (`full_name`, `location_id` si es local).

## 2. Sistema de Puntos y Niveles (Tiers)
El sistema jerarquiza a los clientes basándose en sus **Puntos Históricos (Lifetime Points)**:
*   **🥉 BRONCE:** Nivel inicial (0 a 999 pts).
*   **🥈 PLATA:** Requiere 1,000 pts.
*   **✨ GOLD:** Requiere 2,000 pts.
*   **💎 DIAMOND:** Requiere 3,000 pts.
*   *Lógica de ganancia:* Los usuarios ganan el **10%** del monto total de cada orden en puntos. (Ej: Monto $1000 = +100 puntos).

## 3. Lógica de Locales (Sucursales)
Las sucursales se administran desde la tabla/colección `printing_locations`.
*   **Visibilidad en Tiempo Real:** 
    *   Un local solo aparece "Abierto" para los clientes si cumple **dos condiciones**: `is_open` es true **Y** `last_active_at` es menor a 5 minutos.
    *   *Heartbeat:* El dashboard del local hace un ping (actualiza `last_active_at`) cada **3 minutos** (180,000 ms) siempre que la pestaña esté visible (visibility API).
*   **Capacidades:** Un local puede tener impresiones a color (`has_color_printing`), tamaños máximos diferenciados (`max_bw_size`, `max_color_size`), y servicio fotográfico especial (`has_fotoya`).
*   **Precios dinámicos:** Los locales pueden usar precios globales de la app (tabla settings) o definir `custom_prices` que sobreescriben los precios base por cada formato y calidad.

## 4. Flujo de Órdenes e Impresiones
El formulario de carga (Upload) es el componente más complejo:
*   **Archivos permitidos:** JPG, PNG, WEBP, PDF, DOC, DOCX. Máximo 10MB por archivo.
*   **Cotización:** Se calcula el `unitPrice * files.length * copies`. El precio unitario depende de la ubicación seleccionada, el tamaño y la calidad (`standard` vs `premium` para color).
*   **Prevención de bloqueos móviles:** Actualmente la app delega la subida a un backend (Next.js API route `/api/upload-file`) porque la subida directa desde el navegador fallaba en celulares. 
    *   *Solución en Appwrite:* Appwrite maneja multipart uploads de forma nativa por API. Deberemos usar `storage.createFile()` pasando directamente el objeto `File` javascript del formulario, controlando el timeout.

**Estados de la Orden:**
1.  `pendiente` (Recién creada)
2.  `en_proceso` (Local la está imprimiendo)
3.  `listo` (Visualizado verde, lista para retirar)
4.  `entregado` (Cobrada y finalizada)
5.  `cancelado` (Rechazada / Cliente no fue)

## 5. Dashboards por Rol
*   **Cliente:** 
    *   Tarjeta de Nivel con Barra de Progreso a próximo tier.
    *   Tarjetas de acción rápida (Subir Archivo, Recompensas).
    *   Lista visual de órdenes recientes.
    *   Red de locales (con indicadores de disponibilidad en tiempo real).
*   **Local (Sucursal):**
    *   Toggle para abrir/cerrar sucursal.
    *   KPIs: Órdenes hoy, Puntos entregados hoy, Ingresos hoy, Pendientes e Imprimiendo.
    *   Tabla de control para cambiar el estado de las órdenes en tiempo real.
*   **Administrador:**
    *   Vista "Dios" con gráficos de partición por nivel (PieChart de Recharts).
    *   Lista de locales en tiempo real, métricas monetarias (Revenue) globales y distribución general de órdenes.

## 6. Siguientes Pasos (Appwrite + Vite + Stitch)
Para garantizar esta misma experiencia funcional de forma limpia:
1.  **Stitch UI (Libertad Total):** Google Stitch se encargará de diseñar la UI y los gráficos de la manera que considere más óptima, moderna y atractiva para los usuarios. **No hay obligación de replicar la interfaz anterior**. Su única restricción es usar la paleta de colores del proyecto de forma creativa.
2.  **Base de Datos Appwrite:** Deberemos diseñar un esquema NoSQL eficiente. (Sugerencia: Colección `orders` con los detalles en el mismo documento, Colección `locations` para el latido/heartbeat).
3.  **Realtime de Appwrite:** En el dashboard del Cliente y Admin, nos suscribiremos activamente a los cambios en el documento de las *locations* para cambiar instantáneamente la etiqueta de "Conectado/Desconectado" o "Abierto/Cerrado" al instante.
