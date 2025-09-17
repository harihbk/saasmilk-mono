#!/bin/bash

# GitHub Secrets Setup Script for Milk Company Management System
# This script helps you set up GitHub secrets via GitHub CLI

set -e

echo "🔐 GitHub Secrets Setup for Milk Company Management System"
echo "=========================================================="
echo ""

# Check if GitHub CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "📦 Install it first:"
    echo "   macOS: brew install gh"
    echo "   Ubuntu: sudo apt install gh"
    echo "   Windows: winget install GitHub.cli"
    echo ""
    echo "🌐 Or download from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
    echo "🔑 Please authenticate with GitHub first:"
    echo "   gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Get repository information
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")

if [ -z "$REPO" ]; then
    echo "📁 Please navigate to your GitHub repository directory first"
    echo "   cd /path/to/your/milk-company-repository"
    exit 1
fi

echo "📋 Setting up secrets for repository: $REPO"
echo ""

# Function to set secret with prompt
set_secret() {
    local name=$1
    local description=$2
    local default_value=$3

    echo "🔐 Setting up: $name"
    echo "   Description: $description"

    if [ -n "$default_value" ]; then
        read -p "   Enter value (or press Enter for default): " value
        value=${value:-$default_value}
    else
        read -s -p "   Enter value: " value
        echo ""
    fi

    if [ -n "$value" ]; then
        echo "$value" | gh secret set "$name"
        echo "   ✅ Secret '$name' set successfully"
    else
        echo "   ⏭️  Skipping '$name' (no value provided)"
    fi
    echo ""
}

# Essential secrets
echo "🔥 ESSENTIAL SECRETS (Required for basic deployment)"
echo "=================================================="

set_secret "DOCKER_USERNAME" "Docker Hub username" ""
set_secret "DOCKER_PASSWORD" "Docker Hub password or access token" ""
set_secret "MONGODB_URI" "MongoDB connection string" "mongodb+srv://username:password@cluster.mongodb.net/milk-company"
set_secret "JWT_SECRET" "JWT secret key (min 32 characters)" "$(openssl rand -base64 32)"
set_secret "SAAS_ADMIN_EMAIL" "SaaS admin email" "admin@yourdomain.com"
set_secret "SAAS_ADMIN_PASSWORD" "SaaS admin password" ""
set_secret "PRODUCTION_URL" "Production URL" "https://yourdomain.com"

echo ""
echo "🖥️  SERVER DEPLOYMENT SECRETS (For SSH deployment)"
echo "==============================================="
read -p "Do you want to set up server deployment secrets? (y/n): " setup_server

if [[ $setup_server =~ ^[Yy]$ ]]; then
    set_secret "SERVER_HOST" "Server IP address" "192.168.1.100"
    set_secret "SERVER_USERNAME" "SSH username" "root"
    set_secret "SERVER_PASSWORD" "SSH password (or use SSH key instead)" ""
    set_secret "SERVER_PORT" "SSH port" "22"
fi

echo ""
echo "☁️  CLOUD PROVIDER SECRETS (Choose one or more)"
echo "============================================"

# AWS
read -p "Set up AWS deployment secrets? (y/n): " setup_aws
if [[ $setup_aws =~ ^[Yy]$ ]]; then
    set_secret "AWS_ACCESS_KEY_ID" "AWS Access Key ID" ""
    set_secret "AWS_SECRET_ACCESS_KEY" "AWS Secret Access Key" ""
    set_secret "AWS_REGION" "AWS Region" "us-east-1"
    set_secret "ECS_CLUSTER" "ECS Cluster name" "milk-company-cluster"
    set_secret "ECS_SERVICE" "ECS Service name" "milk-company-service"
    set_secret "CLOUDFRONT_DISTRIBUTION_ID" "CloudFront Distribution ID" ""
fi

# Vercel
read -p "Set up Vercel deployment secrets? (y/n): " setup_vercel
if [[ $setup_vercel =~ ^[Yy]$ ]]; then
    echo "🔗 Get Vercel tokens from: https://vercel.com/account/tokens"
    set_secret "VERCEL_TOKEN" "Vercel API token" ""
    set_secret "VERCEL_ORG_ID" "Vercel Organization ID" ""
    set_secret "VERCEL_PROJECT_ID" "Vercel Project ID" ""
fi

# Railway
read -p "Set up Railway deployment secrets? (y/n): " setup_railway
if [[ $setup_railway =~ ^[Yy]$ ]]; then
    echo "🔗 Get Railway token from: https://railway.app/account/tokens"
    set_secret "RAILWAY_TOKEN" "Railway API token" ""
fi

echo ""
echo "📊 MONITORING & NOTIFICATIONS (Optional)"
echo "======================================"

# Slack
read -p "Set up Slack notifications? (y/n): " setup_slack
if [[ $setup_slack =~ ^[Yy]$ ]]; then
    echo "🔗 Create Slack webhook at: https://api.slack.com/messaging/webhooks"
    set_secret "SLACK_WEBHOOK" "Slack webhook URL" ""
fi

# Sentry
read -p "Set up Sentry error tracking? (y/n): " setup_sentry
if [[ $setup_sentry =~ ^[Yy]$ ]]; then
    echo "🔗 Get Sentry DSN from: https://sentry.io/settings/projects/"
    set_secret "SENTRY_DSN" "Sentry DSN" ""
fi

echo ""
echo "✅ GitHub Secrets Setup Complete!"
echo "================================="
echo ""
echo "📋 Summary of set secrets:"
gh secret list

echo ""
echo "🚀 Next Steps:"
echo "1. Push your code to trigger the CI/CD pipeline:"
echo "   git push origin main"
echo ""
echo "2. Check GitHub Actions:"
echo "   gh run list"
echo "   # or visit: https://github.com/$REPO/actions"
echo ""
echo "3. Monitor deployment:"
echo "   gh run watch"
echo ""
echo "4. View your deployed application:"
echo "   echo 'Check your PRODUCTION_URL!'"
echo ""
echo "📖 For detailed instructions, see:"
echo "   - GITHUB_SETUP.md"
echo "   - DEPLOYMENT.md"
echo ""
echo "🎉 Happy deploying!"