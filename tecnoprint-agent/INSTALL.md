# TecnoPrint Agent — Guía de instalación en el local

## Requisitos
- Windows 10/11
- Node.js 18+ instalado (para configurar) — después el .exe no lo necesita
- Impresora conectada y con driver instalado
- Acceso a internet (para comunicarse con Appwrite)

---

## Paso 1 — Descargar SumatraPDF portable

1. Ir a: https://www.sumatrapdfreader.org/download-free-pdf-viewer
2. Descargar la versión **portable (64-bit)**
3. Renombrar el archivo a `SumatraPDF.exe`
4. Colocarlo en la carpeta `tecnoprint-agent\` (junto a package.json)

---

## Paso 2 — Instalar dependencias

```cmd
cd C:\PuntotwAW\tecnoprint-agent
npm install
```

---

## Paso 3 — Agregar campo print_status a Appwrite

```cmd
node add-print-status.js
```

---

## Paso 4 — Configurar el .env

1. Copiar `.env.example` como `.env` en la misma carpeta
2. Completar los campos:

### Obtener nombres de impresoras (ejecutar en PowerShell):
```powershell
Get-Printer | Select-Object Name
```

### Obtener el LOCATION_ID:
- Ir a la consola de Appwrite
- Base de datos `main_db` → colección `printing_locations`
- Copiar el `$id` de la sucursal que corresponde a este local

### Ejemplo de .env completo:
```
APPWRITE_ENDPOINT=https://appwrite.tecnowork.mywire.org/v1
APPWRITE_PROJECT_ID=69aed0bd000df45ebd3a
APPWRITE_API_KEY=standard_665...
APPWRITE_DATABASE_ID=main_db

LOCATION_ID=abc123def456

PRINTER_BN=RICOH MP 3710
PRINTER_COLOR=HP OfficeJet Pro 7740
PRINTER_FOTO=Canon PIXMA G1100

POLL_INTERVAL_SECONDS=10
TEMP_DIR=C:\Windows\Temp\tecnoprint
```

---

## Paso 5 — Probar manualmente (opcional)

```cmd
node src/index.js
```

El agente mostrará los logs en consola. Crear una orden de prueba en
el sistema y moverla a "En Proceso" para ver si imprime.

---

## Paso 6 — Instalar como servicio de Windows (producción)

Abrir **CMD como Administrador**:

```cmd
cd C:\PuntotwAW\tecnoprint-agent
node src/service-install.js
```

El servicio queda instalado y:
- Arranca automáticamente con Windows
- Corre invisible en segundo plano
- El encargado no necesita hacer nada

### Verificar que está corriendo:
- Abrir **Servicios** (services.msc)
- Buscar **"TecnoPrint Agent"** → Estado: En ejecución

### Ver logs:
```
C:\PuntotwAW\tecnoprint-agent\logs\tecnoprint.log
```

### Detener o reiniciar:
```cmd
net stop "TecnoPrint Agent"
net start "TecnoPrint Agent"
```

### Desinstalar:
```cmd
node src/service-uninstall.js
```

---

## Cómo funciona el flujo completo

```
1. Cliente hace pedido en la web → order.status = "pendiente"
2. Encargado ve la orden en el kanban
3. Encargado arrastra la orden a "En Proceso"
   → order.status = "en_proceso", print_status = "pending"
4. TecnoPrint Agent detecta la orden (polling cada 10s)
5. Marca print_status = "printing" (no la procesa dos veces)
6. Descarga archivos a C:\Windows\Temp\tecnoprint\{orderId}\
   (carpeta invisible para el encargado — es del sistema)
7. Imprime silenciosamente con SumatraPDF
   (sin diálogo, sin abrir ventanas)
8. BORRA inmediatamente los archivos temporales
9. Actualiza: print_status = "printed", status = "listo"
10. El kanban del local se actualiza automáticamente
11. El encargado ve "Listo" y llama al cliente
```

## Seguridad

- Los archivos NUNCA se abren en ningún visor — van directo al spooler
- La descarga usa API Key del servidor, no credenciales del encargado
- Los temporales se borran antes de marcar la orden como lista
- El encargado no tiene acceso a `C:\Windows\Temp` (permisos del sistema)
- El servicio corre como cuenta de sistema, no como usuario del local

---

## Solución de problemas

### "SumatraPDF.exe no encontrado"
→ Colocar SumatraPDF.exe en la carpeta tecnoprint-agent\

### "No hay impresoras configuradas"
→ Ejecutar `Get-Printer | Select-Object Name` y copiar el nombre exacto al .env

### "HTTP 401 al descargar"
→ Verificar que APPWRITE_API_KEY en .env es correcta y tiene permisos de storage

### Las órdenes no aparecen
→ Verificar que LOCATION_ID coincide con el $id de la sucursal en Appwrite
→ Ver logs en `logs/tecnoprint.log`

### El servicio no inicia
→ Abrir Event Viewer → Windows Logs → Application → buscar "TecnoPrint"
