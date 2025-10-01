# H5 Multi-tenant Deployment - MuniStream Citizen Portal

Este documento describe la configuración de despliegue H5 multi-tenant para el portal ciudadano de MuniStream.

## 🏗️ Arquitectura H5

La arquitectura H5 despliega **3 contenedores** del mismo código base en una sola instancia EC2 (Workflow), cada uno sirviendo a un cliente diferente:

### 📋 Mapeo de Contenedores

| Cliente | Container Name | Puerto Host | Puerto Interno | Base de Datos |
|---------|----------------|-------------|----------------|---------------|
| **Core** | `citizen-portal-core` | `3000` | `3000` | `munistream_core` |
| **Conapesca** | `citizen-portal-conapesca` | `3001` | `3000` | `munistream_conapesca` |
| **Tesoreriacdmx** | `citizen-portal-teso` | `3002` | `3000` | `munistream_tesoreriacdmx` |

### 🌐 Routing

El ALB dirige el tráfico basado en el dominio:

```
core-dev.munistream.local/           → nginx → localhost:3000
conapesca-dev.munistream.local/      → nginx → localhost:3001
tesoreriacdmx-dev.munistream.local/  → nginx → localhost:3002
```

## 🚀 Archivos de Configuración

### `docker-compose.h5.yml`
Configuración Docker Compose para los 3 contenedores multi-tenant.

### `.env.h5`
Variables de entorno específicas para H5, incluyendo:
- URLs de base de datos por cliente
- Endpoints de API y Keycloak
- Configuración de dominio

### `deploy-h5.sh`
Script de despliegue que:
- Para contenedores existentes
- Construye nuevas imágenes
- Inicia los 3 contenedores
- Verifica el estado

## 🔧 Despliegue Local

Para probar localmente:

```bash
# 1. Configurar variables de entorno
export AURORA_ENDPOINT="munistream-dev-cluster.cluster-ckf4usc8u21l.us-east-1.rds.amazonaws.com"
export DB_PASSWORD="your-db-password"

# 2. Ejecutar despliegue H5
./deploy-h5.sh

# 3. Verificar contenedores
docker-compose -f docker-compose.h5.yml ps
```

## 🔄 CI/CD Pipeline

### Rama `develop`
- **Trigger**: Push a la rama `develop`
- **Target**: Workflow EC2 instance (dev environment)
- **Acción**: Despliega los 3 contenedores automáticamente

### Workflow Steps:
1. **Build**: Construye la imagen Docker
2. **Deploy**: Despliega a Workflow EC2
3. **Test**: Verifica health checks del ALB
4. **Notify**: Notifica el estado del despliegue

## 🗂️ Variables de Entorno

### Variables CI/CD (GitHub Secrets)
```yaml
AWS_ROLE_ARN: arn:aws:iam::948532067954:role/github-actions-role
```

### Variables Automáticas (del SSM)
```yaml
DB_PASSWORD: /munistream/dev/database/password
AURORA_ENDPOINT: munistream-dev-cluster.cluster-ckf4usc8u21l.us-east-1.rds.amazonaws.com
```

### Variables por Cliente
```yaml
# Core
CLIENT_NAME: core
VITE_API_URL: http://localhost:8000/api/v1
VITE_KEYCLOAK_URL: http://localhost:9000

# Conapesca
CLIENT_NAME: conapesca
VITE_API_URL: http://localhost:8001/api/v1
VITE_KEYCLOAK_URL: http://localhost:9001

# Tesoreriacdmx
CLIENT_NAME: tesoreriacdmx
VITE_API_URL: http://localhost:8002/api/v1
VITE_KEYCLOAK_URL: http://localhost:9002
```

## 🔍 Monitoring y Logs

### Verificar Estado de Contenedores
```bash
docker-compose -f docker-compose.h5.yml ps
```

### Ver Logs
```bash
# Todos los contenedores
docker-compose -f docker-compose.h5.yml logs

# Contenedor específico
docker-compose -f docker-compose.h5.yml logs citizen-portal-conapesca
```

### Health Check
```bash
# Verificar que todos los puertos respondan
curl http://localhost:3000  # Core
curl http://localhost:3001  # Conapesca
curl http://localhost:3002  # Tesoreriacdmx
```

## 🔗 Integración con Otros Servicios

### API Backend
- Cada contenedor apunta a su API correspondiente:
  - Core → `localhost:8000`
  - Conapesca → `localhost:8001`
  - Tesoreriacdmx → `localhost:8002`

### Keycloak
- Cada contenedor usa su realm específico:
  - Core → `localhost:9000/realms/core`
  - Conapesca → `localhost:9001/realms/conapesca`
  - Tesoreriacdmx → `localhost:9002/realms/tesoreriacdmx`

## 📚 Próximos Pasos

1. **Configurar** rama develop en otros repositorios
2. **Desplegar** Admin Frontend (`munistream-admin-frontend`)
3. **Desplegar** API Backend (`munistream-workflow`)
4. **Configurar** Keycloak realms (`munistream-keycloak`)
5. **Configurar** Airflow DAGs (`munistream-orchestra`)

## 🆘 Troubleshooting

### Contenedores no inician
```bash
# Verificar logs
docker-compose -f docker-compose.h5.yml logs

# Verificar red
docker network ls | grep munistream

# Limpiar y reiniciar
docker-compose -f docker-compose.h5.yml down --remove-orphans
./deploy-h5.sh
```

### Puertos ocupados
```bash
# Verificar puertos en uso
netstat -tlnp | grep -E ':(3000|3001|3002)'

# Parar contenedores existentes
docker stop $(docker ps -q --filter "name=citizen-portal-")
```