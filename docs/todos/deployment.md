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
la VPC por defecto de la cuenta), zona `us-east-1a`, key pair `Bananagram`, rol de
instancia `LabInstanceProfile` en las 4 (ver "IAM" abajo). `core`, `auth-gateway` y
`extras` corren Ubuntu Server 26.04 LTS (usuario SSH `ubuntu`); `frontend` corre
**Amazon Linux 2023** (usuario SSH `ec2-user` — distinto a los otros 3, ver más abajo).

| Rol | Instance ID | AMI | IP privada | IP pública (Elastic IP) | Security Group |
|---|---|---|---|---|---|
| frontend | `i-0b078b9fc4d4b5b89` | Amazon Linux 2023 (`ami-0db1c5c6dc64eb019`) | `172.31.15.54` | `52.200.97.70` | `sg-0de779d7e6b62b2c8` (`launch-wizard-1`) |
| core | `i-0c170003dd9998efb` | Ubuntu 26.04 (`ami-0b6d9d3d33ba97d99`) | `172.31.12.54` | `100.48.200.42` | `sg-0bbd6da8e5c257b54` (`bananagram-core`) |
| auth-gateway | `i-036ea19fd5b37f93a` | Ubuntu 26.04 (`ami-0b6d9d3d33ba97d99`) | `172.31.1.153` | `44.216.180.59` | `sg-0516ef1cac373501e` (`bananagram-auth-gateway`) |
| extras | `i-0191fb997dc55991f` | Ubuntu 26.04 (`ami-0b6d9d3d33ba97d99`) | `172.31.4.136` | `52.2.62.9` | `sg-07ad494941ae84cbf` (`bananagram-extras`) |

Las 3 instancias de backend (`core`, `auth-gateway`, `extras`) se crearon **por AWS
CLI desde otra instancia ya viva** (instalando `aws` ahí primero) en vez de repetir el
wizard de la consola 3 veces — mucho más rápido. Mismo método para recrear `frontend`
en Amazon Linux (ver abajo).

### `frontend` se recreó en Amazon Linux 2023 (era Ubuntu)

La instancia original de `frontend` (`i-0e76b5dbe04c37f09`, la del primer intento de
un solo EC2, reutilizada al principio de la arquitectura multi-EC2) corría Ubuntu. Por
pedido explícito, se **terminó** y se creó una nueva con Amazon Linux 2023, reusando
la misma Elastic IP (`52.200.97.70`, `eipalloc-00cb7047bf226b3a1` — se reasocia, no se
vuelve a crear) y el mismo security group. Pasos (repetibles si hace falta recrearla
de nuevo):

```bash
# Desde una instancia con AWS CLI ya instalado (o local, si tienes `aws` configurado):
aws ec2 terminate-instances --instance-ids i-0e76b5dbe04c37f09

# AMI de Amazon Linux 2023 vigente (el catálogo cambia — verificar antes de asumir
# que este ID sigue existiendo, igual que con cualquier AMI):
aws ec2 describe-images --owners amazon \
  --filters 'Name=name,Values=al2023-ami-2023.*-kernel-*-x86_64' 'Name=state,Values=available' \
  --query 'sort_by(Images,&CreationDate)[-1].[ImageId,Name]' --output text

aws ec2 run-instances --image-id ami-0db1c5c6dc64eb019 --instance-type t3.small \
  --key-name Bananagram --subnet-id subnet-0e8952bce6574f1c6 \
  --security-group-ids sg-0de779d7e6b62b2c8 \
  --iam-instance-profile Name=LabInstanceProfile \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":30,"VolumeType":"gp3"}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=Bananagram-frontend}]'

# Esperar a que arranque, luego reasociar la Elastic IP existente:
aws ec2 wait instance-running --instance-ids <nuevo-instance-id>
aws ec2 associate-address --instance-id <nuevo-instance-id> --allocation-id eipalloc-00cb7047bf226b3a1
```

Ojo — dos diferencias reales de Amazon Linux 2023 vs. Ubuntu que hay que tener en
cuenta (ya reflejadas en `scripts/lib/ec2-hosts.sh`, ver sección "Scripts"):
- Usuario SSH `ec2-user`, no `ubuntu` → `$HOME` es `/home/ec2-user`, no
  `/home/ubuntu` → la ruta del repo en el servidor cambia también.
