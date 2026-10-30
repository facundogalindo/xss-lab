# Guía breve de exposición

**Duración orientativa:** 7 minutos.
**Objetivo:** mostrar el mismo XSS reflejado en tres respuestas reales de Express y comparar CSP con escape HTML.

## Preparación antes de exponer

1. Instalar dependencias con `npm install`.
2. Instalar Chromium si se van a mostrar las pruebas: `npx playwright install chromium`.
3. Iniciar `npm run dev` y abrir `http://127.0.0.1:5173`.
4. Abrir DevTools (F12), activar **Network**, marcar **Preserve log** y tener visible **Console**.
5. Confirmar que la demostración usa `127.0.0.1`; no exponer los puertos a una red.

## Secuencia sugerida

### 0:00–0:45 · Contexto

Presentar el objetivo: un parámetro GET vuelve dentro de HTML y comparar una respuesta vulnerable, la mitigación CSP y la salida codificada. Aclarar que la vulnerabilidad de las dos primeras pestañas es intencional y local.

### 0:45–2:15 · Iniciar la demostración automática

1. Pulsar **Iniciar demostración guiada**. No hace falta escribir ni pegar un payload: el campo se completa solo con una prueba visual inofensiva.
2. En la primera etapa, señalar la pantalla roja **PÁGINA ALTERADA** que el payload genera dentro del iframe. El panel explica que el código cambió el DOM.
3. En Network, seleccionar `lab/vulnerable`. Mostrar el GET, el parámetro `mensaje`, la respuesta con `<img ... onerror=...>` y la ausencia de `Content-Security-Policy`.
4. La interfaz avanza por sí sola cada siete segundos. Si hace falta más tiempo para explicar, pulsar **Detener demostración**; el mensaje queda cargado y se puede continuar cambiando las pestañas manualmente.

### 2:15–4:00 · Mitigación CSP

1. En la segunda etapa automática, la pantalla roja ya no aparece: CSP bloquea el manejador en línea.
2. En Console, señalar el mensaje de violación CSP. En Network, seleccionar `/lab/csp` y mostrar la cabecera exacta: `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'`.
3. En Response, mostrar que la etiqueta `img` con `onerror` sigue presente. Explicar que el navegador bloquea su ejecución, pero la salida continúa vulnerable.

### 4:00–5:30 · Código seguro + CSP

1. En la tercera etapa, el payload se ve como texto literal dentro del iframe y no reemplaza el documento ni crea un elemento `img`.
2. Mostrar la cabecera CSP que se conserva y la respuesta HTML con los caracteres codificados como entidades.
3. Explicar que Express usa `escape-html` para el contexto de texto. La serialización de URL del frontend y el escape HTML del servidor resuelven problemas distintos.

### 5:30–6:15 · Aislamiento y límites

Mostrar que las tres pestañas usan `sandbox="allow-scripts allow-modals"`, sin `allow-same-origin`. El documento no comparte su origen con React. Aclarar que la pantalla inyectada solo cambia el documento del iframe y que el laboratorio no lee cookies ni hace solicitudes externas.

### 6:15–7:00 · Cierre

Concluir: escape contextual de salida corrige el problema observado; CSP aporta defensa adicional y no debe presentarse como garantía contra todo XSS. Indicar que las pruebas automatizadas reproducen las tres observaciones en Chromium.

## Preguntas técnicas posibles

- **¿Por qué codificar si ya hay CSP?** La respuesta CSP conserva marcado no confiable. El escape evita que el navegador lo interprete como HTML en este contexto; CSP queda como capa adicional.
- **¿`encodeURIComponent` alcanza?** No. Codificar el parámetro protege la estructura de la URL; al procesar la respuesta HTML se necesita codificación apropiada para el contexto HTML.
- **¿Por qué no se lee el iframe desde React?** `sandbox` sin `allow-same-origin` asigna un origen opaco. La prueba se valida con observaciones del navegador y pruebas Playwright, no con acceso DOM desde la app.
- **¿CSP evita cualquier XSS?** No. La política configurada bloquea los scripts en línea de esta demostración; CSP es defensa en profundidad y su eficacia depende de la política completa y de la aplicación.
- **¿El límite de 2000 bytes es la defensa?** No. Es una restricción de tamaño para solicitudes; no codifica ni neutraliza HTML.
