import { sleep } from 'k6';
import { emailA, passA, emailB, passB, login, userJourney } from './lib.js';
import { handleSummary } from './summary.js';
export { handleSummary };

// Stress: sube hasta romper para encontrar el punto de quiebre.
// Umbrales holgados a propósito: el job da FAIL cuando error rate > 5% o
// p95 > 2s, es decir, en el escalón donde la app ya no da más.
export const options = {
  scenarios: {
    tenant_a: {
      executor: 'ramping-vus',
      exec: 'runA',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 800 },
        { duration: '30s', target: 0 },
      ],
    },
    tenant_b_probe: {
      executor: 'constant-vus',
      exec: 'runB',
      vus: 1,
      duration: '6m30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
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
