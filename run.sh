#!/bin/sh
set -eu

# Runner: ejecuta la suite en orden y vuelca el summary de cada escenario
# (texto + JSON) a stdout, para que quede capturado en Cloud Logging.
# Al final imprime un CONSOLIDATED REPORT con una línea por escenario.
RESULTS_DIR="${RESULTS_DIR:-/results}"
mkdir -p "$RESULTS_DIR"

run() {
  name="$1"
  script="$2"
  echo ""
  echo "############ SCENARIO: $name ############"
  SCENARIO_NAME="$name" SUMMARY_JSON="$RESULTS_DIR/$name-summary.json" \
    k6 run --summary-trend-stats="avg,p(90),p(95),p(99),max" "$script"
  echo "--- JSON SUMMARY ($name) ---"
  if [ -f "$RESULTS_DIR/$name-summary.json" ]; then
    cat "$RESULTS_DIR/$name-summary.json"
  else
    echo "(no summary JSON written)"
  fi
  echo ""
}

consolidate() {
  echo ""
  echo "============ CONSOLIDATED REPORT ============"
  echo "scenario | req/s | p95_ms | p99_ms | error_rate(0-1)"
  for f in "$RESULTS_DIR"/*-summary.json; do
    [ -f "$f" ] || continue
    name=${f##*/}
    name=${name%-summary.json}
    rps=$(grep -o '"throughput_rps": [^,]*' "$f" | head -1 | sed 's/.*: //' || true)
    p95=$(grep -o '"p95": [^,]*' "$f" | head -1 | sed 's/.*: //' || true)
    p99=$(grep -o '"p99": [^,]*' "$f" | head -1 | sed 's/.*: //' || true)
    err=$(grep -o '"error_rate": [^,]*' "$f" | head -1 | sed 's/.*: //' || true)
    echo "$name | $rps | $p95 | $p99 | $err"
  done
  echo "============================================"
}

# 1) Smoke: fail-fast si la URL/credenciales no andan.
run smoke smoke.js

# 2) Baseline: punto de comparación en reposo.
run baseline baseline.js

# 3) Carga y picos.
run load load.js
run stress stress.js
run spike spike.js

# 4) Contención: mismo recurso + pool de MySQL.
run concurrency concurrency.js
run db_pool db_pool.js

# 5) Multi-tenencia y abuso.
run multitenancy multitenancy.js
run rate_limit rate_limit.js

# Webhook flood en modo seguro (user_id=0): no llama a Meli ni escribe en
# events. On por defecto; apagalo con ENABLE_WEBHOOK_FLOOD=0.
if [ "${ENABLE_WEBHOOK_FLOOD:-1}" = "1" ]; then
  run webhook_flood webhook_flood.js
fi

# Soak (larga duración): off por defecto; activalo con ENABLE_SOAK=1.
if [ "${ENABLE_SOAK:-0}" = "1" ]; then
  run soak soak.js
fi

consolidate
echo ">>> DONE. Results dir: $RESULTS_DIR"
