# Guía breve de exposición

**Duración orientativa:** 7 minutos.
**Objetivo:** mostrar el mismo XSS reflejado en tres respuestas reales de Express y comparar CSP con escape HTML.

## Preparación antes de exponer

1. Instalar dependencias con `npm install`.
2. Instalar Chromium si se van a mostrar las pruebas: `npx playwright install chromium`.
3. Iniciar `npm run dev` y abrir `http://127.0.0.1:5173`.
4. Abrir DevTools (F12), activar la pestaña **Network** y conservar los registros al cambiar de escenario. Tener también visible **Console**.
5. Confirmar que la demostración usa `127.0.0.1`; no exponer los puertos a una red.

## Secuencia sugerida

### 0:00–0:45 · Contexto

Presentar el objetivo: un parámetro GET vuelve dentro de HTML y comparar una respuesta vulnerable, la mitigación CSP y la salida codificada. Aclarar que la vulnerabilidad de las dos primeras pestañas es intencional y local.

### 0:45–2:15 · Escenario vulnerable

1. En **Vulnerable**, elegir **Prueba de diálogo** y ejecutar.
2. Aceptar el diálogo `XSS`. La alerta ocurre dentro del documento del iframe; no es una simulación de React.
3. En Network, seleccionar la solicitud `lab/vulnerable`. Mostrar el método GET, el parámetro `mensaje`, el tipo `text/html; charset=utf-8` y la respuesta donde el contenido aparece como etiqueta `<script>`.
4. Mostrar que no hay cabecera `Content-Security-Policy` en esta respuesta.

### 2:15–4:00 · Mitigación CSP

1. Cambiar a **Protección CSP**. El mismo mensaje se conserva y se solicita `/lab/csp`.
2. Señalar en Network la cabecera `Content-Security-Policy` exacta: `default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'`.
3. Volver a ejecutar el mismo mensaje. No aparece el diálogo; en Console se observa la violación de `script-src`.
4. En Response, mostrar que el `<script>` sigue presente. Explicar que el navegador bloquea su ejecución, pero la salida todavía es vulnerable.

### 4:00–5:30 · Código seguro + CSP

1. Cambiar a **Código seguro + CSP** y ejecutar la misma entrada.
2. Mostrar la cabecera CSP conservada.
3. En la respuesta o en el iframe, observar que `<script>alert('XSS')</script>` se presenta como texto literal y no hay alerta.
4. Explicar que Express usa `escape-html` para el contexto de texto. La serialización de URL del frontend y el escape HTML del servidor resuelven problemas distintos.

### 5:30–6:15 · Aislamiento y límites

Mostrar que las tres pestañas usan `sandbox="allow-scripts allow-modals"`, sin `allow-same-origin`. El documento no comparte su origen con React. Aclarar que el ejemplo visual solo cambia el propio documento y que el laboratorio no lee cookies ni hace solicitudes externas.

### 6:15–7:00 · Cierre

Concluir: escape contextual de salida corrige el problema observado; CSP aporta defensa adicional y no debe presentarse como garantía contra todo XSS. Indicar que las pruebas automatizadas reproducen las tres observaciones en Chromium.

## Preguntas técnicas posibles

- **¿Por qué codificar si ya hay CSP?** La respuesta CSP conserva marcado no confiable. El escape evita que el navegador lo interprete como HTML en este contexto; CSP queda como capa adicional.
- **¿`encodeURIComponent` alcanza?** No. Codificar el parámetro protege la estructura de la URL; al procesar la respuesta HTML se necesita codificación apropiada para el contexto HTML.
- **¿Por qué no se lee el iframe desde React?** `sandbox` sin `allow-same-origin` asigna un origen opaco. La prueba se valida con observaciones del navegador y pruebas Playwright, no con acceso DOM desde la app.
- **¿CSP evita cualquier XSS?** No. La política configurada bloquea los scripts en línea de esta demostración; CSP es defensa en profundidad y su eficacia depende de la política completa y de la aplicación.
- **¿El límite de 2000 bytes es la defensa?** No. Es una restricción de tamaño para solicitudes; no codifica ni neutraliza HTML.
