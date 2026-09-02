# Build stage for backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src
COPY AttendanceRoutine.sln .
COPY backend/AttendanceRoutine.Api/AttendanceRoutine.Api.csproj backend/AttendanceRoutine.Api/
RUN dotnet restore AttendanceRoutine.sln
COPY . .
RUN dotnet publish "backend/AttendanceRoutine.Api/AttendanceRoutine.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build stage for frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install || npm install
COPY frontend/ .
RUN pnpm run build || npm run build

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Install nginx and curl for health checks
RUN apt-get update && apt-get install -y nginx curl && rm -rf /var/lib/apt/lists/*

# Copy backend
COPY --from=backend-build /app/publish .

# Copy frontend build to nginx
RUN mkdir -p /var/www/html
COPY --from=frontend-build /frontend/dist /var/www/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

# Expose port for Render
EXPOSE 10000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:10000/api/health || exit 1

# Create startup script that binds to Render's PORT
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting services on port ${PORT:-10000}"\n\
service nginx start\n\
export ASPNETCORE_URLS="http://0.0.0.0:5187"\n\
exec dotnet AttendanceRoutine.Api.dll' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
