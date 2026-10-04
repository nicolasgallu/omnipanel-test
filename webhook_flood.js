import http from 'k6/http';
import { BASE_URL } from './lib.js';

// Webhook flood en MODO SEGURO: user_id=0 no existe => el dispatcher responde
// 200 "ignored" ANTES de escribir en `events` y sin encolar handlers, o sea
// SIN llamadas a MercadoLibre. Solo mide la capacidad del endpoint de absorber
// una ráfaga de POSTs (y el lookup de cuenta en MySQL). On por defecto; se
// apaga con ENABLE_WEBHOOK_FLOOD=0.
export const options = {
  scenarios: {
    flood: {
      executor: 'ramping-arrival-rate',
      exec: 'flood',
      timeUnit: '1s',
      preAllocatedVUs: 20,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 300 },
        { duration: '30s', target: 20 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export function flood() {
  const payload = JSON.stringify({
    topic: 'questions',
    user_id: 0,
    resource: '/questions/0',
    _id: `loadtest-${__VU}-${__ITER}-${Date.now()}`,
  });
  http.post(`${BASE_URL}/webhooks/meli`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'webhook_flood' },
  });
}
