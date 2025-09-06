# Spark Social Media Platform - Deployment Guide

## 🚀 Overview

This guide covers the complete deployment setup for the Spark social media platform, including CI/CD pipelines, containerization, Kubernetes deployment, and monitoring.

## 📋 Prerequisites

### Required Tools
- **Docker** (20.10+)
- **Kubernetes** (1.21+)
- **Helm** (3.8+)
- **kubectl** (1.21+)
- **Node.js** (18+)
- **Git**

### Required Services
- **GitHub Container Registry** (ghcr.io)
- **Kubernetes Cluster** (GKE, EKS, AKS, or local)
- **Domain names** (app.spark.com, api.spark.com)
- **SSL certificates** (Let's Encrypt recommended)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React)       │◄──►│   (Node.js)     │◄──►│   (PostgreSQL)  │
│   Port: 80      │    │   Port: 4000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx         │    │   Redis Cache   │    │   File Storage  │
│   (Ingress)     │    │   Port: 6379    │    │   (PVC)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🐳 Containerization

### Frontend Dockerfile
```dockerfile
# Multi-stage build for optimized production image
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Backend Dockerfile
```dockerfile
# Multi-stage build with security optimizations
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
USER nodejs
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

## ☸️ Kubernetes Deployment

### 1. Namespace Setup
```bash
kubectl create namespace spark-production
kubectl create namespace spark-staging
```

### 2. Secrets Configuration
```bash
# Create secrets for production
kubectl create secret generic spark-secrets \
  --from-literal=database-url="postgresql://user:pass@host:5432/spark" \
  --from-literal=jwt-secret="your-jwt-secret" \
  --from-literal=jwt-refresh-secret="your-jwt-refresh-secret" \
  --from-literal=redis-password="redis-password" \
  --from-literal=vapid-public-key="your-vapid-public-key" \
  --from-literal=vapid-private-key="your-vapid-private-key" \
  -n spark-production
```

### 3. Persistent Volumes
```bash
# Apply PVC configurations
kubectl apply -f k8s/production/pvc.yaml
```

### 4. Deploy Applications
```bash
# Deploy using Helm
helm upgrade --install spark-production helm-chart/spark \
  --namespace spark-production \
  --values helm-chart/spark/values-production.yaml \
  --wait --timeout=10m
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
The CI/CD pipeline includes:

1. **Frontend Testing & Build**
   - Linting and type checking
   - Unit tests
   - Production build
   - Artifact upload

2. **Backend Testing & Build**
   - Linting and type checking
   - Unit tests
   - Database migrations
   - Security audit
   - Production build

3. **Security Scanning**
   - Trivy vulnerability scanning
   - SARIF report upload

4. **Load Testing**
   - Comprehensive API load tests
   - Performance validation
   - Breaking point analysis

5. **Docker Image Build & Push**
   - Multi-architecture builds
   - Container registry push
   - Image caching

6. **Deployment**
   - Staging deployment (develop branch)
   - Production deployment (master branch)
   - Health checks
   - Rollback capabilities

### Pipeline Triggers
- **Push to master**: Full pipeline + production deployment
- **Push to develop**: Full pipeline + staging deployment
- **Pull requests**: Testing and security scanning only

## 📊 Monitoring & Observability

### Prometheus Metrics
- **Application metrics**: Response times, request rates, error rates
- **System metrics**: CPU, memory, disk usage
- **Database metrics**: Connection pools, query performance
- **Cache metrics**: Hit rates, memory usage

### Grafana Dashboards
- **Application Overview**: Key performance indicators
- **Infrastructure**: System resource utilization
- **Database Performance**: Query performance and connections
- **User Analytics**: User engagement metrics

### Alerting Rules
- **Critical**: Service down, database issues, high error rates
- **Warning**: High response times, resource usage, pod restarts
- **Info**: Deployment notifications, scaling events

## 🚀 Deployment Commands

### Quick Deploy
```bash
# Deploy to staging
./scripts/deploy.sh staging v1.0.0

# Deploy to production
./scripts/deploy.sh production v1.0.0
```

### Manual Deployment
```bash
# Build and push images
docker build -f Dockerfile.frontend -t ghcr.io/kwatu05/spark-frontend:v1.0.0 .
docker build -f server/Dockerfile -t ghcr.io/kwatu05/spark-backend:v1.0.0 ./server
docker push ghcr.io/kwatu05/spark-frontend:v1.0.0
docker push ghcr.io/kwatu05/spark-backend:v1.0.0

# Deploy with Helm
helm upgrade --install spark-production helm-chart/spark \
  --namespace spark-production \
  --set frontend.image.tag=v1.0.0 \
  --set backend.image.tag=v1.0.0 \
  --wait
```

## 🔧 Configuration

### Environment Variables
```bash
# Required environment variables
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/spark
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-jwt-refresh-secret
REDIS_HOST=redis-service
REDIS_PORT=6379
REDIS_PASSWORD=redis-password
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
```

### Helm Values
Key configuration options in `values.yaml`:
- **Replica counts**: Frontend and backend scaling
- **Resource limits**: CPU and memory constraints
- **Autoscaling**: HPA configuration
- **Ingress**: SSL and routing configuration
- **Persistence**: Storage configuration

## 🔍 Troubleshooting

### Common Issues

1. **Pod Startup Failures**
   ```bash
   kubectl describe pod <pod-name> -n spark-production
   kubectl logs <pod-name> -n spark-production
   ```

2. **Database Connection Issues**
   ```bash
   kubectl exec -it <backend-pod> -n spark-production -- npx prisma db push
   ```

3. **Image Pull Errors**
   ```bash
   kubectl create secret docker-registry ghcr-secret \
     --docker-server=ghcr.io \
     --docker-username=<username> \
     --docker-password=<token> \
     -n spark-production
   ```

4. **Ingress Issues**
   ```bash
   kubectl describe ingress spark-ingress -n spark-production
   kubectl get certificates -n spark-production
   ```

### Health Checks
```bash
# Check application health
curl -f https://api.spark.com/health
curl -f https://app.spark.com/health

# Check Kubernetes resources
kubectl get all -n spark-production
kubectl top pods -n spark-production
```

## 📈 Scaling

### Horizontal Pod Autoscaling
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spark-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spark-backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Vertical Pod Autoscaling
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: spark-backend-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: spark-backend
  updatePolicy:
    updateMode: "Auto"
```

## 🔒 Security

### Security Best Practices
- **Non-root containers**: All containers run as non-root users
- **Read-only filesystems**: Containers use read-only root filesystems
- **Resource limits**: CPU and memory limits enforced
- **Network policies**: Restrictive network access
- **Secrets management**: Kubernetes secrets for sensitive data
- **Image scanning**: Automated vulnerability scanning
- **SSL/TLS**: End-to-end encryption

### Network Policies
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: spark-network-policy
spec:
  podSelector:
    matchLabels:
      app: spark-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: spark-frontend
    ports:
    - protocol: TCP
      port: 4000
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Helm Documentation](https://helm.sh/docs/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prometheus Monitoring](https://prometheus.io/docs/)
- [Grafana Dashboards](https://grafana.com/docs/)

## 🆘 Support

For deployment issues or questions:
- **GitHub Issues**: [Create an issue](https://github.com/Kwatu05/spark/issues)
- **Documentation**: Check this guide and inline code comments
- **Monitoring**: Use Grafana dashboards and Prometheus alerts
- **Logs**: Check application and system logs via kubectl
