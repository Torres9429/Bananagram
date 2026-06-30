#!/bin/bash
for svc in auth-service brands-service posts-service campaigns-service metrics-service reports-service; do
  echo "📄 Exportando Swagger de $svc..."
  curl -s "http://localhost:300$(echo $svc | grep -o '[0-9]')/docs-json" > "docs/swagger/$svc.yaml"
done
echo "✅ Swagger exportado en docs/swagger/"
