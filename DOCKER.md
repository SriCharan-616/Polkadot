# Docker Deployment Guide

This guide covers deploying the Private Proposal Voting application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop (or Docker + Docker Compose)
- 2GB free disk space
- Ports 3000 and 5000 available

## Quick Start with Docker Compose

### 1. Build and Run

```bash
# From project root
docker-compose up --build
```

This will:
- Build backend image from `backend/Dockerfile`
- Build frontend image from `frontend/Dockerfile`
- Start both services
- Create SQLite database automatically

You should see:
```
backend   | Server listening on port 5000
frontend  | ▲ Next.js 14.0.0
frontend  | - Local: http://localhost:3000
```

### 2. Access Application

Open browser:
- Frontend: **http://localhost:3000**

### 3. Stop Services

```bash
docker-compose down
```

## Individual Docker Builds

### Build Backend Image

```bash
cd backend
docker build -t zk-voting-backend .
docker run -p 5000:5000 zk-voting-backend
```

### Build Frontend Image

```bash
cd frontend
docker build -t zk-voting-frontend .
docker run -p 3000:3000 zk-voting-frontend
```

## Production Deployment

### 1. Update docker-compose.yml for Production

```yaml
version: '3.8'

services:
  backend:
    image: myregistry.azurecr.io/zk-voting-backend:latest
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
    # Remove volumes for production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  frontend:
    image: myregistry.azurecr.io/zk-voting-frontend:latest
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: https://api.voting.example.com
      NODE_ENV: production
    depends_on:
      backend:
        condition: service_healthy
```

### 2. Push to Registry

```bash
# For Azure Container Registry
az acr build --registry myregistry --image zk-voting-backend:latest ./backend
az acr build --registry myregistry --image zk-voting-frontend:latest ./frontend
```

## Environment Variables

### Backend (Docker)

Create `.env` file in `backend/`:
```env
NODE_ENV=production
PORT=5000
DATABASE_PATH=/data/voting.db
```

### Frontend (Docker)

Create `.env.local` file in `frontend/`:
```env
NEXT_PUBLIC_API_URL=https://your-backend-url.com
```

## Database Persistence

### SQLite Backup

```bash
# Backup database from container
docker cp <backend-container-id>:/app/voting.db ./voting.db.backup

# Restore from backup
docker cp ./voting.db.backup <backend-container-id>:/app/voting.db
```

### Volume Mounting

For persistent data:

```yaml
services:
  backend:
    volumes:
      - db_data:/app/data

volumes:
  db_data:
```

## Networking

### Docker Compose Network

Services communicate via service names:
```javascript
// Frontend can reach backend at:
const apiUrl = 'http://backend:5000';
```

### Custom Network (Advanced)

```bash
docker network create voting-net
docker run --network voting-net -p 5000:5000 zk-voting-backend
docker run --network voting-net -p 3000:3000 zk-voting-frontend
```

## Monitoring & Logs

### View Service Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend

# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Container Health

```bash
# Check health status
docker-compose ps

# Check specific container
docker inspect <container-id>
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# Kill process or use different port
docker-compose down
# Edit docker-compose.yml ports
docker-compose up
```

### Database Lock

```bash
# Stop all containers
docker-compose down

# Remove database
docker volume rm <project>_db_data

# Restart
docker-compose up --build
```

### Build Failures

```bash
# Clear build cache
docker-compose build --no-cache

# Rebuild everything
docker-compose down -v
docker-compose up --build
```

## Performance Optimization

### Multi-stage Builds

Already implemented in Dockerfiles to:
- Reduce image size
- Separate build and runtime environments
- Optimize layer caching

### Layer Caching

```bash
# Dockerfile best practices already applied:
# - Install dependencies first
# - Copy code second
# - Build last
```

## Security Best Practices

### Image Security

1. Use specific base image versions (not `latest`)
   ```dockerfile
   FROM node:18.16.1-alpine  # Not node:18
   ```

2. Run as non-root user
   ```dockerfile
   RUN addgroup -g 1001 nodejs
   RUN adduser -S nodejs -u 1001
   USER nodejs
   ```

3. Scan for vulnerabilities
   ```bash
   docker scan zk-voting-backend:latest
   ```

### Runtime Security

1. Use secrets for sensitive data
   ```bash
   docker secret create api_key ./secret.txt
   docker run --secret api_key service
   ```

2. Restrict resource usage
   ```yaml
   services:
     backend:
       mem_limit: 512m
       cpus: '1.0'
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Build and Push Docker Images

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Login to Registry
        run: |
          docker login -u ${{ secrets.REGISTRY_USER }} \
            -p ${{ secrets.REGISTRY_PASSWORD }}
      
      - name: Build & Push Backend
        run: |
          docker build -t myregistry/zk-voting-backend ./backend
          docker push myregistry/zk-voting-backend
      
      - name: Build & Push Frontend
        run: |
          docker build -t myregistry/zk-voting-frontend ./frontend
          docker push myregistry/zk-voting-frontend
```

## Kubernetes Deployment (Advanced)

### Create Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zk-voting-backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: myregistry.azurecr.io/zk-voting-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 10
          periodSeconds: 30
```

### Deploy to Kubernetes

```bash
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml
kubectl get pods
```

---

For more Docker info: https://docs.docker.com/
For Kubernetes: https://kubernetes.io/docs/
