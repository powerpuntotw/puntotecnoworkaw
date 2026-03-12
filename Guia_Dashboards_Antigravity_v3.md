# Guía de Funcionalidades — Dashboards PuntoTecnowork v3

> **Para Antigravity:** Esta guía describe qué debe hacer cada dashboard y cómo debe comportarse cada función. La implementación técnica (Vite + Appwrite) queda a tu criterio. El sistema de login y auth ya está funcionando — **no lo toques**.

---

## Contexto del proyecto

- **Stack:** Vite + React + Appwrite (self-hosted)
- **3 roles de usuario:** `admin`, `local`, `client`
- El sistema de autenticación y roles ya está implementado y funcionando. Esta guía cubre únicamente los **dashboards y sus secciones**.

---

## Índice

1. [Panel de Administración](#1-panel-de-administración)
2. [Panel de Sucursal (Local)](#2-panel-de-sucursal-local)
3. [Panel de Cliente](#3-panel-de-cliente)
4. [Datos compartidos entre los tres paneles](#4-datos-compartidos-entre-paneles)

---

## 1. Panel de Administración

El admin tiene acceso a una barra lateral (sidebar) con las siguientes secciones:

`Dashboard · Usuarios · Locales · Órdenes · Premios · Reportes · Mantenimiento · Soporte · Branding · Auditoría · Perfil`

Hay un indicador visual (badge rojo pulsante) en el ícono de Soporte cuando hay tickets sin leer. Desaparece al entrar a esa sección.

---

### 1.1 Dashboard Principal

Es la pantalla de inicio del admin. Muestra un resumen en tiempo real del sistema.

**Lo que debe mostrar:**

- **5 tarjetas de KPI:**
  - Total de usuarios registrados
  - Total de órdenes en el sistema
  - Total de puntos emitidos históricamente (suma acumulada)
  - Cantidad de locales con estado "activo"
  - Ingresos totales acumulados (suma de todos los montos de órdenes)

- **Gráfico de torta:** distribución de clientes por nivel de fidelización (bronce / plata / oro / diamante)

- **Últimas 10 órdenes:** lista con número de orden, cliente, local, estado y monto

- **Red Operativa:** mapa/lista de todos los locales mostrando:
  - Si está "Conectado" → el local abrió su panel en los últimos 5 minutos
  - Si está "Abierto" → el local activó el estado abierto manualmente
  - Si está "Desconectado" → no hubo actividad del local en los últimos 5 minutos

---

### 1.2 Gestión de Usuarios

Lista paginada (20 por página) de todos los usuarios registrados.

**Funciones:**
- Buscar por nombre o email
- Filtrar por rol (admin / local / cliente)
- Ver puntos actuales y nivel (tier) de cada usuario
- **Cambiar el rol** de cualquier usuario desde un selector inline
- **Eliminar un usuario** de forma permanente (borra todos sus datos: órdenes, puntos, historial)
- Toda acción queda registrada en el log de auditoría

---

### 1.3 Gestión de Locales (Sucursales)

Lista y formulario para administrar las sucursales de impresión.

**Funciones:**
- Crear, editar y eliminar locales
- Cada local tiene: nombre, dirección, teléfono, email, estado (activo/inactivo)
- **Asignar un encargado:** seleccionar un usuario con rol "local" para esa sucursal. Al asignar, ese usuario queda vinculado al local. Si se cambia el encargado, el anterior queda desvinculado.
- **Configuraciones de hardware por local:**
  - FotoYa: activa o desactiva el servicio de impresión de fotos en ese local
  - Precios propios: si está activado, el local puede sobrescribir los precios globales
  - Impresión a color: si está activado, el local puede imprimir en color
  - Tamaño máximo: A4 o A3 para impresión en blanco y negro
- Toda acción queda registrada en el log de auditoría

---

### 1.4 Gestión de Órdenes

Vista global de todas las órdenes del sistema.

**Funciones:**
- Buscar por número de orden, nombre de cliente o nombre de local
- Filtrar por estado: pendiente / en proceso / listo / entregado / cancelado / pausado
- Ver en tabla: número de orden, cliente, local destino, estado (con color), monto, fecha
- Contador total de órdenes visible

---

### 1.5 Catálogo de Premios

CRUD del catálogo de premios canjeables con puntos.

**Funciones:**
- Crear, editar y eliminar premios
- Cada premio tiene: nombre, categoría, descripción, puntos requeridos, stock disponible, imagen, estado (visible/oculto)
- Subir imagen para cada premio
- Activar/desactivar premio: los desactivados no aparecen en el catálogo del cliente
- Toda acción queda registrada en el log de auditoría

---

### 1.6 Reportes e Inteligencia de Negocio

Dashboard analítico con filtros.

**Filtros disponibles:** rango de fechas (desde / hasta) + filtrar por sucursal específica o ver todo consolidado

**KPIs del período filtrado:**
- Volumen de órdenes
- Facturación total
- Ticket promedio (facturación / órdenes)
- Locales activos en el período

**Gráficos:**
- **Línea de tendencia** por días: muestra órdenes y facturación en el período seleccionado
- **Torta** de distribución por estado de órdenes en el período
- **Barras** de facturación comparativa por sucursal

**Exportar:** botón para descargar los datos del período como archivo CSV

---

### 1.7 Mantenimiento del Sistema

Panel técnico con 4 herramientas:

#### Precios Globales

Tabla editable con todos los precios base del sistema:

| Servicio | Descripción |
|----------|-------------|
| A4 económico (B&N) | Impresión estándar blanco y negro |
| A4 color | Impresión estándar a color |
| A3 económico (B&N) | Formato grande blanco y negro |
| A3 color | Formato grande a color |
| Oficio económico (B&N) | Formato legal blanco y negro |
| Oficio color | Formato legal a color |
| Foto 10×15 cm | Servicio FotoYa |
| Foto 13×18 cm | Servicio FotoYa |
| Fotocromo A4 | Servicio FotoYa |

El botón "Guardar" persiste todos los precios a la vez.

#### Ajuste Inflacionario

Campo numérico para ingresar un porcentaje (ej: 15). Al hacer clic en "Simular" se muestran los nuevos valores de todos los precios aumentados en ese porcentaje, redondeados al múltiplo de 10 más cercano. Los cambios **no se guardan automáticamente** — el admin debe hacer clic en "Guardar" para aplicarlos.

#### Estado del Backend

Botón "Ejecutar Diagnóstico" que verifica si la conexión a la base de datos está activa. Muestra indicador verde (OK) o rojo (error).

#### Administrador de Archivos

Lista todos los archivos subidos por los clientes (los que se enviaron para imprimir).

- Muestra: nombre del archivo, ruta completa, tamaño, fecha de subida
- Buscador por nombre de archivo
- Botón para eliminar archivos individuales
- Botón "Actualizar" para refrescar la lista

---

### 1.8 Soporte

Centro de gestión de comunicaciones con locales y clientes.

**Lo que ve el admin:**

- Lista de tickets abiertos y resueltos (con filtro)
- Tipos de ticket que recibe el admin:
  - Reportes de problemas técnicos de locales
  - Consultas generales de clientes
  - Problemas con órdenes
- El admin también puede **iniciar un chat** hacia cualquier sucursal (para avisos, instrucciones, etc.)

**Vista de chat de un ticket:**
- Encabezado con: tipo de ticket, categoría/asunto, nombre del local o cliente, estado
- El mensaje original/descripción del problema visible arriba
- Mensajes en burbujas (los del admin a la derecha, los del otro lado a la izquierda)
- Campo de texto + botón enviar en la parte inferior
- Los mensajes nuevos llegan **en tiempo real** (sin recargar la página) con una notificación sonora
- Botón "Cerrar Ticket" para marcar como resuelto

---

### 1.9 Branding (Identidad Visual)

Permite personalizar la apariencia de la aplicación.

**Campos editables:**
- Nombre de la plataforma (texto)
- Tagline / slogan (texto)
- Logo principal (el que aparece en el header y en el login)
- Logo para el footer en fondo claro
- Logo para el footer en fondo oscuro

Cada logo puede subirse como imagen, reemplazarse o eliminarse (al eliminar vuelve al logo por defecto del sistema).

> Los logos actualizados deben reflejarse en toda la app automáticamente después de guardar.

---

### 1.10 Auditoría

Log de todas las acciones administrativas del sistema. Solo lectura.

**Lo que registra:**
- Quién hizo la acción (nombre del admin)
- Qué acción fue (crear local, cambiar rol, eliminar usuario, actualizar precios, etc.)
- Una descripción legible de lo que cambió
- Fecha y hora exacta

Lista paginada (25 registros por página), ordenada de más reciente a más antiguo.

---

### 1.11 Perfil del Admin

Formulario para que el admin edite su propia información:
- Nombre completo
- Teléfono
- DNI
- El email no es editable (viene del sistema de login)
- Botón de cerrar sesión

---

## 2. Panel de Sucursal (Local)

El local tiene una barra de navegación horizontal (tabs) con:

`Dashboard · Órdenes · Clientes · Precios · Canjes · Soporte · Perfil`

Badge rojo en Soporte cuando hay mensajes sin leer.

---

### 2.1 Dashboard del Local

**Botón de estado Abierto/Cerrado:**
- Toggle visible en el encabezado
- Al activar "Abierto" → los clientes pueden ver ese local como disponible
- Al desactivar → los clientes ven el local como cerrado

**Heartbeat (funcionamiento en segundo plano):**
- Mientras el local tenga su panel abierto, envía una señal automática cada 3 minutos que actualiza su "última actividad"
- Si la pestaña está en segundo plano (oculta), la señal se pausa. Se reanuda cuando vuelve a estar visible
- El admin usa esta señal para mostrar si el local está "Conectado" o "Desconectado"

**KPIs del día:**

| KPI | Descripción |
|-----|-------------|
| Órdenes hoy | Cantidad de órdenes recibidas en el día de hoy |
| Puntos entregados | Total histórico de puntos acreditados a clientes desde este local |
| Ingresos hoy | Suma de montos de órdenes del día |
| Pendientes | Órdenes esperando ser atendidas |
| Imprimiendo | Órdenes en proceso activo |
| Listas para retirar | Órdenes terminadas esperando al cliente |
| Entregadas (total) | Total histórico de órdenes completadas |
| Ingresos últimos 7 días | Suma de ingresos de la semana corriente |

---

### 2.2 Mesa de Control / Órdenes

Vista tipo **Kanban** con 4 columnas. Las órdenes nuevas aparecen **automáticamente** sin recargar la página (tiempo real).

**Columnas:**

| Columna | Estado | Qué puede hacer el local |
|---------|--------|--------------------------|
| Cola | Pendiente | Ver la ficha de producción y decidir si acepta el trabajo |
| Taller | En proceso | Gestionar la impresión y marcar como listo |
| Listo | Listo | Confirmar la entrega al cliente |
| Archivo | Entregado | Solo consulta, muestra las últimas 10 |

**Al recibir una orden nueva:** aparece una notificación (toast) con el número de orden.

**Ficha de Producción** (modal al hacer clic en una orden pendiente):
- Muestra: tamaño, color o B&N, cantidad de copias, precio total, notas especiales del cliente
- Botón "Empezar Taller" → mueve la orden a "En proceso"
- Botón "Cancelar" → no hace nada, cierra el modal

**Taller** (modal de gestión de impresión):
- Permite acceder a los archivos para imprimir
- Puede marcar la orden como "Lista" cuando termina
- Puede **pausar la orden** si hay un problema con el archivo → esto notifica al cliente y abre un canal de chat (ver flujo de orden pausada más abajo)
- Tiene modo reimpresión: reabrir el taller en una orden ya lista sin cambiar el estado

**Modal de Entrega:**
- Confirmación antes de entregar: "¿Confirmar entrega? Se acreditarán los puntos al cliente."
- Al confirmar: la orden pasa a "Entregado" y se acreditan los puntos al cliente automáticamente

#### Flujo de Orden Pausada

Cuando el local detecta un problema con el archivo del cliente:

1. El local pausa la orden desde el taller, describe el problema
2. La orden queda en estado "Revisión Requerida"
3. El cliente recibe una alerta en su lista de órdenes
4. El cliente abre el chat → puede hablar con el local en tiempo real
5. Cuando se resuelve, cualquiera de los dos cierra el ticket → la orden vuelve a "En proceso"

---

### 2.3 Clientes del Local

Lista de todos los clientes que alguna vez hicieron una orden en ese local.

**Muestra por cliente:** foto de perfil, nombre, email, nivel de fidelización (bronce/plata/oro/diamante), puntos actuales

**Buscar** por nombre o email (filtro instantáneo).

---

### 2.4 Precios Locales

Solo disponible si el administrador habilitó "precios propios" para ese local.

**Comportamiento:**
- Se muestran los mismos campos de precio que la tabla global del admin
- Si el local deja un campo vacío → usa automáticamente el precio global para ese servicio
- Si el local pone un valor → ese valor reemplaza el global solo para ese local
- Al guardar, los nuevos precios se aplican a las órdenes que los clientes hagan en ese local

**Si el local NO tiene permiso de precios propios:**
- Ve la tabla de precios globales en modo solo lectura
- No puede editar nada
- Hay un mensaje explicando que los precios son definidos por el administrador

---

### 2.5 Canjes de Premios

Lista de premios que los clientes canjearon y deben retirar físicamente en ese local.

**Funcionamiento:**
- El cliente canjea un premio en su app → recibe un código único
- El local busca ese código (o el nombre del cliente o del premio)
- Al encontrarlo, ve la tarjeta del canje con: código, nombre del premio, imagen, nombre del cliente, fecha del canje
- Botón "Confirmar Entrega" → marca el canje como entregado

Los canjes ya entregados quedan en la lista con estado "Entregado" (visualmente diferenciados).

---

### 2.6 Soporte del Local

Canal de comunicación bidireccional.

**El local puede contactar a:**
- **El administrador:** para reportar problemas técnicos, falta de insumos, fallas de hardware, consultas operativas
- **Un cliente específico:** para avisarle sobre su pedido, consultas de pago, problemas con el archivo, etc.

**Al crear un ticket hacia un cliente:**
- Selecciona al cliente de la lista (solo aparecen clientes con órdenes en ese local)
- El cliente recibe el mensaje en su propio panel de soporte

**Cuando llega un mensaje nuevo:**
- Notificación sonora
- Badge "NUEVO" sobre el ticket en la lista
- Badge rojo en el ícono de Soporte en la navegación

**Vista de chat:**
- Descripción original del ticket centrada arriba
- Mensajes del local a la derecha, mensajes del otro lado a la izquierda
- Campo de texto + enviar
- Botón "Resolver" para cerrar el ticket

---

### 2.7 Perfil del Local

- Editar nombre completo, teléfono, DNI
- El email no es editable
- Botón de cerrar sesión

---

## 3. Panel de Cliente

Navegación inferior (pensada para mobile): `Dashboard · Órdenes · Historial · Premios · Soporte · Perfil`

---

### 3.1 Dashboard del Cliente

**Tarjeta de puntos y nivel:**
- Muestra los puntos actuales (los que puede canjear)
- Muestra el nivel actual (bronce / plata / oro / diamante) con ícono diferenciado por nivel
- Barra de progreso hacia el siguiente nivel

**Cómo funciona el progreso de nivel:**

| Nivel | Puntos acumulados históricos necesarios |
|-------|----------------------------------------|
| Bronce | Nivel inicial |
| Plata | 1.000 puntos |
| Oro | 2.000 puntos |
| Diamante | 3.000 puntos |

> El nivel se calcula sobre el total histórico acumulado (nunca baja aunque se canjeen puntos).

**Últimas 5 órdenes:** lista rápida con número, estado y monto.

**Red de locales:** lista de los locales disponibles mostrando si están abiertos y si tienen servicio FotoYa.

**Accesos directos:** botones para ir a "Subir Archivos" y a "Ver Premios".

---

### 3.2 Subir Archivos (Nueva Orden)

Permite al cliente crear una orden de impresión.

**El cliente debe:**
1. Elegir el local donde va a retirar
2. Subir uno o más archivos (PDF, Word, Excel, imágenes)
3. Configurar las especificaciones:
   - Tamaño: A4 / A3 / Oficio
   - Color: blanco y negro o color
   - Cantidad de copias
4. Agregar notas opcionales para el local
5. Ver el precio calculado automáticamente según los datos ingresados y el local elegido
6. Confirmar la orden

---

### 3.3 Mis Órdenes

Lista de todas las órdenes del cliente con filtros por estado.

**Estados visibles:**
- Pendiente (esperando que el local la tome)
- En Proceso (el local la está imprimiendo)
- Revisión Requerida (hay un problema, ver abajo)
- Listo (puede ir a retirar)
- Entregado
- Cancelado

Al tocar una orden → abre un detalle con: número de orden, estado, tamaño, copias, monto total, notas.

**Cuando una orden está en "Revisión Requerida":**
- Se muestra un banner de alerta rojo con el motivo que indicó el local
- Botón "Abrir Chat de Soporte" → permite chatear con el local para resolver el problema
- Al resolverse, la orden vuelve a "En Proceso" automáticamente

Las órdenes se actualizan en **tiempo real** sin recargar la página.

---

### 3.4 Historial de Puntos

Historial completo de todos los movimientos de puntos del cliente.

**Tipos de movimiento:**

| Tipo | Descripción | Signo |
|------|-------------|-------|
| Ganados | Por completar una orden | `+` (verde) |
| Canjeados | Por canjear un premio | `−` (rojo) |
| Ajuste | Corrección manual por admin | neutro (azul) |
| Bonus | Premio extra | `+` (amarillo) |

Muestra también: tarjeta de resumen con puntos actuales, nivel, y total acumulado histórico.

Filtros por tipo de movimiento.

---

### 3.5 Catálogo de Premios

Muestra todos los premios activos del catálogo.

**Por cada premio:** imagen, nombre, categoría, puntos necesarios, descripción, stock disponible.

**Al hacer clic en canjear:**
- Se descuentan los puntos del saldo del cliente
- Se genera un código único de canje
- El cliente debe presentar ese código en el local para retirar el premio

---

### 3.6 Soporte

El cliente puede abrir consultas o ver los mensajes que le enviaron.

**Puede iniciar una consulta sobre:**
- Problema con una orden
- Error en el cobro o facturación
- No recibí mis puntos
- Consulta general
- Sugerencia o feedback
- Otro

Al crear una consulta puede elegir a qué local dirigirla (opcional).

**También recibe aquí** los mensajes que el local le envía directamente (avisos sobre su pedido, etc.).

**Vista de chat:**
- Mismo comportamiento que en el local: mensajes en tiempo real, notificación sonora, scroll automático
- Puede marcar su propia consulta como resuelta

---

### 3.7 Perfil del Cliente

**Campos editables:** nombre completo, teléfono, DNI

**Validaciones:**
- Nombre: obligatorio, mínimo 3 caracteres
- Teléfono: solo números, entre 7 y 15 dígitos
- DNI: solo números, entre 7 y 8 dígitos

**Flujo de onboarding (primer login):**
- Si el cliente acaba de registrarse y no tiene nombre cargado, se lo lleva directamente a esta pantalla con un mensaje de bienvenida
- El botón dice "Comenzar" en lugar de "Guardar"
- Al guardar redirige al Dashboard

**Eliminar cuenta:**
- Opción al final de la pantalla en una sección de "zona de riesgo"
- Antes de eliminar, el sistema verifica que no tenga órdenes activas ni canjes pendientes
- Si los tiene → se informa al usuario y se bloquea la eliminación
- Si no los tiene → pide confirmación escribiendo la palabra "ELIMINAR"
- Al confirmar → se borran todos los datos del usuario del sistema

---

## 4. Datos compartidos entre paneles

Esta tabla resume qué datos produce cada rol y quién los consume:

| Dato / Acción | Lo genera | Lo consume |
|---------------|-----------|------------|
| `last_active_at` del local | Local (heartbeat automático) | Admin (ve "Conectado") + Cliente (ve "Abierto") |
| `is_open` del local | Local (toggle manual) | Admin + Cliente |
| Órdenes nuevas | Cliente (sube archivos) | Local (aparece en Kanban) + Admin (vista global) |
| Actualización de estado de orden | Local (mueve en Kanban) | Cliente (ve en tiempo real) + Admin (vista global) |
| Puntos acreditados | Sistema (al entregar una orden) | Cliente (ve en dashboard e historial) + Admin (KPI) |
| Tickets de soporte | Cualquiera | Destinatario correspondiente |
| Precios globales | Admin (mantenimiento) | Local (si no tiene precios propios) + Cliente (al calcular el precio de su orden) |
| Precios del local | Local (si tiene permiso) | Cliente (al seleccionar ese local para su orden) |

---

## Notas finales para Antigravity

- **El login y el sistema de sesiones ya funciona. No lo toques.**
- Cada panel solo puede ver sus propios datos (el cliente no ve órdenes de otros clientes, el local solo ve órdenes de su sucursal, etc.)
- El **tiempo real** (que las cosas aparezcan sin recargar la página) es importante en: la lista de órdenes del local (nuevas órdenes), el estado de las órdenes del cliente, y los chats de soporte.
- El **heartbeat del local** es un proceso silencioso que corre en segundo plano: cada 3 minutos actualiza la "última actividad" del local. Si la pestaña se oculta, se pausa. Si vuelve, se reanuda. El admin y los clientes usan ese dato para saber si el local está conectado.
- Las **notificaciones sonoras** en los chats son un toque de usabilidad: cuando llega un mensaje nuevo en un ticket abierto, suena un tono corto.
