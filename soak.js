import { sleep } from 'k6';
import { emailA, passA, emailB, passB, login, userJourney } from './lib.js';

// Soak: carga sostenida durante horas para detectar fugas de memoria y
// degradación por tiempo (conexiones que no se cierran, colas que crecen).
// Duración configurable con SOAK_DURATION (default 1h; subir a 8h en corrida
// seria). Se ejecuta solo si ENABLE_SOAK=1.
export const options = {
  scenarios: {
    tenant_a: {
      executor: 'constant-vus',
      exec: 'runA',
      vus: 50,
      duration: __ENV.SOAK_DURATION || '1h',
    },
    tenant_b_probe: {
      executor: 'constant-vus',
      exec: 'runB',
      vus: 1,
      duration: __ENV.SOAK_DURATION || '1h',
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

export function runB() {
  const token = login(emailB(), passB());
  userJourney(token);
  sleep(1);
}
