import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { app } from './app.js';

export const HOST = '127.0.0.1';
export const PORT = 3001;

export function startServer() {
  const server = createServer(app);
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`No se pudo iniciar el backend: el puerto ${PORT} en ${HOST} ya está ocupado.`);
    } else {
      console.error('No se pudo iniciar el backend:', error.message);
    }
    process.exitCode = 1;
  });

  server.listen(PORT, HOST, () => {
    console.log(`Backend disponible en http://${HOST}:${PORT}`);
  });

  return server;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  startServer();
}
