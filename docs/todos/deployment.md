# Despliegue AWS

## Infraestructura

- **ECS Fargate**: un task por microservicio
- **RDS PostgreSQL**: db.t3.micro, Multi-AZ desactivado (dev)
- **ALB**: Application Load Balancer como punto de entrada
- **ECR**: registro de imágenes Docker
- **S3 + CloudFront**: frontend estático (Next.js export)
- **Secrets Manager**: variables de entorno sensibles

## CI/CD (GitHub Actions)

1. `ci.yml`: lint + test en cada PR
2. `deploy-backend.yml`: build → push ECR → update ECS task → force deploy
3. `deploy-frontend.yml`: next build → s3 sync → cloudfront invalidation

## Variables en Secrets Manager

- DATABASE_URL
- JWT_SECRET
- OPENROUTER_API_KEY (ai-service, agregado 2026-08-18 — reemplaza al ANTHROPIC_API_KEY planeado
  originalmente, nunca se llegó a usar)
