import http from 'k6/http';
import { BASE_URL, emailA, passA, emailB, passB, login, authHeaders } from './lib.js';

// Smoke: validación rápida de configuración ANTES de la suite.
// Si la URL, las credenciales o los endpoints principales no andan, el job
// falla acá (rápido) en vez de desperdiciar toda la corrida.
export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const health = http.get(`${BASE_URL}/api/health`);
  if (health.status !== 200) {
    throw new Error(`SMOKE FAIL: /api/health -> ${health.status} (¿BASE_URL correcta?)`);
  }

  const a = login(emailA(), passA());
  const b = login(emailB(), passB());
  if (!a || !b) {
    throw new Error('SMOKE FAIL: login A o B no devolvió token (¿credenciales correctas?)');
  }

  const endpoints = [
    '/api/mercadolibre/messages',
    '/api/inventory/products?page=1&page_size=50',
    '/api/sales/orders?channel=all&page=0&page_size=50',
    '/api/shipments?channel=all&page=0&page_size=50',
  ];
  const h = authHeaders(a);
  for (const ep of endpoints) {
    const r = http.get(`${BASE_URL}${ep}`, { headers: h });
    if (r.status !== 200) {
      throw new Error(`SMOKE FAIL: ${ep} -> ${r.status} (¿el tenant A es rol business? /api/sales/orders da 403 a empleados)`);
    }
  }
  console.log('SMOKE OK: URL, credenciales A/B y endpoints principales funcionan.');
}