- Nombre del dispositivo raíz para el volumen EBS es `/dev/xvda`, no `/dev/sda1`
  (Ubuntu). Si se usa el nombre equivocado, `run-instances` lo rechaza.
- Gestor de paquetes `dnf`, no `apt`. Instalación de Docker en AL2023 es más directa
  (el paquete `docker` ya está en el repo de Amazon Linux, no hace falta agregar el
  repositorio oficial de Docker como en Ubuntu): `sudo dnf install -y docker &&
  sudo systemctl enable --now docker`. El plugin `docker compose` **no** viene
  empaquetado — se instala a mano como plugin de la CLI:
  ```bash
  sudo mkdir -p /usr/local/lib/docker/cli-plugins
  sudo curl -sSL "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
  ```
  Node 20 vía `sudo dnf install -y nodejs20` (el paquete se llama `nodejs20`, no
  `nodejs`, a diferencia del repositorio de NodeSource que se usa en Ubuntu).

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

### Probar contra el bucket S3 real desde local (sin desplegar nada)

`S3Service` no tiene nada hardcodeado para EC2 — usa la cadena de credenciales por
defecto del SDK de AWS, que también funciona en una máquina local con credenciales
válidas. No hace falta desplegar para probarlo.

1. `apps/backend/services/core-service/.env` (local, el de siempre para
   `pnpm --filter @repo/core-service dev`) necesita `AWS_REGION=us-east-1` y
   `S3_BUCKET_NAME=bananagram-media-520580368175` — **sin credenciales acá**, van
   aparte (paso 2).
2. Credenciales de la cuenta en `~/.aws/credentials` (formato AWS CLI estándar,
   fuera del repo):
   ```ini
   [default]
   aws_access_key_id = ...
   aws_secret_access_key = ...
   aws_session_token = ...
   ```
   Como es AWS Academy Learner Lab, las credenciales son **temporales** — se sacan
   del panel del lab (Vocareum/Academy, botón "AWS Details" o similar, fuera de la
   consola de AWS normal) e incluyen `aws_session_token` (no solo access key +
   secret, a diferencia de credenciales IAM permanentes). Expiran cuando termina o
   se reinicia la sesión del lab — hay que volver a copiarlas si dejan de funcionar.
   `~/.aws/config` con `region = us-east-1` también ayuda pero no es estrictamente
   necesario si `AWS_REGION` ya está en el `.env`.
3. Verificación rápida sin necesidad de tener `aws` CLI instalado (usa el SDK que ya
   está en `node_modules` de `core-service`):
   ```bash
   node -e "
   const { S3Client, ListObjectsV2Command } = require('./apps/backend/services/core-service/node_modules/@aws-sdk/client-s3');
   new S3Client({ region: 'us-east-1' }).send(new ListObjectsV2Command({ Bucket: 'bananagram-media-520580368175', MaxKeys: 5 }))
     .then(r => console.log('OK,', (r.Contents||[]).length, 'objetos'))
     .catch(e => console.error('ERROR:', e.name, e.message));
   "
   ```
4. Con eso, correr `core-service` local (`pnpm dev` o el filtro puntual) ya sube/lee/
   borra contra el bucket real — mismo comportamiento que en el EC2, sin necesidad de
   credenciales estáticas hardcodeadas ni de tocar el rol de instancia.

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

Todos leen `scripts/lib/ec2-hosts.sh` — única fuente de verdad de IP, usuario SSH,
ruta del repo en el servidor, compose file y lista de servicios por rol. Si una IP
cambia (por ejemplo al recrear una instancia), se edita ahí una sola vez:
`ec2_host_for`, `ec2_user_for` (`ec2-user` en `frontend`, `ubuntu` en las otras 3),
`ec2_repo_path_for` (deriva del usuario — `/home/<usuario>/Bananagram`),
`ec2_compose_file_for`, `ec2_services_for`.

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
consigo mismo. Le pasó **dos veces** a `frontend` (una por instancia Ubuntu, otra ya
corregido el script pero por las dudas se repitió la prueba en la instancia Amazon
Linux nueva) — con el build secuencial no volvió a pasar.

