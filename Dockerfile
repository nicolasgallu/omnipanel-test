# Imagen del generador de carga (Cloud Run Job).
# Base oficial de k6; el entrypoint por defecto es `k6`, lo sobreescribimos
# para correr run.sh (la suite completa).
FROM grafana/k6:latest

ENV K6_NO_USAGE_REPORT=true

WORKDIR /app
COPY . .

# La base de k6 define USER no-root; volvemos a root para poder crear /results
# durante el build (y que el job lo pueda escribir en runtime). Correr como
# root es OK para un job de load tests (contenedor efímero, sin mounts sensibles).
USER root
RUN mkdir -p /results && chmod 777 /results

ENTRYPOINT []
CMD ["sh", "/app/run.sh"]
