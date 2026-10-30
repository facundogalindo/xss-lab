import { useState } from 'react';

const API_BASE = 'http://127.0.0.1:3001';
const DEFAULT_MESSAGE = 'Hola, UTN.';
const VISUAL_XSS = `<img src=x onerror="document.body.style.cssText='margin:0;background:#170b0d;color:#fff;font-family:Arial,sans-serif';const panel=document.createElement('main');panel.id='xss-proof';panel.style.cssText='min-height:100vh;display:grid;align-content:center;gap:18px;padding:28px;background:radial-gradient(circle at top,#5b1820,#170b0d 70%)';const badge=document.createElement('p');badge.textContent='⚠ PRUEBA XSS · SOLO EN ESTE IFRAME';badge.style.cssText='margin:0;color:#ffb4ae;font-weight:bold;letter-spacing:.12em';const title=document.createElement('h1');title.textContent='PÁGINA ALTERADA';title.style.cssText='margin:0;color:#fff;font-size:clamp(30px,8vw,64px);line-height:1';const detail=document.createElement('p');detail.textContent='Un payload reflejado ejecutó JavaScript y modificó este documento.';detail.style.cssText='max-width:32rem;margin:0;color:#ffe4e1;font-size:18px;line-height:1.5';const proof=document.createElement('pre');proof.textContent='onerror → JavaScript → DOM modificado';proof.style.cssText='margin:0;padding:12px;border:1px solid #ff716d;border-radius:8px;color:#ffc7c1;white-space:pre-wrap';const note=document.createElement('p');note.textContent='No se accedió a datos ni se hicieron conexiones externas.';note.style.cssText='margin:0;color:#e8bdc0;font-size:13px';panel.append(badge,title,detail,proof,note);document.body.replaceChildren(panel);this.remove()">`;

const SCENARIOS = {
  vulnerable: {
    label: '1. Vulnerable',
    shortLabel: 'Vulnerable',
    endpoint: 'vulnerable',
    className: 'vulnerable',
    objective: 'Observar cómo una entrada reflejada sin codificación puede convertirse en HTML y ejecutar JavaScript.',
    protection: 'No hay una CSP restrictiva y el servidor inserta el mensaje directamente en el cuerpo HTML.',
    expected: 'El diálogo abre una alerta; la prueba visual agrega un aviso dentro del documento del laboratorio.',
    csp: 'Este endpoint no envía una política CSP.',
  },
  csp: {
    label: '2. Protección CSP',
    shortLabel: 'CSP activa',
    endpoint: 'csp',
    className: 'csp',
    objective: 'Mantener la reflexión insegura y observar cómo la política bloquea scripts en línea.',
    protection: 'CSP aplicada por cabecera HTTP. La entrada continúa dentro del HTML como marcado.',
    expected: 'El navegador registra una violación CSP y bloquea el script o manejador en línea.',
    csp: "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'",
  },
  secure: {
    label: '3. Código seguro + CSP',
    shortLabel: 'Código seguro',
    endpoint: 'secure',
    className: 'secure',
    objective: 'Mostrar el mismo mensaje como texto mediante codificación de salida y conservar CSP como defensa adicional.',
    protection: 'escape-html codifica caracteres especiales en contexto de texto; también se envía la misma CSP.',
    expected: 'El marcado de prueba se ve como texto y no crea nodos activos.',
    csp: "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'",
  },
};

function buildFrameUrl(endpoint, message) {
  const query = new URLSearchParams();
  query.set('mensaje', message);
  return `${API_BASE}/lab/${endpoint}?${query.toString()}`;
}