**Bug real corregido en vivo (2026-08-21)**: el loop final que espera `DEPLOY_DONE`
en el `build.log` remoto no tenía forma de detectar que el build había *fallado* —
si el script remoto moría a mitad de camino (pasó de verdad: un `EOF` real de
BuildKit cortó un build de `brands-front`), nunca escribía `DEPLOY_DONE` y el loop se
quedaba esperando para siempre, sin avisar. El script remoto ahora escribe siempre
uno de dos sentinels (`DEPLOY_DONE` o `DEPLOY_FAILED`, vía `(...) && echo A || echo
B`), y el loop corta y falla (`exit 1`) apenas ve `DEPLOY_FAILED` — necesario tanto
para uso interactivo como para que CI (ver sección siguiente) no se cuelgue ni
reporte éxito falso.

## CI/CD — GitHub Actions (`.github/workflows/deploy.yml`)

Desde 2026-08-21, un push a `develop` (**solo esa rama**, ningún otro push ni PR
dispara nada) redespliega las 4 instancias automáticamente, reusando
`scripts/ec2-deploy.sh` tal cual —el workflow no reimplementa la lógica de deploy,
solo le da a esos scripts una llave SSH y los corre.

- **Trigger**: `on: push: branches: [develop]` — un push a `feat/dev-desp` (o
  cualquier otra rama) no dispara nada; el merge a `develop` sí.
- **4 jobs en paralelo** (`strategy.matrix.role: [core, auth-gateway, extras,
  frontend]`, `fail-fast: false`) — si un rol falla, los otros 3 igual terminan; no
  se cancelan entre sí.
- **`concurrency: group: deploy-ec2, cancel-in-progress: false`** — si llegan 2
  pushes seguidos a `develop`, el segundo workflow espera a que termine el primero
  en vez de cancelarlo a mitad de un `docker compose build` (dejaría una imagen a
  medio armar).
- **`timeout-minutes: 25`** por job — red de seguridad además del fix de
  `DEPLOY_FAILED` de arriba.
- **Secret requerido**: `EC2_SSH_KEY` (contenido completo de `Bananagram.pem`) — ya
  cargado en Settings → Secrets and variables → Actions del repo. El workflow lo
  escribe a un archivo temporal en el runner (`~/.ssh/bananagram.pem`, `chmod 600`)
  y se lo pasa a `ec2-deploy.sh` vía `EC2_KEY_PATH` (los scripts ya soportaban ese
  override, no hizo falta tocarlos para esto).
- **No hay checkout de git en las instancias EC2** — el workflow hace lo mismo que
  siempre: `rsync` del working tree (acá, el checkout del runner de GitHub Actions)
  hacia cada EC2 vía `ec2-sync.sh`. Las 4 instancias siguen sin tener su propio clon
  de git, solo la copia sincronizada.
- **Riesgo conocido de esta cuenta (AWS Academy Learner Lab)**: si la sesión del lab
  expiró o las instancias están paradas cuando corre el workflow, el deploy va a
  fallar (SSH timeout) — no es un bug del workflow, es el mismo riesgo ya documentado
  más abajo en "Pendiente". Si pasa, hay que reactivar la sesión del lab / levantar
  las instancias a mano y volver a correr el workflow (Actions → el run fallido →
  "Re-run all jobs").
- **No se filtra por rol según qué carpetas cambiaron** — cada push a `develop`
  reconstruye las 4 instancias completas, aunque el cambio haya sido solo en una
  (ej. solo `apps/frontend/*`). Simplicidad deliberada por ahora; si se vuelve lento
  o caro, la mejora natural es agregar `paths-filter` por rol y saltear los jobs sin
  cambios relevantes.

### Cómo hacer un cambio y redesplegarlo en un microservicio

**Con CI ya configurado, el flujo normal es simplemente mergear/pushear a `develop`**
— el workflow de arriba hace el resto solo. Lo de abajo (`ec2-deploy.sh` a mano)
sigue sirviendo para: probar un cambio en una rama antes de mergear a `develop`,
iterar rápido sin esperar a que termine el workflow completo, o cuando no hay
conexión a internet estable para depender de GitHub Actions.

El flujo manual para editar código y que quede reflejado en el EC2 correspondiente:

