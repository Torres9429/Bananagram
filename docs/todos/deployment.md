# Despliegue AWS — arquitectura multi-EC2 (real, en curso)

> Reemplaza toda versión anterior de este doc (ECS Fargate/RDS/S3+CloudFront nunca se
> implementó — quedó solo en `infra/terraform/` y `infra/ecs-task-definitions/`, sin
> aplicar; y antes de esto hubo un intento de un solo EC2 con todo el stack, abandonado
> por falta de RAM para construir 11 imágenes Docker en una sola máquina de 2GB).
>
> Rama: `feat/dev-desp` (creada desde `develop` después de mergear
> `origin/feat/completar-dashboard-metricas` vía PR #32). Se mergea a `develop` recién
> cuando el despliegue funcione de punta a punta.

## Por qué 4 instancias y no 1

El primer intento fue un solo `t3.small` con las 11 imágenes (5 backend + 6 frontend).
Funcionó para el backend a fuerza de construir de a una imagen por vez, pero reveló el
problema real: **la limitación no era espacio en disco ni CPU en estado estable, era
RAM durante el build** — cada `pnpm install` + `next build`/`nest build` de un
monorepo grande necesita bastante memoria, y 2GB no alcanza para varios en paralelo.

Decisión: repartir por **peso de build**, no 1 microservicio = 1 instancia (eso
hubiera sido 6 instancias solo de backend). 4 EC2, cada uno `t3.small` (2 vCPU/2GB) +
2GB de swap:

| Rol | Qué corre | Por qué juntos |
|---|---|---|
| **core** | Postgres + Redis + `core-service` | El servicio más pesado y el más acoplado a la base — sin latencia de red entre ambos |
| **auth-gateway** | `auth-service` + `api-gateway` | El gateway verifica JWTs contra el JWKS de auth-service constantemente |
| **extras** | `alexa-service` + `ai-service` | Los 2 BFF más livianos, camino no crítico |
| **frontend** | `web-shell` + las 5 zonas (Multi-Zones) | `web-shell` hace *proxy en el servidor* hacia cada zona en cada request — mejor red interna de Docker que otro EC2 |

Solo **frontend** y **auth-gateway** tienen puertos públicos abiertos a Internet — el
navegador del usuario habla con ambos directo (no hay un solo dominio/reverse proxy
todavía, ver "Pendiente"). **core** y **extras** solo aceptan tráfico desde dentro de
la VPC (además de SSH para administración).

## Instancias

Todas en la misma VPC/subred (`vpc-04a96969f5f4919f9` / `subnet-0e8952bce6574f1c6`,
la VPC por defecto de la cuenta), zona `us-east-1a`, AMI Ubuntu Server 26.04 LTS
(`ami-0b6d9d3d33ba97d99`), key pair `Bananagram`, rol de instancia `LabInstanceProfile`
en las 3 nuevas (ver "IAM" abajo).

| Rol | Instance ID | IP privada | IP pública (Elastic IP) | Security Group |
|---|---|---|---|---|
| frontend | `i-0e76b5dbe04c37f09` | `172.31.2.189` | `52.200.97.70` | `sg-0de779d7e6b62b2c8` (`launch-wizard-1`) |
| core | `i-0c170003dd9998efb` | `172.31.12.54` | `100.48.200.42` | `sg-0bbd6da8e5c257b54` (`bananagram-core`) |
| auth-gateway | `i-036ea19fd5b37f93a` | `172.31.1.153` | `44.216.180.59` | `sg-0516ef1cac373501e` (`bananagram-auth-gateway`) |
| extras | `i-0191fb997dc55991f` | `172.31.4.136` | `52.2.62.9` | `sg-07ad494941ae84cbf` (`bananagram-extras`) |

`frontend` es la instancia original del primer intento de un solo EC2 — se reutilizó
(ya tenía Docker/swap/Elastic IP listos) en vez de crear una 5ª instancia de cero.

Las 3 nuevas (`core`, `auth-gateway`, `extras`) se crearon **por AWS CLI desde la
propia instancia `frontend`** (ya tenía `aws` instalado y el rol del lab con permisos
de EC2) en vez de repetir el wizard de la consola 3 veces — mucho más rápido.

### Security groups (reglas de entrada)

| SG | Puerto | Origen | Motivo |
|---|---|---|---|
| `launch-wizard-1` (frontend) | 22 | `0.0.0.0/0` | SSH |
| | 80 | `0.0.0.0/0` | `web-shell` (mapeado 80→3000, sin Nginx todavía) |
| | 443 | `0.0.0.0/0` | reservado para cuando haya TLS |
| `bananagram-core` | 22 | `0.0.0.0/0` | SSH |
| | 5432 | `172.31.0.0/16` (VPC) | Postgres — lo usan `auth-service` y `alexa-service` desde otros hosts |
| | 6379 | `172.31.0.0/16` (VPC) | Redis — lo usan los 4 servicios de backend |
| | 3002 | `172.31.0.0/16` (VPC) | `core-service` — lo usan `api-gateway`, `auth-service`, `alexa-service`, `ai-service` |
| `bananagram-auth-gateway` | 22 | `0.0.0.0/0` | SSH |
| | 4000 | `0.0.0.0/0` | `api-gateway` — **público**, el navegador le pega directo (`NEXT_PUBLIC_API_URL`) |
| | 3001 | `172.31.0.0/16` (VPC) | `auth-service` — lo usan `core-service` (notify) y `alexa-service`/`ai-service` (JWKS) |
| `bananagram-extras` | 22 | `0.0.0.0/0` | SSH |
| | 3004 | `172.31.0.0/16` (VPC) | `alexa-service` — lo usa `api-gateway` |
| | 3005 | `172.31.0.0/16` (VPC) | `ai-service` — lo usa `api-gateway` |

Trade-off consciente: los puertos internos se abrieron a **toda la VPC**
(`172.31.0.0/16`), no solo a los 2-3 hosts que realmente los necesitan (que sería lo
ideal vía referencias SG-a-SG). Se eligió así por velocidad de configuración — sigue
sin ser alcanzable desde Internet, solo relaja la granularidad *dentro* de la red
privada. Si hiciera falta más adelante, cambiar a reglas que referencien el security
group de origen en vez del CIDR completo.

### Red — bug real encontrado y corregido

La VPC por defecto tenía el Internet Gateway (`igw-057d2d7b58523650d`) creado y
`Attached`, pero la tabla de rutas principal (`rtb-0d51232cca7174f3f`) **no tenía la
ruta `0.0.0.0/0 → igw`** — solo la ruta local `172.31.0.0/16`. Por eso el primer EC2
no respondía ni SSH ni HTTP al arrancar, pese a que el security group ya estaba bien.
Se agregó la ruta faltante una sola vez (aplica a toda la VPC, no hubo que repetirlo
para las 3 instancias nuevas).

## IAM

La cuenta es un **AWS Academy Learner Lab** (`voclabs`, ID `520580368175`,
`us-east-1`) y **bloquea `iam:CreateRole`** — confirmado en vivo, 2 intentos de crear
un rol propio (`bananagram-ec2-s3-role`) fallaron con `AccessDenied`. También bloquea
`iam:GetPolicy` (no se pudo inspeccionar el detalle de las políticas del rol del lab).

Se usa el rol pre-provisto `LabRole` / instance profile `LabInstanceProfile` en las 4
instancias — tiene permisos amplios para casi todos los servicios de AWS (S3, EC2,
etc.) pero no para IAM. Sin credenciales estáticas en ningún `.env`: el SDK de AWS
(`@aws-sdk/client-s3` en `core-service`, y el `aws` CLI usado para administración)
toma las credenciales del rol de instancia automáticamente vía metadata.

## S3

Bucket `bananagram-media-520580368175` (`us-east-1`), creado a mano en la consola.
Reemplaza a Cloudinary como backend de medios de `core-service` (ver "Cambios de
código"), ya que Cloudinary nunca tuvo credenciales configuradas y hay cuenta de AWS
disponible.

- "Block all public access" desactivado (las 4 opciones).
- Política de bucket: lectura pública (`s3:GetObject`) solo bajo el prefijo
  `bananagram/*` — nada más del bucket es público, y no hay `PutObject`/`ListBucket`
  públicos (eso lo hace `core-service` vía el rol de instancia).
  ```json
  {
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadBananagram",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bananagram-media-520580368175/bananagram/*"
    }]
  }
  ```
- Prefijos en uso: `bananagram/posts/*` (medios de publicaciones), `bananagram/avatars/*`
  (foto de perfil), `bananagram/brands/*` (logo de marca).
- Verificado en vivo desde el EC2 `core` con AWS CLI (usando el rol de instancia, sin
  claves estáticas): `aws s3 cp` (subida), lectura pública por URL directa (HTTP 200),
  y `aws s3 rm` (borrado) — los 3 funcionan.

## Cambios de código

Todo esto vive en el working tree de `feat/dev-desp`, listo para commitear (ver
"Pendiente" — el usuario confirmó que el sistema ya está arriba antes de commitear).

### 1. Cloudinary → S3 (`core-service`)
Cloudinary nunca tuvo credenciales configuradas (ni en local). Reemplazo completo:

- Nuevo `src/storage/s3.service.ts` (`S3Service`) + `s3.module.ts` — misma interfaz que
  tenía `CloudinaryService` (`uploadFile(file, folder?)` / `deleteFile(publicId)`),
  mismo shape de retorno (`public_id`, `secure_url`, `width?`/`height?`/`duration?`
  siempre `undefined` — S3 no analiza el archivo como sí hacía Cloudinary). Sin
  credenciales estáticas — cadena de credenciales por defecto del SDK (rol de
  instancia EC2 en producción).
- `src/cloudinary/` eliminado por completo, junto con la dependencia `cloudinary` de
  `package.json` (se agregó `@aws-sdk/client-s3`) y se regeneró `pnpm-lock.yaml`.
- Todos los puntos que importaban `CloudinaryService`/`CloudinaryModule` actualizados:
  `posts.*`, `app.module.ts`, `brands.module.ts`, `brands.controller.ts`,
  `internal.module.ts`, `internal/user-profiles.controller.ts` — estos 2 últimos
  porque un commit concurrente de un compañero de equipo (Torres9429, mientras se
  hacía este swap) agregó ahí un segundo uso de Cloudinary (subida de logo de marca y
  avatar de perfil) que había que cubrir también.
- `.env.example` de `core-service`: `CLOUDINARY_*` → `AWS_REGION` + `S3_BUCKET_NAME`.
- Test de integración (`posts-flow.spec.ts`): mock renombrado a `storageMock`/`S3Service`.
- `turbo.json`: `AWS_REGION`/`S3_BUCKET_NAME` agregados a `globalEnv`.

### 2. `NEXT_PUBLIC_API_URL` no se podía configurar en build time
Next.js hornea las variables `NEXT_PUBLIC_*` en el bundle del navegador durante
`next build`, no en runtime del contenedor. Ninguno de los 6 `Dockerfile` de
`apps/frontend/*` aceptaba esa variable como build-arg. Fix: `ARG`/`ENV` en la etapa
`builder` de los 6 Dockerfile + `build.args.NEXT_PUBLIC_API_URL` en los compose files.
En la arquitectura multi-EC2 apunta a la IP pública de **auth-gateway**
(`http://44.216.180.59:4000/api`) — el navegador del usuario, no el servidor, es quien
la usa, así que tiene que ser una IP alcanzable desde fuera de la VPC.

### 3. `docker-compose.yml` pisaba el secreto real con el de desarrollo
`INTERNAL_SERVICE_SECRET` estaba hardcodeado como `dev-internal-secret-change-me`
directo en `environment:` (que tiene prioridad sobre `env_file:`). Cambiado a
`${INTERNAL_SERVICE_SECRET:-dev-internal-secret-change-me}`. En la arquitectura
multi-EC2 esto ya no aplica igual (cada `docker-compose.<rol>.yml` nuevo no
sobreescribe este valor en absoluto, viene puro del `.env` de cada servicio) pero se
dejó corregido también en el `docker-compose.yml` original (uso local/dev).

### 4. Bug real: la llave JWT montada en la ruta equivocada
`JWT_PRIVATE_KEY_PATH`/`JWT_PUBLIC_KEY_PATH` son rutas **relativas**
(`./keys/jwt_*.pem`) que Node resuelve contra el `WORKDIR` final del contenedor
(`/app/apps/backend/services/auth-service`, según el `Dockerfile` — no `/repo`). El
volumen se montaba en `/repo/keys`, que nunca coincidía — `auth-service` crasheaba al
arrancar con `ENOENT` en `TokenSignerService.onModuleInit`. Nunca se había detectado
antes porque el servicio nunca se había llegado a *correr* de verdad, solo a
construir. Corregido en `docker-compose.yml` y `docker-compose.auth-gateway.yml`: el
volumen ahora monta en `/app/apps/backend/services/auth-service/keys`.

### 5. `pnpm` no existe en la imagen runtime — usar `npx` para comandos puntuales
Los `Dockerfile` de backend solo activan `pnpm` (vía corepack) en la etapa `builder`,
no en `runtime` — un `docker compose run <servicio> pnpm db:migrate:prod` falla con
`MODULE_NOT_FOUND`. Para correr Prisma a mano dentro de un contenedor ya construido,
usar `npx prisma migrate deploy` (npm sí viene con la imagen base de Node).

## Docker Compose — uno por instancia

El `docker-compose.yml` original (raíz del repo) sigue existiendo tal cual, para
desarrollo local (`docker compose up -d` liviano, o `--profile full` para probar el
build de producción completo en una sola máquina) — **no es lo que se usa para
desplegar en AWS**. Para el despliegue multi-EC2 hay 4 archivos nuevos, cada uno con
solo los servicios de su instancia y las URLs de los demás resueltas a IP privada real
(no nombre de servicio de Docker, salvo entre servicios del mismo host):

- `docker-compose.core.yml` — postgres, redis, core-service
- `docker-compose.auth-gateway.yml` — auth-service, api-gateway
- `docker-compose.extras.yml` — alexa-service, ai-service
- `docker-compose.frontend.yml` — web-shell + 5 zonas

Cada uno documenta en comentarios por qué cada variable de entorno usa IP privada vs.
nombre de servicio de Compose.

## Scripts (`scripts/ec2-*.sh`)

Todos leen la lista de instancias de `scripts/lib/ec2-hosts.sh` (única fuente de
verdad de IPs/compose files/servicios — si una IP cambia, se edita ahí, no en cada
script).

| Script | Qué hace |
|---|---|
| `ec2-connect.sh <rol> ["cmd"]` | SSH a una instancia (socket ControlMaster persistente por rol — conexiones repetidas son casi instantáneas) |
| `ec2-disconnect.sh <rol\|all>` | Cierra el socket persistente de una o todas |
| `ec2-sync.sh <rol\|all>` | `rsync` del working tree local hacia la instancia, sin tocar contenedores |
| `ec2-deploy.sh <rol>` | Sync + build (**uno por uno**, nunca todos en paralelo) + `up -d` — sigue el log en vivo |
| `ec2-status.sh [rol\|all]` | `docker compose ps` de una o las 4 |
| `ec2-down.sh <rol\|all> [-v]` | Baja contenedores (`-v` también borra volúmenes — cuidado en `core`, ahí vive Postgres) |

**Por qué `ec2-deploy.sh` construye de a un servicio por vez**: el primer intento de
desplegar `frontend` con `docker compose up -d --build` (que por defecto construye
todos los servicios del archivo en paralelo) hizo que el `t3.small` se quedara sin RAM
compilando las 6 apps de Next.js a la vez — la instancia dejó de responder por SSH y
las comprobaciones de estado de AWS quedaron en "Inicializando" más de 10 minutos
(CPU subiendo sostenido hasta 84%+ sin bajar). Hubo que reiniciarla manualmente desde
la consola. Construir de a uno tarda un poco más en total pero nunca compite por RAM
consigo mismo.

## `.env` por instancia (contenido, no valores)

Ninguno vive en el repo (gitignored). Se escriben a mano por SSH la primera vez que se
levanta cada instancia — no hay un mecanismo automático de secretos todavía (ver
"Pendiente").

- **core** (`apps/backend/services/core-service/.env`): `JWT_ISSUER`/`AUDIENCE`,
  `INTERNAL_SERVICE_SECRET` (mismo valor que en auth-gateway), `AYRSHARE_*`
  (cuenta de prueba, la misma que en desarrollo local), `SOCIAL_PROVIDER=ayrshare`
  (publicación real en redes, no simulada), `AWS_REGION`/`S3_BUCKET_NAME`, `NODE_ENV=production`.
- **auth-gateway**: `apps/backend/services/auth-service/.env` (`JWT_ISSUER`/`AUDIENCE`/
  `EXPIRES_IN`, `INTERNAL_SERVICE_SECRET`) + `apps/backend/gateway/.env`
  (`RATE_LIMIT_*`, **`TRUST_PROXY=false`** — no hay reverse proxy delante del gateway
  todavía, se expone directo en el 4000). Además, par de llaves RS256 propio generado
  en este host (`node scripts/generate-keys.mjs`) — no son las mismas llaves que las
  de desarrollo local ni las del primer intento de un solo EC2.
- **extras**: `apps/backend/services/alexa-service/.env` + `apps/backend/services/ai-service/.env`
  (`OPENROUTER_API_KEY`/`OPENROUTER_MODEL` — el usuario los pasó porque no estaban
  configurados ni en local).
- **frontend**: `.env` raíz solo con `NEXT_PUBLIC_API_URL=http://44.216.180.59:4000/api`
  (IP pública de auth-gateway) y `NODE_ENV=production` — ningún backend corre acá, no
  necesita más.

## Estado a esta fecha (2026-08-20, sesión en curso)

- ✅ **core**: Postgres + Redis + `core-service` arriba, migraciones aplicadas (12),
  estable.
- ✅ **auth-gateway**: `auth-service` + `api-gateway` arriba, migraciones aplicadas
  (4), `GET /health` responde `200` **desde fuera de la VPC** (probado desde la
  máquina local, no solo desde otro EC2).
- ✅ **Networking cross-instance verificado en vivo**: `api-gateway` (auth-gateway) →
  `core-service` (core) por IP privada — probado con `/api/catalogs/social-networks`,
  respondió `401` (falta token, pero la petición SÍ llegó y volvió — confirma que el
  security group y la ruta de red funcionan).
- ✅ **extras**: `alexa-service` + `ai-service` arriba y estables.
- 🔄 **frontend**: en redespliegue — el primer intento de build (`--build` en
  paralelo sobre las 6 apps) dejó la instancia sin RAM y hubo que reiniciarla desde la
  consola. Redesplegando con `ec2-deploy.sh` (build secuencial).

## Pendiente

1. Terminar el redespliegue de `frontend` (en curso).
2. Prueba real en navegador: entrar a `http://52.200.97.70`, login, al menos un flujo
   completo (crear marca, publicación, etc.) — para confirmar que las 4 instancias
   realmente arman el sistema completo, no solo que cada una responde por separado.
3. `pnpm seed` — **solo el seed**, sin datos de prueba adicionales (pedido explícito
   del usuario: sistema limpio, nada más que lo que carga el seed).
4. Una vez confirmado en el navegador: commitear los cambios de código en
   `feat/dev-desp` (el usuario ya dio luz verde para esto, condicionado a que todo
   funcione primero) y mergear a `develop`.
5. TLS/dominio — hoy todo es HTTP plano sobre IPs públicas crudas. Sin Nginx ni
   certificados todavía en ninguna de las 4 instancias.
6. Secretos hoy se escriben a mano por SSH — no hay Secrets Manager ni nada
   automatizado. Aceptable para este alcance (proyecto escolar, cuenta de lab
   temporal), documentado acá para no repetir el trabajo de memoria si hay que
   rehacer una instancia.
7. Granularidad de los security groups internos (VPC CIDR completo en vez de
   SG-a-SG) — ver nota en la sección de security groups arriba.
