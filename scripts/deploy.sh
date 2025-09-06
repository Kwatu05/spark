#!/bin/bash

# Spark Deployment Script
# Usage: ./scripts/deploy.sh [environment] [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
NAMESPACE="spark-${ENVIRONMENT}"

echo -e "${BLUE}🚀 Starting Spark deployment...${NC}"
echo -e "${BLUE}Environment: ${ENVIRONMENT}${NC}"
echo -e "${BLUE}Version: ${VERSION}${NC}"
echo -e "${BLUE}Namespace: ${NAMESPACE}${NC}"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command_exists kubectl; then
    echo -e "${RED}❌ kubectl is not installed${NC}"
    exit 1
fi

if ! command_exists helm; then
    echo -e "${RED}❌ helm is not installed${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}❌ docker is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites are installed${NC}"

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" >/dev/null 2>&1; then
    echo -e "${YELLOW}📦 Creating namespace: ${NAMESPACE}${NC}"
    kubectl create namespace "$NAMESPACE"
else
    echo -e "${GREEN}✅ Namespace ${NAMESPACE} already exists${NC}"
fi

# Build and push Docker images
echo -e "${YELLOW}🐳 Building and pushing Docker images...${NC}"

# Build frontend
echo -e "${BLUE}Building frontend image...${NC}"
docker build -f Dockerfile.frontend -t ghcr.io/kwatu05/spark-frontend:${VERSION} .
docker push ghcr.io/kwatu05/spark-frontend:${VERSION}

# Build backend
echo -e "${BLUE}Building backend image...${NC}"
docker build -f server/Dockerfile -t ghcr.io/kwatu05/spark-backend:${VERSION} ./server
docker push ghcr.io/kwatu05/spark-backend:${VERSION}

echo -e "${GREEN}✅ Docker images built and pushed successfully${NC}"

# Deploy with Helm
echo -e "${YELLOW}📦 Deploying with Helm...${NC}"

# Update Helm dependencies
helm dependency update helm-chart/spark

# Deploy the application
helm upgrade --install spark-${ENVIRONMENT} helm-chart/spark \
    --namespace ${NAMESPACE} \
    --set frontend.image.tag=${VERSION} \
    --set backend.image.tag=${VERSION} \
    --set env.NODE_ENV=${ENVIRONMENT} \
    --values helm-chart/spark/values-${ENVIRONMENT}.yaml \
    --wait \
    --timeout=10m

echo -e "${GREEN}✅ Helm deployment completed${NC}"

# Wait for deployment to be ready
echo -e "${YELLOW}⏳ Waiting for deployment to be ready...${NC}"
kubectl wait --for=condition=available --timeout=300s deployment/spark-frontend -n ${NAMESPACE}
kubectl wait --for=condition=available --timeout=300s deployment/spark-backend -n ${NAMESPACE}

echo -e "${GREEN}✅ Deployment is ready${NC}"

# Run health checks
echo -e "${YELLOW}🏥 Running health checks...${NC}"

# Get service URLs
FRONTEND_URL=$(kubectl get service spark-frontend-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
BACKEND_URL=$(kubectl get service spark-backend-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

if [ -n "$FRONTEND_URL" ]; then
    echo -e "${BLUE}Testing frontend health...${NC}"
    curl -f http://${FRONTEND_URL}/health || echo -e "${RED}❌ Frontend health check failed${NC}"
fi

if [ -n "$BACKEND_URL" ]; then
    echo -e "${BLUE}Testing backend health...${NC}"
    curl -f http://${BACKEND_URL}:4000/health || echo -e "${RED}❌ Backend health check failed${NC}"
fi

echo -e "${GREEN}✅ Health checks completed${NC}"

# Display deployment information
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo -e "${BLUE}📊 Deployment Information:${NC}"
echo -e "  Environment: ${ENVIRONMENT}"
echo -e "  Version: ${VERSION}"
echo -e "  Namespace: ${NAMESPACE}"
echo -e "  Frontend URL: http://${FRONTEND_URL}"
echo -e "  Backend URL: http://${BACKEND_URL}:4000"

# Show pod status
echo -e "${BLUE}📋 Pod Status:${NC}"
kubectl get pods -n ${NAMESPACE}

echo -e "${GREEN}🚀 Spark deployment completed successfully!${NC}"