```bash
# 1. Editar el código local como siempre (ej. algo en core-service).

# 2. Bajar el contenedor de ESE rol antes de tocar nada en el servidor (opcional si
#    vas a usar ec2-deploy.sh, que hace su propio `up -d` al final — pero si querés
#    dejarlo abajo mientras investigás algo, o forzar un estado limpio):
./scripts/ec2-down.sh core          # solo detiene, sin borrar volúmenes
./scripts/ec2-down.sh core -v       # detiene Y borra volúmenes (¡pierde datos de Postgres si es "core"!)

# 3. Sincronizar + reconstruir + volver a levantar, todo en un comando (build
#    secuencial, nunca paralelo — ver motivo arriba):
./scripts/ec2-deploy.sh core

# Alternativa manual, paso a paso, si querés más control (DOCKER_BUILDKIT=1 es
# obligatorio a mano acá — ec2-deploy.sh ya lo pone solo, ver sección de cache abajo):
./scripts/ec2-sync.sh core                          # solo copia el código, sin tocar contenedores
./scripts/ec2-connect.sh core "cd ~/Bananagram && sudo DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose -f docker-compose.core.yml build core-service"
./scripts/ec2-connect.sh core "cd ~/Bananagram && sudo docker compose -f docker-compose.core.yml up -d"

# 4. Verificar que quedó arriba:
./scripts/ec2-status.sh core
```

Para bajar/redesplegar **más de un rol** (por ejemplo, un cambio que toca tanto
`core-service` como `api-gateway`): repetir el mismo flujo por cada rol afectado —
cada uno tiene su propio compose file y build, no hay un comando que toque 2 a la vez
a propósito (evita construir de más en instancias que no cambiaron).

Si solo cambiaste un `.env` (sin tocar código), no hace falta reconstruir la imagen —
alcanza con recrear el contenedor para que relea el archivo:
```bash
./scripts/ec2-connect.sh auth-gateway "cd ~/Bananagram && sudo docker compose -f docker-compose.auth-gateway.yml up -d --force-recreate auth-service"
```

### Cache de build compartida entre servicios (BuildKit + turbo) — 2026-08-20

Hasta ahora cada uno de los 11 Dockerfiles (5 backend + 6 frontend, mismo esqueleto
`base`/`deps`/`builder`/`runtime`, ver arriba) hacía un `pnpm install --frozen-lockfile`
y un `pnpm exec turbo run build --filter=X` totalmente independientes — ningún build
reaprovechaba nada del anterior, ni siquiera en el mismo host, aunque instalen
prácticamente el mismo `node_modules` y compilen `@repo/ui`/`@repo/backend-commons`
una y otra vez de cero. En un `t3.small` (build secuencial, uno por vez, ver más
arriba) esto se sentía especialmente: cada servicio pagaba el install completo del
workspace entero.

Fix: `RUN --mount=type=cache` (BuildKit) en los dos pasos caros de cada Dockerfile,
con el mismo `id` en los 11 archivos para que se comparta entre builds de distintos
servicios en el mismo host (cada `docker compose build <svc>` es un proceso de build
separado, pero el cache mount persiste en el daemon, no en la imagen):

```dockerfile
# syntax=docker/dockerfile:1                              # necesario para que --mount
...                                                        # exista sin depender de qué
RUN --mount=type=cache,id=bananagram-pnpm-store,target=/pnpm-store \
    pnpm install --frozen-lockfile --store-dir=/pnpm-store
...
RUN --mount=type=cache,id=bananagram-turbo-cache,target=/app/.turbo/cache \
    pnpm exec turbo run build --filter=@repo/X
```

Dos detalles reales que costó acertar:
- **`# syntax=docker/dockerfile:1` en la primera línea** de los 11 Dockerfiles — sin
  este pragma, `--mount` puede fallar según qué versión de BuildKit trae empaquetada
  el Docker Engine del host (varía entre el `docker.io`/`docker-ce` de apt en Ubuntu y
  el binario instalado a mano en Amazon Linux). Con el pragma, BuildKit descarga/usa
  el frontend de Dockerfile correcto sin depender de la versión del daemon.
