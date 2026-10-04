import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, emailA, passA, login, authHeaders } from './lib.js';

// Saturación de MySQL A TRAVÉS de la app (sin acceso directo a Cloud SQL):
// cada GET de detalle de producto abre hasta 5 conexiones en paralelo
// (run_parallel) y el listado de mensajes hace 3-4 queries. Muchos VUs
// simultáneos => el pool app->Cloud SQL se agota y aparecen 500/timeouts.
// Mientras corre, mirá el gráfico "Conexiones" de Cloud SQL en la consola
// para ver el techo. Usa el mismo CONCURRENCY_PRODUCT_ID que el test de
// concurrencia.
const PRODUCT_ID = __ENV.CONCURRENCY_PRODUCT_ID || '';

export const options = {
  scenarios: {
    db_pool: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 150 },
        { duration: '1m', target: 200 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  if (!PRODUCT_ID) {
    throw new Error('CONCURRENCY_PRODUCT_ID es obligatorio para el test de saturación de DB');
  }
  const token = login(emailA(), passA());
  const h = authHeaders(token);
  http.get(`${BASE_URL}/api/inventory/products/${PRODUCT_ID}`, { headers: h, tags: { name: 'product_detail' } });
  http.get(`${BASE_URL}/api/mercadolibre/messages`, { headers: h, tags: { name: 'messages' } });
  sleep(0.05);
}
