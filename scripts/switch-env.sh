#!/bin/bash

# Environment switcher script for Milk Company Management System

echo "🔧 Environment Switcher"
echo "======================="
echo ""
echo "Select environment:"
echo "1) Local Development (localhost:8000)"
echo "2) Production Server (194.163.190.82:8000)"
echo "3) Custom URL"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
  1)
    API_URL="http://localhost:8000/api"
    ENV_NAME="Local Development"
    ;;
  2)
    API_URL="http://194.163.190.82:8000/api"
    ENV_NAME="Production Server"
    ;;
  3)
    read -p "Enter custom API URL (with /api): " API_URL
    ENV_NAME="Custom"
    ;;
  *)
    echo "❌ Invalid choice!"
    exit 1
    ;;
esac

# Update .env file
cat > .env << EOF
PORT=3000
REACT_APP_API_URL=$API_URL
REACT_APP_ENVIRONMENT=$ENV_NAME
EOF

echo ""
echo "✅ Environment updated!"
echo "📍 API URL: $API_URL"
echo "🌍 Environment: $ENV_NAME"
echo ""
echo "🔄 Please restart your development server:"
echo "   npm start"
echo ""

# Also update the backend server CORS if switching to production
if [[ $API_URL == *"194.163.190.82"* ]]; then
    echo "💡 Reminder: Make sure your backend server at 194.163.190.82:8000"
    echo "   has CORS configured to allow your frontend origin."
fi