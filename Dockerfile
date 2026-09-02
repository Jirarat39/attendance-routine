# Build stage for backend
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /src

# Print debug info
RUN echo "Starting backend build..."

# Copy solution and project files
COPY AttendanceRoutine.sln .
COPY backend/ backend/

# Restore and publish
RUN echo "Restoring dependencies..." && \
    dotnet restore AttendanceRoutine.sln && \
    echo "Publishing backend..."  && \
    dotnet publish "backend/AttendanceRoutine.Api/AttendanceRoutine.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Build stage for frontend
FROM node:20-alpine AS frontend-build
WORKDIR /frontend

# Install dependencies
RUN npm install -g pnpm@9.15.0
COPY frontend/package.json ./
RUN pnpm install
COPY frontend/ .
RUN pnpm run build

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app

# Install nginx and utilities
RUN apt-get update && apt-get install -y nginx curl && rm -rf /var/lib/apt/lists/*

# Copy backend published files
COPY --from=backend-build /app/publish .

# Copy frontend dist to nginx
RUN mkdir -p /var/www/html
COPY --from=frontend-build /frontend/dist /var/www/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-available/default

# Expose port for Render
EXPOSE 10000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:10000/api/health || exit 1

# Create startup script
RUN echo '#!/bin/bash\n\
set -e\n\
echo "Starting services on port ${PORT:-10000}"\n\
service nginx start\n\
export ASPNETCORE_URLS="http://0.0.0.0:5187"\n\
exec dotnet AttendanceRoutine.Api.dll' > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
