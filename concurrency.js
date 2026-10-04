import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, emailA, passA, login, authHeaders } from './lib.js';

// Concurrencia sobre EL MISMO recurso: muchos VUs pegan al mismo producto.
// - GET (siempre): mide contención de lectura + pool de conexiones de MySQL.
// - PATCH (opcional, ENABLE_WRITE_CONCURRENCY=1): mide locks de escritura.
//   OJO: el PATCH pisa el precio (100/101). Usá un producto DUMMY dedicado.
const PRODUCT_ID = __ENV.CONCURRENCY_PRODUCT_ID || '';
const DO_WRITE = __ENV.ENABLE_WRITE_CONCURRENCY === '1';

export const options = {
  scenarios: {
    concurrency: {
      executor: 'constant-vus',
      vus: 50,
      duration: '2m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  if (!PRODUCT_ID) {
    throw new Error('CONCURRENCY_PRODUCT_ID es obligatorio para el test de concurrencia');
  }
  const token = login(emailA(), passA());
  const h = authHeaders(token);
  http.get(`${BASE_URL}/api/inventory/products/${PRODUCT_ID}`, { headers: h, tags: { name: 'product_detail' } });
  if (DO_WRITE) {
    const price = (__ITER % 2 === 0) ? 100 : 101;
    http.patch(`${BASE_URL}/api/inventory/products/${PRODUCT_ID}`, JSON.stringify({ price }), { headers: h, tags: { name: 'product_patch' } });
  }
  sleep(0.05);
}
