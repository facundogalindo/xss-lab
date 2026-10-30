import { expect, test } from '@playwright/test';

const XSS_DIALOG = "<script>alert('XSS')</script>";
const VISUAL_XSS = `<img src=x onerror="document.body.style.backgroundColor='#fff3b0'; const aviso=document.createElement('p'); aviso.id='xss-proof'; aviso.textContent='INYECCIÓN XSS EJECUTADA'; aviso.style.cssText='padding:12px;color:#7a3d00;font-size:20px;font-weight:bold'; document.body.append(aviso); this.remove()">`;
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

test('la demostración guiada inyecta un aviso y recorre CSP y código seguro con el mismo mensaje', async ({ page }) => {
  await page.goto('/');
  const messageInput = page.getByLabel('Mensaje de prueba');
  const frame = page.frameLocator('[data-testid="lab-frame"]');
  const cspViolation = page.waitForEvent('console', {
    predicate: (entry) => entry.type() === 'error'
      && /content security policy/i.test(entry.text())
      && /script-src/i.test(entry.text()),
    timeout: 18_000,
  });

  await page.getByTestId('guided-demo-button').click();
  await expect(messageInput).toHaveValue(VISUAL_XSS);
  await expect(frame.locator('#xss-proof')).toHaveText('INYECCIÓN XSS EJECUTADA', { timeout: 12_000 });

  const cspTab = page.getByRole('tab', { name: 'Protección CSP' });
  await expect(cspTab).toHaveAttribute('aria-selected', 'true', { timeout: 12_000 });
  await cspViolation;
  await expect(frame.locator('#xss-proof')).toHaveCount(0);

  const secureTab = page.getByRole('tab', { name: 'Código seguro + CSP' });
  await expect(secureTab).toHaveAttribute('aria-selected', 'true', { timeout: 12_000 });
  await expect(frame.locator('#message')).toHaveText(VISUAL_XSS);
  await expect(frame.locator('#message img')).toHaveCount(0);
});
