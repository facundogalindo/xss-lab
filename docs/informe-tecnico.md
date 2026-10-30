# Universidad Tecnológica Nacional
## Facultad Regional Córdoba

**Seguridad en el Desarrollo de Software (SDS)**<br>
**Trabajo Práctico Integrador — Laboratorio XSS: ataque y defensa**<br>
**Curso:** 4K2A · **Año:** 2026

### Integrantes

- Galindo, Facundo Daniel — 80835
- Noto, Claudia Carina — 95215
- Tissera, Luciano — 99236
- Zin, Cecilia Belén — 97924
- Müller, Vincent Alessio — 401842

---

## 1. Introducción

Cross-Site Scripting (XSS) es una clase de vulnerabilidad en la que una aplicación incluye datos no confiables en un documento interpretado por el navegador sin neutralizarlos para el contexto de salida. En un XSS reflejado, el valor suele llegar en una solicitud —por ejemplo, mediante un parámetro GET— y vuelve en la respuesta que procesa el navegador. Si el valor se interpreta como marcado o código, puede alterar la página y ejecutar instrucciones en su contexto.

Este laboratorio reproduce de forma local un caso mínimo: un endpoint recibe `mensaje` y genera un documento HTML. La vulnerabilidad se mantiene deliberadamente en los escenarios 1 y 2 para comparar la ejecución sin defensa con la mitigación mediante CSP. El escenario 3 corrige la interpolación mediante escape de HTML en contexto de texto.

> El laboratorio contiene una vulnerabilidad intencional. Está limitado a loopback y su uso previsto es educativo; no se debe desplegar públicamente.

## 2. Arquitectura

El repositorio usa npm workspaces con dos paquetes. React y Vite sirven la interfaz en `127.0.0.1:5173`. Express responde en `127.0.0.1:3001` con documentos HTML completos. React fija el host y las rutas posibles y serializa el mensaje con `URLSearchParams`; el iframe navega directamente a la respuesta de Express.

El iframe conserva en todos los escenarios el mismo sandbox: `allow-scripts allow-modals`, sin `allow-same-origin`. Por ello, su documento tiene un origen opaco. La interfaz no inspecciona el DOM del iframe ni necesita que `self` habilite recursos del backend. Los documentos no dependen de scripts ni recursos externos.

Express no inicia el puerto al importar `app.js`, de modo que las pruebas pueden montar la aplicación en un puerto efímero de loopback. El proceso normal escucha exclusivamente en `127.0.0.1:3001`, informa un error claro ante un conflicto de puerto y no cambia silenciosamente de puerto.

## 3. Procedimiento de ataque controlado

En la pestaña **Vulnerable**, se selecciona la prueba de diálogo y se ejecuta. El frontend envía el texto como el parámetro URL `mensaje`; el servidor lo inserta sin codificación en el nodo de texto fijo del documento. Como el navegador interpreta la respuesta como HTML, la etiqueta `script` puede ejecutarse dentro del iframe. El sandbox permite scripts y diálogos para que la observación sea real, pero no otorga origen compartido, formularios, ventanas emergentes ni navegación del documento superior.

El ejemplo visual usa un manejador `onerror` sobre una imagen inválida y reemplaza el contenido del documento aislado por una pantalla roja **PÁGINA ALTERADA**, junto con una explicación del cambio en el DOM. La interfaz puede recorrer automáticamente los tres endpoints con el mismo payload visual, manteniendo cada etapa visible durante siete segundos. Los payloads no leen cookies ni almacenamiento y no realizan conexiones de red externa.

## 4. Defensa mediante CSP

La pestaña **Protección CSP** mantiene la interpolación directa y agrega la cabecera HTTP aplicada:

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'
```

No hay `unsafe-inline`, nonce ni hash que autoricen el payload. El navegador bloquea el script en línea y registra una violación de `script-src`. Sin embargo, la respuesta todavía contiene el marcado de entrada. Por esa razón, el escenario demuestra una mitigación en el navegador y no una corrección de la salida vulnerable. CSP reduce el impacto de ciertos casos, pero no detiene todos los XSS posibles.

## 5. Corrección por codificación de salida

La pestaña **Código seguro + CSP** usa la dependencia `escape-html` para codificar caracteres especiales antes de insertarlos en el contexto de texto. Por ejemplo, los signos menor y mayor se convierten en entidades HTML; el navegador presenta el contenido como texto en vez de crear el nodo `script`. La política CSP se conserva como defensa adicional.

La codificación de URL en React protege la estructura de la solicitud y permite transportar el valor en un parámetro. No reemplaza la codificación HTML contextual que Express debe aplicar al construir la respuesta.

## 6. Comparación de escenarios

| Escenario | Reflexión del servidor | CSP aplicada | Resultado esperado |
|---|---|---|---|
| Vulnerable | Directa, sin escape | No | El payload en línea se ejecuta dentro del iframe. |
| Protección CSP | Directa, sin escape | Sí | El marcado permanece en la respuesta; el navegador bloquea el script por CSP. |
| Código seguro + CSP | Escape de HTML en contexto de texto | Sí | El payload aparece literalmente y no crea un elemento ejecutable. |

Los tres escenarios reciben el mismo parámetro y utilizan el mismo sandbox. El límite de 2000 bytes reduce solicitudes excesivas, pero no constituye una defensa XSS.

## 7. Validación

Las pruebas de backend usan Node.js Test Runner y verifican el tipo de contenido, la reflexión en los escenarios 1 y 2, la política CSP por endpoint, el escape de caracteres especiales, parámetros ausentes y repetidos, y el límite de entrada. Las pruebas de Playwright en Chromium verifican una ejecución real mediante diálogo, una violación CSP observable y la presentación literal del payload en el escenario seguro.

**Verificación ejecutada el 30 de octubre de 2026:** las cinco pruebas HTTP de Node.js Test Runner pasaron; las cuatro pruebas E2E pasaron en Chromium. Las pruebas cubren el diálogo real vulnerable, la violación CSP observable, la salida codificada y la secuencia automática que reemplaza el documento por una alerta visual únicamente en el primer escenario. El build de producción de Vite también terminó correctamente. No se incluyen capturas ni registros de ejecución como evidencia adjunta. Los comandos reproducibles están en el README (`npm run test:backend`, `npx playwright install chromium`, `npm run test:e2e`).

## 8. Conclusiones

La comparación separa dos controles con objetivos distintos. CSP puede bloquear la ejecución de un script en el navegador y aporta defensa adicional, pero deja los datos maliciosos en la respuesta. La codificación de salida, aplicada según el contexto, evita que el dato se interprete como marcado. El enfoque recomendado para este caso es construir la respuesta con salida codificada y mantener una CSP restrictiva como capa complementaria.

## Referencias técnicas

- [OWASP, Cross Site Scripting Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html).
- [W3C, Content Security Policy Level 3](https://www.w3.org/TR/CSP3/).
- [Express, Application API](https://expressjs.com/en/api.html).
- [Vite, Server Options](https://vite.dev/config/server-options).
- [Playwright, Web Server Configuration](https://playwright.dev/docs/test-webserver).
- [Node.js, Release Schedule](https://nodejs.org/en/about/previous-releases).
