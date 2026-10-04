import { sleep } from 'k6';
import { emailA, passA, emailB, passB, login, userJourney } from './lib.js';
import { handleSummary } from './summary.js';
export { handleSummary };

// Spike: pico brusco (de 5 a 500 VUs en 10s) y vuelta a la calma.
// Mide si la app cae, se encola o aguanta el pico, y cuánto tarda en volver.
export const options = {
  scenarios: {
    tenant_a: {
      executor: 'ramping-vus',
      exec: 'runA',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 5 },
        { duration: '10s', target: 500 },
        { duration: '30s', target: 500 },
        { duration: '10s', target: 5 },
        { duration: '2m', target: 5 },
      ],
    },
    tenant_b_probe: {
      executor: 'constant-vus',
      exec: 'runB',
      vus: 1,
      duration: '4m',
    },
  },
  thresholds: {
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
