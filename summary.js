// Summary personalizado: imprime un resumen legible a stdout (queda en Cloud
// Logging) y escribe el JSON con las métricas clave a /results. El resumen es
// lo que el agente lee para armar el informe de límites.
const SCENARIO = __ENV.SCENARIO_NAME || 'scenario';

function v(metric, key) {
  const m = metric && metric.values;
  return m ? m[key] : null;
}

function build(data) {
  const m = data.metrics || {};
  return {
    scenario: SCENARIO,
    started_at: new Date().toISOString(),
    requests_total: v(m.http_reqs, 'count'),
    throughput_rps: v(m.http_reqs, 'rate'),
    latency_ms: {
      avg: v(m.http_req_duration, 'avg'),
      p50: v(m.http_req_duration, 'p(50)'),
      p90: v(m.http_req_duration, 'p(90)'),
      p95: v(m.http_req_duration, 'p(95)'),
      p99: v(m.http_req_duration, 'p(99)'),
      max: v(m.http_req_duration, 'max'),
    },
    error_rate: v(m.http_req_failed, 'rate'), // 0..1
    vus_max: v(m.vus_max, 'value'),
    iterations: v(m.iterations, 'count'),
  };
}

function text(s) {
  const d = s.latency_ms;
  const err = s.error_rate != null ? (s.error_rate * 100).toFixed(2) : 'n/a';
  return [
    '===== K6 LOAD TEST SUMMARY =====',
    `scenario: ${s.scenario}`,
    `requests_total: ${s.requests_total ?? 'n/a'}`,
    `throughput: ${s.throughput_rps != null ? s.throughput_rps.toFixed(2) + ' req/s' : 'n/a'}`,
    `latency_ms: avg=${d.avg != null ? d.avg.toFixed(1) : 'n/a'} p50=${d.p50 != null ? d.p50.toFixed(1) : 'n/a'} p90=${d.p90 != null ? d.p90.toFixed(1) : 'n/a'} p95=${d.p95 != null ? d.p95.toFixed(1) : 'n/a'} p99=${d.p99 != null ? d.p99.toFixed(1) : 'n/a'} max=${d.max != null ? d.max.toFixed(1) : 'n/a'}`,
    `error_rate: ${err}%`,
    `vus_max: ${s.vus_max ?? 'n/a'}`,
    '================================',
  ].join('\n');
}

export function handleSummary(data) {
  const s = build(data);
  const jsonPath = __ENV.SUMMARY_JSON || '/results/summary.json';
  const out = {};
  out.stdout = text(s) + '\n';
  out[jsonPath] = JSON.stringify(s, null, 2);
  return out;
}
