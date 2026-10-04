import http from 'k6/http';
import { sleep } from 'k6';
import { BASE_URL, emailA, passA, emailB, passB, login, authHeaders, userJourney } from './lib.js';
import { handleSummary } from './summary.js';
export { handleSummary };

// Aislamiento multi-tenant:
// 1) setup(): verifica UNA vez que A y B no comparten productos y que el
//    token de A no puede leer un producto de B (y viceversa). Si hay fuga,
//    tira Error => el job FALLA (es exactamente lo que queremos detectar).
// 2) default(): corre el viaje normal con la mitad de los VUs como A y la
//    mitad como B, en simultáneo.
export const options = {
  scenarios: {
    isolation: { executor: 'constant-vus', vus: 20, duration: '2m' },
  },
};

function listProductIds(token) {
  const res = http.get(`${BASE_URL}/api/inventory/products?page=1&page_size=200`, { headers: authHeaders(token) });
  if (res.status !== 200) return [];
  return (res.json('items') || []).map((i) => i.id);
}

export function setup() {
  const a = login(emailA(), passA());
  const b = login(emailB(), passB());
  const aIds = listProductIds(a);
  const bIds = listProductIds(b);

  const overlap = aIds.filter((id) => bIds.includes(id));
  if (overlap.length > 0) {
    throw new Error(`AISLAMIENTO ROTO: productos visibles por ambos tenants: ${overlap.join(',')}`);
  }

  const leaks = [];
  if (bIds[0] != null) {
    const r = http.get(`${BASE_URL}/api/inventory/products/${bIds[0]}`, { headers: authHeaders(a) });
    if (r.status !== 404) leaks.push(`A lee producto de B (status ${r.status})`);
  }
  if (aIds[0] != null) {
    const r = http.get(`${BASE_URL}/api/inventory/products/${aIds[0]}`, { headers: authHeaders(b) });
    if (r.status !== 404) leaks.push(`B lee producto de A (status ${r.status})`);
  }
  if (leaks.length > 0) {
    throw new Error(`AISLAMIENTO ROTO: ${leaks.join('; ')}`);
  }

  return { aCount: aIds.length, bCount: bIds.length };
}

export default function () {
  const isA = (__VU % 2) === 0;
  const token = login(isA ? emailA() : emailB(), isA ? passA() : passB());
  userJourney(token);
  sleep(1);
}