export default function App() {
  const [activeScenario, setActiveScenario] = useState('vulnerable');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [runNumber, setRunNumber] = useState(0);
  const scenario = SCENARIOS[activeScenario];
  const frameUrl = buildFrameUrl(scenario.endpoint, message);

  function runTest(event) {
    event.preventDefault();
    setRunNumber((current) => current + 1);
  }

  function selectScenario(id) {
    setActiveScenario(id);
    setRunNumber((current) => current + 1);
  }

  function loadXssPayload() {
    setMessage(VISUAL_XSS);
  }

  return (
    <main className="page-shell">
      <header className="site-header">
        <div className="header-mark" aria-hidden="true">SDS</div>
        <div>
          <p className="eyebrow">Trabajo Práctico Integrador</p>
          <h1>Laboratorio XSS: ataque y defensa</h1>
          <p className="subtitle">Seguridad en el Desarrollo de Software <span>·</span> 4K2A <span>·</span> 2026</p>
        </div>
      </header>

      <section className="warning" aria-label="Advertencia de uso">
        <span className="warning-icon" aria-hidden="true">!</span>
        <p><strong>Laboratorio educativo local.</strong> Incluye una vulnerabilidad intencional para demostración. No desplegar públicamente.</p>
      </section>

      <section className="lab-card" aria-label="Laboratorio guiado">
        <div className="tabs" role="tablist" aria-label="Escenarios del laboratorio">
          {Object.entries(SCENARIOS).map(([id, item]) => (
            <button
              className={`tab ${item.className} ${activeScenario === id ? 'active' : ''}`}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={activeScenario === id}
              aria-controls="scenario-panel"
              key={id}
              onClick={() => selectScenario(id)}
            >
              <span className="tab-number">{item.label.slice(0, 1)}</span>
              {item.label.slice(3)}
            </button>
          ))}
        </div>

        <section id="scenario-panel" role="tabpanel" aria-labelledby={`tab-${activeScenario}`} className={`scenario-panel ${scenario.className}`}>
          <div className="scenario-heading">
            <div>
              <p className="eyebrow">Escenario actual</p>
              <h2>{scenario.shortLabel}</h2>
            </div>
            <span className={`status-pill ${scenario.className}`}>{activeScenario === 'vulnerable' ? 'Sin defensa' : activeScenario === 'csp' ? 'CSP aplicada' : 'Escape + CSP'}</span>
          </div>
          <div className="explanation-grid">
            <article>
              <h3>Objetivo</h3>
              <p>{scenario.objective}</p>
            </article>
            <article>
              <h3>Protección activa</h3>
              <p>{scenario.protection}</p>
            </article>
            <article>
              <h3>Qué observar</h3>
              <p>{scenario.expected}</p>
            </article>
          </div>
        </section>

        <form className="input-section" onSubmit={runTest}>
          <label htmlFor="message-input">Mensaje de prueba</label>
          <textarea
            id="message-input"
            name="mensaje"
            rows="3"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            spellCheck="false"
          />
          <div className="actions-row">
            <button className="primary-button" type="submit">Ejecutar prueba</button>
            <button className="secondary-button" type="button" onClick={loadXssPayload}>Poner payload XSS en mensaje</button>
            <span className="action-hint">Carga el mismo texto en cualquier escenario; luego ejecutá la prueba.</span>
          </div>
        </form>

        <section className="response-section" aria-label="Respuesta HTML del servidor">
          <div className="response-title">
            <div>
              <p className="eyebrow">Documento real servido por Express</p>
              <h2>Vista de respuesta</h2>
            </div>
            <span className="method-badge">GET</span>
          </div>
          <iframe
            key={`${activeScenario}-${runNumber}`}
            data-testid="lab-frame"
            title={`Respuesta del escenario ${scenario.shortLabel}`}
            src={frameUrl}
            sandbox="allow-scripts allow-modals"
          />
          <p className="frame-note">El documento se ejecuta aislado. La aplicación no lee su DOM ni interpreta el mensaje.</p>
        </section>

        <aside className="inspection-panel" aria-label="Datos para inspección">
          <div className="inspection-copy">
            <p className="eyebrow">Inspección técnica</p>
            <h2>Comprobá la respuesta en DevTools</h2>
            <p>Abrí Network, seleccioná el documento <code>/lab/{scenario.endpoint}</code> y revisá Response Headers. En Console, buscá la violación CSP al probar el diálogo o la demo visual.</p>
          </div>
          <dl className="request-details">
            <div><dt>URL solicitada</dt><dd><code>{frameUrl}</code></dd></div>
            <div><dt>Método</dt><dd>GET</dd></div>
            <div><dt>Parámetro</dt><dd><code>mensaje</code> (codificado en URL)</dd></div>
            <div><dt>Content-Security-Policy</dt><dd><code>{scenario.csp}</code></dd></div>
          </dl>
        </aside>
      </section>

      <footer className="site-footer">
        <span>UTN · Facultad Regional Córdoba</span>
        <span>Demostración limitada a 127.0.0.1</span>
      </footer>
    </main>
  );
}
