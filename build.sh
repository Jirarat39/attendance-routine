#!/bin/bash
set -e

echo "Building application..."
cd /src

# Build backend
echo "Building backend..."
dotnet build AttendanceRoutine.sln -c Release

# Build frontend
echo "Building frontend..."
cd frontend
npm install -g pnpm
pnpm install
pnpm run build
cd ..

echo "Publishing backend..."
dotnet publish "backend/AttendanceRoutine.Api/AttendanceRoutine.Api.csproj" -c Release -o /app/publish

echo "Setup complete!"
