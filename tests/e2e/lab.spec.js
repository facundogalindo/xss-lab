import { expect, test } from '@playwright/test';

const XSS_DIALOG = "<script>alert('XSS')</script>";
const VISUAL_XSS = `<img src=x onerror="document.body.style.cssText='margin:0;background:#170b0d;color:#fff;font-family:Arial,sans-serif';const panel=document.createElement('main');panel.id='xss-proof';panel.style.cssText='min-height:100vh;display:grid;align-content:center;gap:18px;padding:28px;background:radial-gradient(circle at top,#5b1820,#170b0d 70%)';const badge=document.createElement('p');badge.textContent='⚠ PRUEBA XSS · SOLO EN ESTE IFRAME';badge.style.cssText='margin:0;color:#ffb4ae;font-weight:bold;letter-spacing:.12em';const title=document.createElement('h1');title.textContent='PÁGINA ALTERADA';title.style.cssText='margin:0;color:#fff;font-size:clamp(30px,8vw,64px);line-height:1';const detail=document.createElement('p');detail.textContent='Un payload reflejado ejecutó JavaScript y modificó este documento.';detail.style.cssText='max-width:32rem;margin:0;color:#ffe4e1;font-size:18px;line-height:1.5';const proof=document.createElement('pre');proof.textContent='onerror → JavaScript → DOM modificado';proof.style.cssText='margin:0;padding:12px;border:1px solid #ff716d;border-radius:8px;color:#ffc7c1;white-space:pre-wrap';const note=document.createElement('p');note.textContent='No se accedió a datos ni se hicieron conexiones externas.';note.style.cssText='margin:0;color:#e8bdc0;font-size:13px';panel.append(badge,title,detail,proof,note);document.body.replaceChildren(panel);this.remove()">`;
const FRAME_SANDBOX = 'allow-scripts allow-modals';
const CSP = "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'";

async function preparePayload(page) {
  await page.goto('/');
  await page.getByLabel('Mensaje de prueba').fill(XSS_DIALOG);
  await expect(page.getByTestId('lab-frame')).toHaveAttribute('sandbox', FRAME_SANDBOX);
}

function responseForScenario(page, endpoint) {
  return page.waitForResponse((response) => new URL(response.url()).pathname === `/lab/${endpoint}`);
}

test('vulnerable: el JavaScript reflejado abre un diálogo real dentro del iframe', async ({ page }) => {
  await preparePayload(page);

  let dialogSeen = false;
  page.on('dialog', async (dialog) => {
    dialogSeen = true;
    expect(dialog.message()).toBe('XSS');
    await dialog.accept();
  });

  const responsePromise = responseForScenario(page, 'vulnerable');
  await page.getByRole('button', { name: 'Ejecutar prueba' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  await expect.poll(() => dialogSeen).toBe(true);
  expect((await response.allHeaders())['content-security-policy']).toBeUndefined();
});

test('CSP: el mismo script es bloqueado y genera una violación verificable', async ({ page }) => {
  await preparePayload(page);
  let dialogSeen = false;
  page.on('dialog', async (dialog) => {
    dialogSeen = true;
    await dialog.accept();
  });
  const cspViolation = page.waitForEvent('console', {
    predicate: (message) => message.type() === 'error'
      && /content security policy/i.test(message.text())
      && /script-src/i.test(message.text()),
  });

  const responsePromise = responseForScenario(page, 'csp');
  await page.getByRole('tab', { name: 'Protección CSP' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect((await response.allHeaders())['content-security-policy']).toBe(CSP);
  await cspViolation;
  expect(await page.getByTestId('lab-frame').getAttribute('sandbox')).toBe(FRAME_SANDBOX);
  expect(dialogSeen).toBe(false);
});

test('seguro: el payload aparece como texto, sin nodo script ni ejecución, y conserva CSP', async ({ page }) => {
  await preparePayload(page);
  let dialogSeen = false;
  page.on('dialog', async (dialog) => {
    dialogSeen = true;
    await dialog.accept();
  });

  const responsePromise = responseForScenario(page, 'secure');
  await page.getByRole('tab', { name: 'Código seguro + CSP' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  expect((await response.allHeaders())['content-security-policy']).toBe(CSP);

  const frame = page.frameLocator('[data-testid="lab-frame"]');
  await expect(frame.locator('#message')).toHaveText(XSS_DIALOG);
  await expect(frame.locator('#message script')).toHaveCount(0);
  expect(await page.getByTestId('lab-frame').getAttribute('sandbox')).toBe(FRAME_SANDBOX);
  expect(dialogSeen).toBe(false);
});

test('el botón carga el mismo payload desde cualquier escenario y se conserva al cambiar de pestaña', async ({ page }) => {
  await page.goto('/');
  const messageInput = page.getByLabel('Mensaje de prueba');
  const frame = page.frameLocator('[data-testid="lab-frame"]');
  const loadPayload = page.getByRole('button', { name: 'Poner payload XSS en mensaje' });

  await loadPayload.click();
  await expect(messageInput).toHaveValue(VISUAL_XSS);

  const vulnerableResponsePromise = responseForScenario(page, 'vulnerable');
  await page.getByRole('button', { name: 'Ejecutar prueba' }).click();
  expect((await vulnerableResponsePromise).status()).toBe(200);
  await expect(frame.locator('#xss-proof h1')).toHaveText('PÁGINA ALTERADA', { timeout: 12_000 });

  const cspViolation = page.waitForEvent('console', {
    predicate: (entry) => entry.type() === 'error'
      && /content security policy/i.test(entry.text())
      && /script-src/i.test(entry.text()),
    timeout: 18_000,
  });

  const cspTab = page.getByRole('tab', { name: 'Protección CSP' });
  const cspResponsePromise = responseForScenario(page, 'csp');
  await cspTab.click();
  await expect(cspTab).toHaveAttribute('aria-selected', 'true');
  const cspResponse = await cspResponsePromise;
  expect((await cspResponse.allHeaders())['content-security-policy']).toBe(CSP);
  await expect(messageInput).toHaveValue(VISUAL_XSS);
  await cspViolation;
  await expect(frame.locator('#xss-proof')).toHaveCount(0);

  await loadPayload.click();
  await expect(messageInput).toHaveValue(VISUAL_XSS);

  const secureTab = page.getByRole('tab', { name: 'Código seguro + CSP' });
  const secureResponsePromise = responseForScenario(page, 'secure');
  await secureTab.click();
  await expect(secureTab).toHaveAttribute('aria-selected', 'true');
  expect((await secureResponsePromise).status()).toBe(200);
  await expect(frame.locator('#message')).toHaveText(VISUAL_XSS);
  await expect(frame.locator('#message img')).toHaveCount(0);
});
