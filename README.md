# Load tests (k6 + Cloud Run Job)

Suite de carga/resiliencia (sin chaos) contra el entorno dev de GCP.
Todo corre en un **Cloud Run Job** en `us-west1`, mismo GCP que el servicio.

La carpeta `load-tests/` es **autónoma y está separada de la app**: la podés
extraer/pushear a tu repo tal cual.

## Qué incluye

| # | Escenario | Archivo | Qué responde |
|---|---|---|---|
| 1 | Smoke | `smoke.js` | ¿URL y credenciales andan? (fail-fast antes de la suite) |
| 2 | Baseline | `baseline.js` | Comportamiento en reposo (punto de comparación) |
| 3 | Load (carga) | `load.js` | ¿Aguanta la carga esperada? p95/p99 + error rate |
| 4 | Stress (punto de quiebre) | `stress.js` | ¿En qué escalón se rompe? |
| 5 | Spike (picos) | `spike.js` | ¿Aguanta un pico brusco y se recupera? |
| 6 | Concurrency | `concurrency.js` | Contención de lectura/escritura sobre el mismo producto |
| 7 | DB saturation | `db_pool.js` | ¿Dónde se agota el pool app→Cloud SQL? |
| 8 | Multitenancy | `multitenancy.js` | A y B aislados + fuga de datos entre tenants |
| 9 | Rate limit / abuso | `rate_limit.js` | ¿Existe throttling? (descubrimiento) |
| 10 | Webhook flood (modo seguro) | `webhook_flood.js` | ¿El endpoint absorbe una ráfaga? |
| 11 | Soak (larga duración) | `soak.js` | Fugas de memoria / degradación por tiempo (opcional) |

- `load.js`, `stress.js`, `spike.js` y `soak.js` corren una **sonda del tenant B**
  (1 VU) mientras A está a plena carga → mide el efecto "noisy neighbor".
- `db_pool.js` usa el mismo `CONCURRENCY_PRODUCT_ID`; mientras corre, mirá el
  gráfico **Conexiones** de Cloud SQL en la consola para ver el techo del pool.
- `rate_limit.js` espera ver 401s: es un test de descubrimiento (hoy lo más
  probable es que el hallazgo sea "no hay rate limiting", y el informe lo
  marque como riesgo).

## Requisitos

- Dos tenants **business** distintos (A y B) en la DB. Deben ser rol `business`
  (el viaje incluye `/api/sales/orders`, que da 403 a empleados).
- Para `concurrency` y `db_pool`: el id de un producto del tenant A. Si activás
  el PATCH (`ENABLE_WRITE_CONCURRENCY=1`), usá un **producto dummy** (pisa el
  precio entre 100 y 101).

## Build (Cloud Build)

1. `cloudbuild.yaml` ya apunta a tu registry
   (`us-central1-docker.pkg.dev/nicoservertest/load-test/load-tests:latest`).
2. Desde la raíz del repo:

```bash
gcloud builds submit --config load-tests/cloudbuild.yaml load-tests/
```

> Si usás un **trigger de GitHub** y te da el error
> `if 'build.service_account' is specified, the build must either (a) specify
> 'build.logs_bucket'...`: ya está resuelto en el `cloudbuild.yaml` (incluye
> `options.logging: CLOUD_LOGGING_ONLY` — logs a Cloud Logging, sin bucket).
> Además, la service account que usa el trigger necesita el rol
> **Artifact Registry Writer** sobre el repo (o el proyecto) para poder
> pushear la imagen.

## Deploy del job

```bash
gcloud run jobs deploy load-tests \
  --image=us-central1-docker.pkg.dev/nicoservertest/load-test/load-tests:latest \
  --region=us-west1 \
  --task-timeout=2h \
  --memory=1Gi \
  --cpu=2 \
  --set-env-vars="BASE_URL=https://service-omnipanel-demo-402745694567.us-west1.run.app,USER_A_EMAIL=...,USER_B_EMAIL=...,CONCURRENCY_PRODUCT_ID=..." \
  --set-secrets=USER_A_PASSWORD=loadtest-user-a-password:latest,USER_B_PASSWORD=loadtest-user-b-password:latest
```

> Mejor práctica: contraseñas en **Secret Manager** (`--set-secrets`), no en
> `--set-env-vars`. El resto de variables pueden ir en env vars.
>
> Nota: el registry vive en `us-central1` (da igual para el pull de la imagen);
> el **job** va en `us-west1`, la misma región que el servicio — eso es lo que
> importa para medir latencia real y no la de la red.

## Ejecutar

```bash
gcloud run jobs execute load-tests --region=us-west1 --wait
```

Al final, además del summary de cada escenario, el job imprime un
**CONSOLIDATED REPORT** (una línea por escenario: req/s, p95, p99, error
rate). Copiá el log (o ese bloque) y pasáselo al agente para el informe.

## Variables de entorno

| Variable | Qué hace | Default |
|---|---|---|
| `BASE_URL` | URL base del servicio | `https://service-omnipanel-demo-402745694567.us-west1.run.app` |
| `USER_A_EMAIL` / `USER_A_PASSWORD` | Login del tenant A | — |
| `USER_B_EMAIL` / `USER_B_PASSWORD` | Login del tenant B | — |
| `CONCURRENCY_PRODUCT_ID` | Id del producto para concurrencia + db_pool | — |
| `ENABLE_WRITE_CONCURRENCY` | `1` = habilitar PATCH (dummy) | `0` |
| `ENABLE_WEBHOOK_FLOOD` | `1` = correr webhook flood (modo seguro) | `1` |
| `ENABLE_SOAK` | `1` = correr el soak | `0` |
| `SOAK_DURATION` | Duración del soak | `1h` |
| `RESULTS_DIR` | Dir de salida dentro del contenedor | `/results` |

## Qué NO hace (a propósito)

- **Chaos** (reiniciar Cloud SQL / instancias, inyectar latencia): fuera de
  alcance por decisión del usuario.
- **Efectos en plataformas**: todos los escenarios son solo-lectura sobre la
  app; el webhook flood usa `user_id=0` (el dispatcher lo ignora sin escribir
  ni llamar a Meli). El PATCH de concurrencia escribe solo en la DB local
  (producto dummy).
