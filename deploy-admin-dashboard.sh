#!/bin/bash
# Deploy Admin Dashboard to Production
# Run this script on the bastion server

set -e

echo "=========================================="
echo "Admin Dashboard Deployment Script"
echo "=========================================="
echo ""

# Configuration
APP_SERVER_IP="10.0.13.25"
WORKER_SERVER_IP="10.0.12.81"
SSH_KEY="~/.ssh/app-access-key"

echo "Step 1: Deploy Backend with Admin API"
echo "--------------------------------------"
ssh -i $SSH_KEY ec2-user@$APP_SERVER_IP << 'BACKEND_EOF'
cd /opt/tatvaops

# Pull latest code
echo "Pulling latest code..."
sudo git pull origin main

# Run database migration
echo "Running database migration..."
cd backend
sudo docker run --rm -v $(pwd):/app -w /app --env-file /opt/tatvaops/backend/.env node:20-alpine sh -c "npm install && npx prisma migrate deploy"
cd ..

# Rebuild backend
echo "Building backend image..."
sudo DOCKER_BUILDKIT=1 docker build -t tatvaops-backend -f backend/Dockerfile backend/

# Restart backend
echo "Restarting backend container..."
sudo docker stop backend
sudo docker rm backend
sudo docker run -d --name backend -p 3001:4000 --env-file /opt/tatvaops/backend/.env --restart unless-stopped tatvaops-backend

# Verify
echo "Verifying backend..."
sleep 10
curl -I http://localhost:3001/health
sudo docker logs backend --tail 20

echo "Backend deployed successfully!"
BACKEND_EOF

echo ""
echo "Step 2: Deploy Frontend with Admin Dashboard"
echo "--------------------------------------"
ssh -i $SSH_KEY ec2-user@$APP_SERVER_IP << 'FRONTEND_EOF'
cd /opt/tatvaops

# Rebuild frontend
echo "Building frontend image..."
sudo DOCKER_BUILDKIT=1 docker build -t tatvaops-frontend -f frontend/Dockerfile frontend/

# Restart frontend
echo "Restarting frontend container..."
sudo docker stop frontend
sudo docker rm frontend
sudo docker run -d --name frontend -p 3000:3000 --network host --env-file /opt/tatvaops/frontend/.env --restart unless-stopped tatvaops-frontend

# Verify
echo "Verifying frontend..."
sleep 10
curl -I http://localhost:3000
sudo docker logs frontend --tail 20

echo "Frontend deployed successfully!"
FRONTEND_EOF

echo ""
echo "Step 3: Fix Worker Backend URL (if needed)"
echo "--------------------------------------"
ssh -i $SSH_KEY ec2-user@$WORKER_SERVER_IP << 'WORKER_EOF'
cd /opt/tatvaops

# Check if BACKEND_API_URL exists
if ! grep -q "BACKEND_API_URL" .env; then
  echo "Adding BACKEND_API_URL to worker .env..."
  sudo bash -c 'echo "" >> /opt/tatvaops/.env'
  sudo bash -c 'echo "# Backend API" >> /opt/tatvaops/.env'
  sudo bash -c 'echo "BACKEND_API_URL=https://vision.tatvaops.com" >> /opt/tatvaops/.env'
  sudo bash -c 'echo "API_URL=https://vision.tatvaops.com" >> /opt/tatvaops/.env'
  
  # Restart workers
  echo "Restarting workers..."
  sudo docker-compose -f /opt/tatvaops/docker-compose.yml restart worker
  
  echo "Workers restarted successfully!"
else
  echo "BACKEND_API_URL already exists in .env"
fi

# Verify
sudo docker logs tatvaops-worker-1 --tail 20
WORKER_EOF

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Test admin dashboard: https://vision.tatvaops.com/krsna"
echo "2. Sign in with @tatvaops.com account"
echo "3. Verify all tabs work correctly"
echo "4. Check anomaly detection"
echo ""
echo "Monitoring:"
echo "- Backend logs: ssh -i $SSH_KEY ec2-user@$APP_SERVER_IP 'sudo docker logs -f backend'"
echo "- Frontend logs: ssh -i $SSH_KEY ec2-user@$APP_SERVER_IP 'sudo docker logs -f frontend'"
echo "- Worker logs: ssh -i $SSH_KEY ec2-user@$WORKER_SERVER_IP 'sudo docker logs -f tatvaops-worker-1'"
echo ""

