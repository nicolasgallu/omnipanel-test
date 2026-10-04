# Imagen del generador de carga (Cloud Run Job).
# Base oficial de k6; el entrypoint por defecto es `k6`, lo sobreescribimos
# para correr run.sh (la suite completa).
FROM grafana/k6:latest

ENV K6_NO_USAGE_REPORT=true

WORKDIR /app
COPY . .

ENTRYPOINT []
CMD ["sh", "/app/run.sh"]
