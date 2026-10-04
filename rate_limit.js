import http from 'k6/http';
import { BASE_URL } from './lib.js';
import { handleSummary } from './summary.js';
export { handleSummary };

// Rate-limit / abuso: UNA sola identidad martilla el endpoint de login con
// credenciales inválidas a tasa fija. Descubre si existe throttling/protección.
// Hallazgo esperado en dev: no hay rate limiting (el informe lo marca como
// riesgo). Solo SELECTs livianos a MySQL, sin efectos secundarios.
// NOTA: los 401 son la respuesta esperada => error_rate ~100% acá es normal
// y no significa falla de la app (no hay thresholds de error en este test).
export const options = {
  scenarios: {
    abuse: {
      executor: 'constant-arrival-rate',
      timeUnit: '1s',
      rate: 100,
      duration: '1m',
      preAllocatedVUs: 20,
      maxVUs: 50,
    },
  },
};

export default function () {
  http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
    email: 'abuse@loadtest.invalid',
    password: 'wrong-password',
  }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'login_invalid' },
  });
}
