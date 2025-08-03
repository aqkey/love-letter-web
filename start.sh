#!/usr/bin/env bash
set -e

echo "Stopping existing processes..."

pkill -f "node backend/index.js" 2>/dev/null || true
pkill -f "react-scripts start" 2>/dev/null || true

sleep 1  # 少し待つ

echo "Starting backend..."
(cd backend &&  node index.js > backend.log 2>&1 &)

echo "Starting frontend..."
(cd frontend &&  npm start > frontend.log 2>&1 &)

echo "Frontend and backend restarted."
