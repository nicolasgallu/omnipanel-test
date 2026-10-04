// Helpers compartidos de los tests de carga (k6).
// En k6 cada VU es un runtime JS independiente: el estado por módulo (p. ej.
// el token cacheado) es PRIVADO por VU, así el login se hace UNA vez por VU
// y se reutiliza en sus iteraciones siguientes.
import http from 'k6/http';
import { check } from 'k6';

export const BASE_URL = (
  __ENV.BASE_URL || 'https://service-omnipanel-demo-402745694567.us-west1.run.app'
).replace(/\/+$/, '');

const tokens = {};

export function emailA() { return __ENV.USER_A_EMAIL || ''; }
export function passA() { return __ENV.USER_A_PASSWORD || ''; }
export function emailB() { return __ENV.USER_B_EMAIL || ''; }
export function passB() { return __ENV.USER_B_PASSWORD || ''; }

export function login(email, password) {
  if (tokens[email]) return tokens[email];
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'auth_login' },
  });
  check(res, { 'login 200': (r) => r.status === 200 });
  const token = res.json('token');
  if (token) tokens[email] = token;
  return token;
}

export function authHeaders(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

// Viaje de usuario realista (SOLO LECTURAS: no llama a Meli/TN/Bitcram).
// Orden según uso real: la bandeja de mensajes es la pantalla crítica.
export function userJourney(token) {
  const h = authHeaders(token);
  http.get(`${BASE_URL}/api/mercadolibre/messages`, { headers: h, tags: { name: 'messages' } });
  http.get(`${BASE_URL}/api/inventory/products?page=1&page_size=50`, { headers: h, tags: { name: 'inventory' } });
  http.get(`${BASE_URL}/api/sales/orders?channel=all&page=0&page_size=50`, { headers: h, tags: { name: 'sales' } });
  http.get(`${BASE_URL}/api/shipments?channel=all&page=0&page_size=50`, { headers: h, tags: { name: 'shipments' } });
}
