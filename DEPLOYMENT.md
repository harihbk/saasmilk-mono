# Deployment Guide for Milk Company Management System

## Overview
This guide provides instructions for deploying the Milk Company Management System using GitHub Actions CI/CD pipeline with multiple deployment targets.

## Table of Contents
- [Prerequisites](#prerequisites)
- [GitHub Secrets Setup](#github-secrets-setup)
- [Deployment Options](#deployment-options)
- [CI/CD Pipeline](#cicd-pipeline)
- [Monitoring](#monitoring)
- [Rollback Strategy](#rollback-strategy)

## Prerequisites

### Required Tools
- Git
- Docker & Docker Compose
- Node.js 18+ and npm
- MongoDB 6.0+
- Redis (optional, for caching)
- AWS CLI (for AWS deployment)
- Vercel CLI (for Vercel deployment)

### Required Accounts
- GitHub account with Actions enabled
- Docker Hub account (for container registry)
- AWS account (for ECS deployment)
- Vercel account (for staging deployment)
- Railway account (alternative deployment)

## GitHub Secrets Setup

Navigate to your repository → Settings → Secrets and variables → Actions, then add:

### Essential Secrets
```
# Docker Registry
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password

# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# JWT & Security
JWT_SECRET=generate-a-secure-random-string

# SaaS Admin
SAAS_ADMIN_EMAIL=admin@company.com
SAAS_ADMIN_PASSWORD=secure-password
```

### AWS Deployment Secrets
```
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
ECS_CLUSTER=milk-company-cluster
ECS_SERVICE=milk-company-service
CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id
```

### Platform-Specific Secrets
```
# Vercel (Staging)
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id

# Railway
RAILWAY_TOKEN=your-railway-token

# Monitoring
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
PRODUCTION_URL=https://your-production-domain.com
```

## Deployment Options

### 1. Local Development
```bash
# Clone repository
git clone https://github.com/your-username/milk-company.git
cd milk-company

# Install dependencies
npm install
cd api && npm install && cd ..

# Setup environment
cp .env.example .env
cp api/.env.example api/.env
# Edit .env files with your configuration

# Run with Docker Compose
docker-compose up -d

# Or run manually
npm run dev          # Frontend
cd api && npm run dev # Backend
```

### 2. Production Deployment (AWS ECS)
```bash
# Automatic deployment on push to main branch
git push origin main

# Manual deployment via GitHub Actions
# Go to Actions → Deploy to Production → Run workflow
```

### 3. Staging Deployment (Vercel)
```bash
# Automatic deployment on push to develop branch
git push origin develop

# Or trigger manually with staging environment
```

### 4. Docker Deployment
```bash
# Build images
docker build -t milk-company-frontend -f Dockerfile.frontend .
docker build -t milk-company-backend -f api/Dockerfile ./api

# Run with Docker Compose
docker-compose -f docker-compose.yml up -d

# Or deploy to any Docker host
docker run -p 3000:80 milk-company-frontend
docker run -p 8000:8000 milk-company-backend
```

## CI/CD Pipeline

### Continuous Integration (CI)
The CI pipeline runs on every push and pull request:

1. **Code Quality Checks**
   - Linting (ESLint)
   - Security audit
   - Dependency updates check

2. **Testing**
   - Unit tests
   - Integration tests
   - Coverage reports

3. **Build Verification**
   - Frontend build
   - Backend transpilation
   - Docker image build

### Continuous Deployment (CD)
The deployment pipeline triggers on:

1. **Push to main** → Production deployment
2. **Push to develop** → Staging deployment
3. **Manual trigger** → Choose environment

#### Deployment Steps:
1. Build and push Docker images
2. Deploy to target environment (AWS/Vercel/Railway)
3. Run health checks
4. Execute smoke tests
5. Send deployment notification
6. Rollback on failure

## Monitoring

### Health Checks
- **API Health**: `GET /api/health`
- **Frontend**: `GET /`
- **Database**: MongoDB connection check
- **Redis**: Connection check (if enabled)

### Logging
- Application logs: CloudWatch/Datadog
- Error tracking: Sentry
- Performance: New Relic

### Alerts
Configure alerts for:
- Deployment failures
- Health check failures
- High error rates
- Performance degradation

## Rollback Strategy

### Automatic Rollback
The pipeline automatically rolls back if:
- Health checks fail after deployment
- Smoke tests fail
- Critical errors detected

### Manual Rollback
```bash
# Using AWS ECS
aws ecs update-service \
  --cluster milk-company-cluster \
  --service milk-company-service \
  --task-definition milk-company:previous-version

# Using Docker
docker-compose down
docker-compose up -d --force-recreate

# Using Git
git revert HEAD
git push origin main
```

## Environment Configuration

### Development
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/milk-company-dev
REACT_APP_API_URL=http://localhost:8000/api
```

### Staging
```env
NODE_ENV=staging
MONGODB_URI=mongodb+srv://staging-cluster/milk-company-staging
REACT_APP_API_URL=https://staging.milkcompany.com/api
```

### Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://production-cluster/milk-company
REACT_APP_API_URL=https://api.milkcompany.com
```

## SSL/TLS Configuration

For production deployments:

1. **Generate SSL certificates**
```bash
# Using Let's Encrypt
certbot certonly --standalone -d yourdomain.com
```

2. **Mount certificates in Docker**
```yaml
volumes:
  - ./ssl/cert.pem:/etc/nginx/ssl/cert.pem:ro
  - ./ssl/key.pem:/etc/nginx/ssl/key.pem:ro
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check Node.js version compatibility
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

2. **Deployment Failures**
   - Verify GitHub secrets are set correctly
   - Check AWS/Docker credentials
   - Review deployment logs in GitHub Actions

3. **Database Connection Issues**
   - Verify MongoDB URI and credentials
   - Check network/firewall settings
   - Ensure IP whitelist includes deployment servers

4. **Container Issues**
   - Check Docker daemon status
   - Verify port availability
   - Review container logs: `docker logs <container-id>`

## Security Best Practices

1. **Secrets Management**
   - Never commit secrets to repository
   - Use GitHub Secrets for CI/CD
   - Rotate credentials regularly

2. **Container Security**
   - Run containers as non-root user
   - Keep base images updated
   - Scan images for vulnerabilities

3. **Network Security**
   - Use HTTPS everywhere
   - Implement rate limiting
   - Configure CORS properly

4. **Database Security**
   - Use connection string with SSL
   - Implement IP whitelisting
   - Regular backups

## Support

For deployment issues:
1. Check GitHub Actions logs
2. Review application logs
3. Consult this documentation
4. Create an issue in the repository

## License

This deployment configuration is part of the Milk Company Management System.
© 2024 Milk Company. All rights reserved.