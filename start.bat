@echo off
echo 🚀 Starting ML Planner AI on Windows...

cd backend
if not exist "venv" (
    echo 📦 Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
echo 📦 Installing backend dependencies...
pip install -q -r requirements.txt

echo ⚡ Starting backend server on port 8000...
start /b uvicorn main:app --host 0.0.0.0 --port 8000
cd ..

cd frontend
echo 📦 Installing frontend dependencies...
call npm install --silent

echo 🌐 Starting Next.js frontend on port 3000...
start /b npm run dev
cd ..

echo ✅ App running at http://localhost:3000
echo Close this window to stop servers.
