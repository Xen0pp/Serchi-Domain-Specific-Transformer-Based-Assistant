#!/bin/bash
set -e

echo "🚀 Starting ML Planner AI..."

# Ensure ports 3000 and 8000 are clear
pkill -f "next dev" 2>/dev/null || true
pkill -f uvicorn 2>/dev/null || true
sleep 1

# --- Backend setup ---
cd backend
if [ ! -d "venv" ]; then
  echo "📦 Creating Python virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate
echo "📦 Installing backend dependencies..."
pip install -q -r requirements.txt

echo "⚡ Starting backend server on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# --- Frontend setup ---
cd frontend
echo "📦 Installing frontend dependencies..."
npm install --silent

echo "🌐 Starting Next.js frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo "✅ App running at http://localhost:3000"
echo "Press Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