- **El cache de turbo v2 (el que usa este repo, `"turbo": "^2.0.0"`) vive en
  `.turbo/cache` en la raíz del repo, NO en `node_modules/.cache/turbo`** (eso era el
  default de turbo v1) — confirmado localmente (`find . -iname .turbo` mostró
  `./.turbo/cache/*.tar.zst`). El primer intento montó el cache mount ahí y no habría
  hecho nada (turbo nunca lee de esa ruta en v2, cache silenciosamente inútil sin
  error visible). Corregido a `target=/app/.turbo/cache`.
- El pnpm store (`--store-dir=/pnpm-store`) evita que cada servicio vuelva a
  descomprimir/vincular los mismos paquetes de `node_modules` — el `pnpm-lock.yaml`
  es el mismo para los 11 builds (un solo workspace), así que el store cacheado sirve
  igual de bien para todos.
- `api-gateway` (`apps/backend/gateway/Dockerfile`) es el único de los 11 que **no**
  usa turbo (`pnpm --filter @repo/api-gateway run build` directo, patrón ya distinto
  desde antes — ver comentario en el propio archivo) — sí lleva el cache mount del
  pnpm store, pero no el de turbo porque no aplica.
- `ec2-deploy.sh` ahora antepone `DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1` a cada
  `docker compose build` — sin esas dos env vars, Compose puede usar el builder legacy
  (no BuildKit) según la versión/config del host, y `--mount` fallaría directo.

No medido todavía en las instancias reales (ver "Pendiente") — el build en frío del
primer servicio de cada host sigue pagando el costo completo (cache vacía), la
ganancia es en los builds *siguientes* al mismo host: reinstalar dependencias o
recompilar `@repo/ui`/`@repo/backend-commons` para el segundo/tercer servicio del
mismo compose file ya no debería repetir ese trabajo de cero.

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

## Estado a esta fecha (2026-08-20/21)

- ✅ **Las 4 instancias están arriba y verificadas de punta a punta**: `core`
  (Postgres+Redis+`core-service`, 12 migraciones), `auth-gateway`
  (`auth-service`+`api-gateway`, 4 migraciones, `GET /health` 200 desde fuera de la
  VPC), `extras` (`alexa-service`+`ai-service`), `frontend` (las 6 apps Next.js
  arriba, incluido `web-shell` sirviendo en el puerto 80).
- ✅ **`pnpm seed` corrido con éxito** contra las 2 bases reales (túnel SSH local →
  Postgres de `core`, ver procedimiento abajo). Cuentas de prueba disponibles (mismas
  que el modo mock del frontend, ver `packages/seed/src/index.js`):
  `20233tn102@utez.edu.mx` / `admin123` (administrador), `cm@bananagram.mx` /
  `cm123456` (community_manager), `disenador@bananagram.mx` / `diseno123`,
  `cliente@bananagram.mx` / `cliente123`, `alex@bananagram.mx` / `alex12345`,
  `multi@bananagram.mx` / `multi12345` (multi-rol).
- ✅ **Bug real encontrado y corregido**: `apps/frontend/web-shell/middleware.ts`
  redirigía el login con `NextResponse.redirect(new URL('/login', ZONE_URLS.authFront))`
  — `ZONE_URLS.authFront` es una URL pensada para el proxy del servidor, pero el
  redirect lo sigue el navegador, así que fuera de `localhost` nunca era alcanzable.
  Fix: `new URL('/login', request.url)` (relativo al origen de la request). **Verificado
  en producción** vía `curl -D - http://52.200.97.70/` → `Location: /login` (antes:
  `Location: http://auth-front:3012/login`, inalcanzable). Commiteado (`56a7d4f`).
- ✅ **Bug real encontrado y corregido**: la cache de BuildKit+turbo (ver sección
  dedicada arriba) rompía `core-service` — `turbo.json` no declaraba el cliente de
  Prisma como output cacheable, así que un cache-hit no lo regeneraba y el contenedor
  crasheaba con `Cannot find module '.../node_modules/.prisma-client'`. Fix en
  `turbo.json` (agrega `node_modules/.prisma-client/**` a los outputs). Commiteado
  (`fc68939`).
