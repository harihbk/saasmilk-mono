# GitHub Setup Guide for Milk Company Management System

## 🚀 Quick Setup Instructions

### Step 1: Create GitHub Repository

1. **Go to GitHub.com** and sign in to your account
2. **Click the "+" icon** in the top right → "New repository"
3. **Repository Settings:**
   ```
   Repository name: milk-company-management
   Description: Full-stack milk company management system with CI/CD
   Visibility: Public (or Private if you prefer)
   ✅ Add a README file: NO (we already have one)
   ✅ Add .gitignore: NO (we already have one)
   ✅ Choose a license: MIT License (recommended)
   ```

4. **Click "Create repository"**

### Step 2: Connect Local Repository to GitHub

Copy and run these commands in your terminal:

```bash
# Check current remote (if any)
git remote -v

# If no remote exists, add GitHub as origin
git remote add origin https://github.com/YOUR_USERNAME/milk-company-management.git

# If remote exists but wrong URL, update it
git remote set-url origin https://github.com/YOUR_USERNAME/milk-company-management.git

# Push your code to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username!**

### Step 3: Configure GitHub Secrets for CI/CD

1. **Go to your repository** on GitHub
2. **Click Settings** → **Secrets and variables** → **Actions**
3. **Click "New repository secret"** and add each of these:

#### 🔐 Essential Secrets (Required for Deployment)

```bash
# Docker Hub Credentials
DOCKER_USERNAME=your-dockerhub-username
DOCKER_PASSWORD=your-dockerhub-password

# Database Connection
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/milk-company?retryWrites=true&w=majority

# Security Keys
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# SaaS Admin Credentials
SAAS_ADMIN_EMAIL=admin@yourdomain.com
SAAS_ADMIN_PASSWORD=your-secure-admin-password

# Production URL
PRODUCTION_URL=https://yourdomain.com
```

#### 🛠️ Server Deployment Secrets (if using your own server)

```bash
# Your Server Details
SERVER_HOST=192.168.1.100
SERVER_USERNAME=root
SERVER_PASSWORD=your-server-password
SERVER_PORT=22
```

#### ☁️ Cloud Provider Secrets (Optional - choose one)

**For AWS Deployment:**
```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
ECS_CLUSTER=milk-company-cluster
ECS_SERVICE=milk-company-service
CLOUDFRONT_DISTRIBUTION_ID=E123456789
```

**For Vercel Deployment (Staging):**
```bash
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
```

**For Railway Deployment:**
```bash
RAILWAY_TOKEN=...
```

#### 📊 Monitoring & Notifications (Optional)

```bash
# Slack Notifications
SLACK_WEBHOOK=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Step 4: Test Your Setup

1. **Push a small change** to trigger the CI/CD pipeline:
   ```bash
   echo "# Milk Company Management System" > README.md
   git add README.md
   git commit -m "Update README"
   git push origin main
   ```

2. **Go to GitHub** → **Actions tab** → Watch your workflows run!

3. **Check workflow status:**
   - ✅ CI Pipeline should run tests and build
   - ✅ Deploy Pipeline should deploy if on main branch

## 🎯 Repository Structure

After setup, your repository will have:

```
milk-company-management/
├── .github/workflows/     # GitHub Actions CI/CD
│   ├── ci.yml            # Continuous Integration
│   ├── deploy.yml        # Multi-platform deployment
│   └── deploy-ssh.yml    # SSH server deployment
├── api/                  # Backend Node.js application
├── src/                  # Frontend React application
├── docker-compose.yml    # Local development
├── Dockerfile.frontend   # Frontend container
├── deploy.sh            # Manual deployment script
├── ecosystem.config.js   # PM2 configuration
├── nginx.conf           # Reverse proxy config
└── DEPLOYMENT.md        # Detailed deployment guide
```

## 🔄 Automatic Workflows

Your repository now has these automated workflows:

### 1. **Continuous Integration** (runs on every push/PR)
- ✅ Code linting and quality checks
- ✅ Automated testing (frontend & backend)
- ✅ Security vulnerability scanning
- ✅ Build verification
- ✅ Coverage reports

### 2. **Deployment Pipeline** (runs on push to main)
- 🐳 Docker image building and pushing
- 🚀 Deploy to production environment
- 🔍 Health checks and smoke tests
- 📢 Slack notifications
- 🔄 Automatic rollback on failure

### 3. **SSH Deployment** (manual trigger)
- 📤 Deploy directly to your server
- 🔧 Support for Docker, PM2, or Node.js
- ✅ Deployment verification

## 🎮 Manual Deployment Options

### Option 1: GitHub Actions (Automatic)
```bash
git push origin main  # Triggers automatic deployment
```

### Option 2: Manual Workflow Trigger
1. Go to **Actions** → **Deploy to Production**
2. Click **Run workflow**
3. Choose environment and click **Run workflow**

### Option 3: Local Deployment Script
```bash
./deploy.sh  # Deploys to server specified in .env.production
```

### Option 4: Docker Compose (Local)
```bash
docker-compose up -d  # Starts entire stack locally
```

## 🐛 Troubleshooting

### Common Issues:

1. **"remote: Repository not found"**
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/CORRECT_REPO_NAME.git
   ```

2. **"failed to push some refs"**
   ```bash
   git pull origin main --rebase
   git push origin main
   ```

3. **Docker build fails**
   - Check Docker Hub credentials in GitHub Secrets
   - Verify DOCKER_USERNAME and DOCKER_PASSWORD

4. **Deployment fails**
   - Check all required secrets are set
   - Verify server credentials (if using SSH deployment)
   - Check MongoDB connection string

5. **MongoDB connection issues**
   - Whitelist GitHub Actions IPs in MongoDB Atlas
   - Use connection string with SSL: `ssl=true`

### Get Help:
- 📖 Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
- 🐛 Create an issue in your repository
- 💬 Check GitHub Actions logs for error details

## 🎉 Success Indicators

✅ **Repository created successfully**
✅ **Code pushed to GitHub**
✅ **GitHub Actions running**
✅ **CI tests passing**
✅ **Deployment successful**
✅ **Application accessible**

**Your Milk Company Management System is now live with full CI/CD automation!** 🚀

---

## 📝 Next Steps

1. **Customize domain**: Update production URL in secrets
2. **Add team members**: Invite collaborators to repository
3. **Set up monitoring**: Configure alerts and logging
4. **Enable branch protection**: Require PR reviews for main branch
5. **Add more tests**: Expand test coverage
6. **Configure SSL**: Set up HTTPS certificates

---

**Need help?** Check the [DEPLOYMENT.md](./DEPLOYMENT.md) file for comprehensive deployment instructions.