import { sleep } from 'k6';
import { emailA, passA, login, userJourney } from './lib.js';
import { handleSummary } from './summary.js';
export { handleSummary };

// Baseline: comportamiento en reposo (5 VUs x 1m). Es el punto de comparación
// para todos los demás números: si load/stress no se parecen a esto, algo
// degradó.
export const options = {
  scenarios: {
    baseline: {
      executor: 'constant-vus',
      exec: 'runA',
      vus: 5,
      duration: '1m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
};

export function runA() {
  const token = login(emailA(), passA());
  userJourney(token);
  sleep(1);
}