- ✅ **S3 real accesible también desde local** (no solo desde los EC2) — credenciales
  temporales del Learner Lab puestas en `~/.aws/credentials`, verificado listando el
  bucket con el SDK. Ver sección "Probar contra el bucket S3 real desde local" arriba.
- ⚠️ **Interrupción real de la sesión del Learner Lab a mitad del redespliegue**
  (ver detalle en "Pendiente" más abajo) — las 4 instancias se volvieron
  inalcanzables simultáneamente y luego volvieron al reiniciar la sesión del lab,
  con contenedores parados pero imágenes/volúmenes intactos (sin pérdida de datos:
  ni las migraciones ni, después, el seed se perdieron). El build de `frontend` se
  había cortado a mitad (en `posts-front`), dejando a `web-shell` corriendo una
  imagen vieja **sin** el fix del redirect — se detectó por curl mostrando la URL
  interna vieja, se reconstruyeron `posts-front`+`web-shell` a mano y se verificó de
  nuevo. Lección: después de una interrupción de este tipo, no asumir que
  `docker compose up -d` por sí solo deja todo con el código más reciente — hay que
  confirmar que las imágenes realmente se reconstruyeron completas antes de asumir
  que el fix desplegado es el que está corriendo.
- 🔲 **Sin push todavía** — el trabajo de esta sesión (fix de cache Turbo/Prisma, fix
  de middleware, documentación) ya está commiteado en `feat/dev-desp` en commits
  separados, sin coautoría. Falta: probar el flujo completo en el navegador
  (login + al menos una acción real) antes de hacer push y mergear a `develop`.

## Pendiente

1. Prueba real en navegador: entrar a `http://52.200.97.70`, login con una de las
   cuentas de prueba de arriba, y al menos un flujo completo (crear marca,
   publicación, etc.) — para confirmar que las 4 instancias realmente arman el
   sistema completo, no solo que cada una responde por separado.
2. Una vez confirmado en el navegador: push de `feat/dev-desp` y merge a `develop`.
3. TLS/dominio — hoy todo es HTTP plano sobre IPs públicas crudas. Sin Nginx ni
   certificados todavía en ninguna de las 4 instancias.
4. Secretos hoy se escriben a mano por SSH — no hay Secrets Manager ni nada
   automatizado. Aceptable para este alcance (proyecto escolar, cuenta de lab
   temporal), documentado acá para no repetir el trabajo de memoria si hay que
   rehacer una instancia.
5. Granularidad de los security groups internos (VPC CIDR completo en vez de
   SG-a-SG) — ver nota en la sección de security groups arriba.
6. La sesión del AWS Academy Learner Lab tiene un límite de tiempo (se vio un
   contador de "tiempo restante" en el panel del lab) — cuando termine o se reinicie,
   las credenciales de `~/.aws/credentials` dejan de servir y **puede que las 4
   instancias EC2 también se detengan/pierdan** según cómo esté configurado el lab.
   **Confirmado en vivo (2026-08-20)**: a mitad de este mismo redespliegue, con
   `core` y `auth-gateway` ya sanos y verificados (containers arriba, migraciones
   aplicadas), las 4 instancias se volvieron inalcanzables al mismo tiempo — SSH,
   HTTP y hasta el puerto 22 crudo dejaron de responder en las 4, mientras la
   conexión a internet local seguía funcionando normal (verificado con
   `curl https://www.google.com` → 200 en el mismo momento). Esto pasó sin ninguna
   acción de nuestro lado sobre las instancias — coincide con el límite de tiempo de
   la sesión del lab. **Resuelto en el momento**: el usuario reinició la sesión desde
   el panel del Learner Lab y, sin ninguna acción adicional nuestra, las 4 instancias
   volvieron a responder por SSH/HTTP con las **mismas IPs públicas** (no hizo falta
   reasociar Elastic IP ni reescribir `~/.aws/credentials` esta vez) — resultaron
   estar *paradas* (containers detenidos) pero no *perdidas*: las imágenes Docker y
   el volumen de Postgres (con las migraciones ya aplicadas) seguían intactos, así
   que alcanzó con `docker compose up -d` en las 4, sin rebuild. No confirmado si
   esto es el comportamiento garantizado del lab o si tuvimos suerte esta vez — seguir
   tratando cualquier interrupción de sesión como un riesgo real de pérdida.
