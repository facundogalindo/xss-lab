import express from 'express';
import escapeHtml from 'escape-html';

export const MESSAGE_LIMIT_BYTES = 2000;
export const LAB_CSP = "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'";

const DOCUMENT_START = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Respuesta del laboratorio XSS</title>
</head>
<body>
  <main>
    <p>Documento HTML servido por Express</p>
    <h1>Mensaje recibido</h1>
    <p id="message">`;

const DOCUMENT_END = `</p>
  </main>
</body>
</html>`;

function readMessage(request) {
  // URLSearchParams.get toma la primera aparición si el parámetro se repite.
  return new URL(request.originalUrl, 'http://127.0.0.1:3001').searchParams.get('mensaje') ?? '';
}

function htmlDocument(message) {
  return `${DOCUMENT_START}${message}${DOCUMENT_END}`;
}

function sendLabResponse(request, response, { secure, csp }) {
  response.set('Cache-Control', 'no-store');
  response.set('Content-Type', 'text/html; charset=utf-8');
  if (csp) response.set('Content-Security-Policy', LAB_CSP);

  const message = readMessage(request);
  if (Buffer.byteLength(message, 'utf8') > MESSAGE_LIMIT_BYTES) {
    response.status(413).send(htmlDocument('Entrada demasiado larga. Límite: 2000 bytes.'));
    return;
  }

  // La interpolación directa solo existe en los dos escenarios vulnerables del TPI.
  const output = secure ? escapeHtml(message) : message;
  response.status(200).send(htmlDocument(output));
}

export function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.get('/lab/vulnerable', (request, response) => {
    sendLabResponse(request, response, { secure: false, csp: false });
  });

  app.get('/lab/csp', (request, response) => {
    sendLabResponse(request, response, { secure: false, csp: true });
  });

  app.get('/lab/secure', (request, response) => {
    sendLabResponse(request, response, { secure: true, csp: true });
  });

  return app;
}

export const app = createApp();
