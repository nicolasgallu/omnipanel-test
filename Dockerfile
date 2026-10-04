# Imagen del generador de carga (Cloud Run Job).
# Base oficial de k6; el entrypoint por defecto es `k6`, lo sobreescribimos
# para correr run.sh (la suite completa).
FROM grafana/k6:latest

ENV K6_NO_USAGE_REPORT=true

WORKDIR /app
COPY . .

# El contenedor corre como usuario no-root (así lo define la base de k6):
# /results debe existir y ser escribible para volcar los summary JSON.
RUN mkdir -p /results && chmod 777 /results

ENTRYPOINT []
CMD ["sh", "/app/run.sh"]
