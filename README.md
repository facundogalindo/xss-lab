# Laboratorio XSS: ataque y defensa

Trabajo Práctico Integrador de Seguridad en el Desarrollo de Software (SDS), curso 4K2A, 2026. Es un laboratorio guiado para observar un XSS reflejado por GET y comparar una política CSP con la codificación segura de salida HTML.

> **Uso educativo y local únicamente.** El primer y segundo escenarios reflejan entrada sin codificar intencionalmente. La aplicación solo escucha en `127.0.0.1`; no la despliegues ni la expongas en una red pública.

## Requisitos

- Node.js 24 LTS (24.11.0 o posterior dentro de la línea 24) y npm.
- Chromium de Playwright para ejecutar las pruebas de navegador.
- No requiere base de datos, Docker, credenciales ni conexión a servicios externos para ejecutar el laboratorio.

## Instalación y arranque

Desde la raíz del repositorio:

```sh
npm install
npm run dev
```

La interfaz queda en <http://127.0.0.1:5173> y Express en <http://127.0.0.1:3001>. Si alguno de esos puertos está ocupado, el proceso informa el error y no cambia de puerto.

También se pueden ejecutar por separado, cada comando en una terminal:

```sh
npm run dev:backend
npm run dev:frontend
```

En PowerShell, si la política local impide ejecutar `npm.ps1`, usá el lanzador incluido con Node:

```powershell
npm.cmd install
npm.cmd run dev
```

## Los tres escenarios

1. **Vulnerable** (`GET /lab/vulnerable?mensaje=...`): el valor se refleja directamente en el cuerpo HTML y no se envía CSP. Esta interpolación insegura existe únicamente para mostrar el problema.
2. **Protección CSP** (`GET /lab/csp?mensaje=...`): conserva la misma reflexión insegura. La cabecera aplicada por el servidor es `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'`. El navegador bloquea el script en línea, pero el HTML malicioso sigue presente; CSP mitiga este caso y no corrige la salida vulnerable.
3. **Código seguro + CSP** (`GET /lab/secure?mensaje=...`): codifica el mensaje para contexto de texto con `escape-html` y conserva la misma CSP como defensa adicional. El marcado se muestra como texto y no crea un elemento ejecutable.

El botón **Poner payload XSS en mensaje** carga el mismo texto de prueba visual en el campo, desde cualquiera de las pestañas. Después pulsá **Ejecutar prueba**. Al cambiar de escenario, el mensaje se conserva y se solicita el endpoint correspondiente. En el vulnerable, el manejador modifica el DOM del iframe y muestra una pantalla roja **PÁGINA ALTERADA**; CSP lo bloquea y el código seguro lo presenta como texto. No accede a cookies ni almacenamiento y no se conecta a servicios externos.

Los pasos para revisar URL, método, parámetro, respuesta y cabeceras en DevTools están en [la guía de exposición](docs/guia-exposicion.md#inspección-de-solicitudes-en-devtools).

React construye la URL desde una lista fija de endpoints locales y codifica `mensaje` con `URLSearchParams`. Express interpreta esa codificación de transporte; en el escenario seguro aplica además escape HTML para el contexto de salida. El documento que se ve es la respuesta HTML real de Express, cargada en un iframe con `sandbox="allow-scripts allow-modals"` en los tres escenarios y sin `allow-same-origin`.

## Pruebas

Pruebas HTTP del backend con Node.js Test Runner:

```sh
npm run test:backend
```

Instalá Chromium de Playwright una vez:

```sh
npx playwright install chromium
```

O usá el atajo:

```sh
npm run install:chromium
```

Pruebas E2E en Chromium. Playwright inicia los dos servidores en los puertos acordados y falla si ya están ocupados:

```sh
npm run test:e2e
```

Las tres pruebas principales comprueban el diálogo vulnerable, la violación CSP real y el texto seguro. Una cuarta prueba verifica que el botón carga el payload desde distintos escenarios y que el texto se conserva al cambiar de pestaña.

## Estructura

```text
backend/src/app.js          aplicación Express testeable, sin abrir puertos al importar
backend/src/server.js       servidor local 127.0.0.1:3001
frontend/src/               interfaz React y estilos
frontend/vite.config.js     Vite en 127.0.0.1:5173 con puerto estricto
tests/backend.test.js       pruebas HTTP del servidor
tests/e2e/lab.spec.js       pruebas de escenarios y carga del payload en Chromium
docs/informe-tecnico.md     informe académico
docs/guia-exposicion.md     guion de exposición y DevTools
docs/evidencias/            destino de capturas y registros auténticos
```

## Solución de problemas

- **Puerto ocupado:** cerrá el proceso que usa `3001` o `5173` y volvé a ejecutar. La aplicación no busca otro puerto.
- **Playwright no encuentra Chromium:** ejecutá `npx playwright install chromium`. Si el sistema no tiene dependencias del navegador, consultá la guía de instalación de Playwright para tu plataforma.
- **Diálogo abierto durante una prueba manual:** aceptalo o cerralo desde el navegador. El ejemplo de diálogo también se usa en la prueba E2E.
- **PowerShell bloquea `npm`:** ejecutá `npm.cmd` como se muestra arriba.
- **No se ve la alerta en CSP:** verificá que estás en la pestaña CSP, abrí DevTools → Network, seleccioná la solicitud `/lab/csp` y comprobá la cabecera `Content-Security-Policy`; revisá Console para el bloqueo de `script-src`.

## Dependencias principales

- `express`: endpoints HTTP locales.
- `escape-html`: codificación de salida del escenario seguro.
- `react`, `react-dom` y `vite`: interfaz y servidor de desarrollo.
- `@playwright/test`: pruebas reales en Chromium.
- `concurrently`: arranque coordinado de frontend y backend en Windows y otros sistemas.

El lockfile de npm en la raíz registra las versiones resueltas por la instalación.
