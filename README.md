# ConvoAssemble

Sistema web para administrar asambleas de condominios, mociones y votaciones en tiempo real. El proyecto usa Next.js, Express, TypeScript, Prisma y Supabase PostgreSQL.

## Requisitos

- Docker Desktop iniciado.
- Docker Compose v2 (`docker compose version`).
- Un proyecto de Supabase, en la nube o local.
- Git, si se va a clonar el repositorio.

No necesitas instalar Node.js para ejecutar la aplicación con Docker.

## Inicio rápido con Docker

Todos los comandos siguientes se ejecutan desde la carpeta raíz del proyecto, donde está `docker-compose.yml`.

### 1. Crear el archivo de entorno

PowerShell en Windows:

```powershell
Copy-Item .env.example .env
notepad .env
```

Bash, macOS o Linux:

```bash
cp .env.example .env
nano .env
```

Completa al menos estas variables en `.env`:

```dotenv
SUPABASE_URL=https://TU_PROYECTO.supabase.co
SUPABASE_ANON_KEY=tu_clave_anon
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role
DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
JWT_SECRET=tu_jwt_secret
```

`SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL` y `JWT_SECRET` son secretos. No los publiques ni los envíes al frontend.

### 2. Aplicar la base de datos

La forma recomendada es ejecutar las migraciones SQL en el SQL Editor de Supabase, en este orden:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_notifications.sql`
3. `supabase/migrations/003_organization_status.sql`

También puedes usar Prisma si `DATABASE_URL` y `DIRECT_URL` están configuradas:

```powershell
docker compose run --rm prisma-migrate
```

### 3. Construir y levantar la aplicación

```powershell
docker compose up -d --build
```

La primera ejecución puede tardar porque Docker instala las dependencias dentro de volúmenes persistentes.

URLs disponibles:

- Frontend: <http://localhost:3000>
- API: <http://localhost:4000>
- Salud del backend: <http://localhost:4000/health>

### 4. Confirmar que los servicios funcionan

```powershell
docker compose ps
Invoke-WebRequest -UseBasicParsing http://localhost:4000/health
Invoke-WebRequest -UseBasicParsing http://localhost:3000
```

En macOS/Linux puedes comprobar la salud con:

```bash
curl http://localhost:4000/health
curl -I http://localhost:3000
```

## Comandos diarios

Ver logs en tiempo real:

```powershell
docker compose logs -f frontend
docker compose logs -f backend
```

Recrear los servicios después de cambiar dependencias o Dockerfiles:

```powershell
docker compose up -d --build --force-recreate
```

Detener la aplicación sin borrar datos ni volúmenes:

```powershell
docker compose down
```

Detenerla y borrar los volúmenes de dependencias, útil cuando un paquete no se resuelve:

```powershell
docker compose down -v
docker compose up -d --build
```

No uses `down -v` si necesitas conservar datos almacenados en volúmenes locales.

## Pruebas y compilación

Ejecutar pruebas del backend dentro de Docker:

```powershell
docker compose exec backend npm test
```

Comprobar TypeScript del backend:

```powershell
docker compose exec backend npx tsc --noEmit
```

Compilar el frontend dentro de Docker:

```powershell
docker compose exec frontend npm run build
```

Los avisos de hooks de React no impiden el desarrollo. Un error de compilación o un `Module not found` sí debe corregirse antes de publicar.

## Flujo principal

1. Inicia sesión en `http://localhost:3000/login`.
2. Selecciona el condominio activo.
3. Entra en **Nueva Asamblea**.
4. Define el título y las mociones.
5. Crea la asamblea y abre su sala desde **Asambleas Recientes**.
6. Inicia la asamblea para habilitar las votaciones.

Las asambleas y mociones se filtran por `organizationId`. El condominio activo debe mantenerse seleccionado para que el listado y el detalle muestren los mismos datos.

## Estructura del proyecto

```text
backend/       API Express, casos de uso, Prisma y repositorios
frontend/      Aplicación Next.js y panel administrativo
supabase/      Migraciones SQL
docker-compose.yml
.env.example   Plantilla de variables de entorno
```

## Solución de problemas

### `Failed to fetch` o el backend no responde

```powershell
docker compose ps
docker compose logs --tail=100 backend
Invoke-WebRequest -UseBasicParsing http://localhost:4000/health
```

Si el backend no está activo:

```powershell
docker compose up -d backend
```

### `Module not found` en el frontend

```powershell
docker compose exec frontend npm install --prefer-offline
docker compose exec frontend sh -c "rm -rf .next"
docker compose restart frontend
```

### El detalle dice `Asamblea no encontrada`

Comprueba que el condominio activo sea el mismo con el que se creó la asamblea y revisa los logs:

```powershell
docker compose logs --tail=100 frontend
docker compose logs --tail=100 backend
```

La aplicación envía el `organizationId` en las consultas para evitar mezclar asambleas de distintos condominios.

### Cambié `.env` y no veo el cambio

Recrea los contenedores para que Docker vuelva a inyectar las variables:

```powershell
docker compose up -d --build --force-recreate
```

## Seguridad

- No subas `.env` al repositorio.
- La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el backend.
- Las votaciones tienen restricciones de base de datos para evitar votos duplicados.
- Las operaciones administrativas requieren autenticación y permisos.
- Los datos se aíslan por `organizationId`.