import { sleep } from 'k6';
import { emailA, passA, emailB, passB, login, userJourney } from './lib.js';

// Load test: carga esperada creciente + una sonda del tenant B para medir
// "noisy neighbor" (B no debe degradarse mientras A está a plena carga).
// Umbrales: falla si p95 > 500ms o error rate > 1%.
export const options = {
  scenarios: {
    tenant_a: {
      executor: 'ramping-vus',
      exec: 'runA',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
    tenant_b_probe: {
      executor: 'constant-vus',
      exec: 'runB',
      vus: 1,
      duration: '6m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export function runA() {
  const token = login(emailA(), passA());
  userJourney(token);
  sleep(1);
}

export function runB() {
  const token = login(emailB(), passB());
  userJourney(token);
  sleep(1);
}
