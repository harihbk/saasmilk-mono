#!/bin/bash

# Load environment variables
source .env.production

echo "🚀 Starting deployment to $SERVER_HOST..."

# Build the application
echo "📦 Building application..."
npm run build
cd api && npm ci --production && cd ..

# Create deployment package
echo "📦 Creating deployment package..."
tar -czf deploy.tar.gz \
  build/ \
  api/ \
  package*.json \
  docker-compose.yml \
  nginx.conf \
  .env.production

# Copy files to server
echo "📤 Copying files to server..."
scp -P ${SERVER_PORT:-22} deploy.tar.gz \
  ${SERVER_USERNAME}@${SERVER_HOST}:/tmp/

# Deploy on server
echo "🔧 Deploying on server..."
ssh -p ${SERVER_PORT:-22} ${SERVER_USERNAME}@${SERVER_HOST} << 'ENDSSH'
  # Create app directory
  mkdir -p ~/milk-company
  cd ~/milk-company

  # Backup current deployment
  if [ -d "build" ]; then
    mv build build.backup.$(date +%Y%m%d%H%M%S)
  fi

  # Extract new deployment
  tar -xzf /tmp/deploy.tar.gz
  rm /tmp/deploy.tar.gz

  # Load environment variables
  cp .env.production .env
  cp .env.production api/.env

  # Option 1: Deploy with Docker
  if command -v docker &> /dev/null; then
    echo "🐳 Deploying with Docker..."
    docker-compose down
    docker-compose up -d --build

  # Option 2: Deploy with PM2
  elif command -v pm2 &> /dev/null; then
    echo "⚡ Deploying with PM2..."
    npm install --production
    cd api && npm install --production && cd ..
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

  # Option 3: Direct Node.js
  else
    echo "🔧 Deploying with Node.js..."
    # Kill existing process
    pkill -f "node.*server.js" || true

    # Start backend
    cd api
    nohup node server.js > ../api.log 2>&1 &
    cd ..

    # Serve frontend with nginx or simple http server
    if command -v nginx &> /dev/null; then
      sudo cp nginx.conf /etc/nginx/sites-available/milk-company
      sudo ln -sf /etc/nginx/sites-available/milk-company /etc/nginx/sites-enabled/
      sudo nginx -s reload
    else
      npx serve -s build -p 3000 > frontend.log 2>&1 &
    fi
  fi

  # Verify deployment
  sleep 5
  curl -f http://localhost:8000/api || exit 1
  echo "✅ Deployment successful!"
ENDSSH

# Clean up
rm deploy.tar.gz

echo "✅ Deployment completed!"
echo "🌐 Access your application at: http://${SERVER_HOST}"