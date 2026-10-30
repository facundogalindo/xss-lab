import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { app, LAB_CSP, MESSAGE_LIMIT_BYTES } from '../backend/src/app.js';

let server;
let baseUrl;

before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server?.listening) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function urlFor(endpoint, message) {
  const url = new URL(`/lab/${endpoint}`, baseUrl);
  if (message !== undefined) url.searchParams.set('mensaje', message);
  return url;
}

test('los tres endpoints entregan HTML completo, UTF-8 y sin caché', async () => {
  for (const endpoint of ['vulnerable', 'csp', 'secure']) {
    const response = await fetch(urlFor(endpoint, 'Hola, UTN.'));
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /^text\/html;\s*charset=utf-8$/i);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.match(body, /^<!doctype html>/i);
    assert.match(body, /<p id="message">Hola, UTN\.<\/p>/);
    assert.match(body, /<\/html>$/);
  }
});

test('vulnerable y CSP reflejan sin codificar; la CSP solo está en los endpoints 2 y 3', async () => {
  const payload = "<script>alert('XSS')</script>";
  const vulnerable = await fetch(urlFor('vulnerable', payload));
  const csp = await fetch(urlFor('csp', payload));
  const secure = await fetch(urlFor('secure', payload));

  assert.match(await vulnerable.text(), /<p id="message"><script>alert\('XSS'\)<\/script><\/p>/);
  assert.match(await csp.text(), /<p id="message"><script>alert\('XSS'\)<\/script><\/p>/);
  assert.equal(vulnerable.headers.get('content-security-policy'), null);
  assert.equal(csp.headers.get('content-security-policy'), LAB_CSP);
  assert.equal(secure.headers.get('content-security-policy'), LAB_CSP);
});

test('el endpoint seguro codifica caracteres especiales en contexto de texto', async () => {
  const response = await fetch(urlFor('secure', "<script>alert('XSS') & ok</script>"));
  const body = await response.text();

  assert.match(body, /<p id="message">&lt;script&gt;alert\(&#39;XSS&#39;\) &amp; ok&lt;\/script&gt;<\/p>/);
  assert.doesNotMatch(body, /<p id="message"><script>/);
});

test('un parámetro ausente se trata como texto vacío y los repetidos usan el primero', async () => {
  const absent = await fetch(urlFor('vulnerable'));
  assert.match(await absent.text(), /<p id="message"><\/p>/);

  const repeated = new URL('/lab/vulnerable', baseUrl);
  repeated.searchParams.append('mensaje', 'primero');
  repeated.searchParams.append('mensaje', 'segundo');
  const response = await fetch(repeated);
  const body = await response.text();
  assert.match(body, /<p id="message">primero<\/p>/);
  assert.doesNotMatch(body, /segundo/);
});

test('rechaza entradas que superan el límite UTF-8 sin reflejarlas', async () => {
  const tooLong = await fetch(urlFor('secure', 'á'.repeat(Math.ceil(MESSAGE_LIMIT_BYTES / 2) + 1)));
  const body = await tooLong.text();

  assert.equal(tooLong.status, 413);
  assert.equal(tooLong.headers.get('content-security-policy'), LAB_CSP);
  assert.match(body, /Entrada demasiado larga/);
  assert.doesNotMatch(body, /á/);
});
