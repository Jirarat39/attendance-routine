# Deployment Guide for Render

## Prerequisites

1. A Render account (https://render.com)
2. GitHub repository with this project pushed
3. SQL Server database on Render (PostgreSQL is recommended alternative)

## Deployment Steps

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/attendance-routine.git
git push -u origin main
```

### Step 2: Create Render Account and Connect GitHub

1. Go to https://render.com and sign up
2. Connect your GitHub account in Dashboard → Account Settings
3. Grant repository access

### Step 3: Deploy with render.yaml (Recommended)

1. In Render Dashboard, click "New +" → "Blueprint"
2. Select your GitHub repository
3. Confirm the render.yaml configuration
4. Click "Create New Blueprint"

### Step 4: Configure Database Connection

After deployment, set the database connection string:

1. Go to Render Dashboard → Web Service → Environment
2. Set `ConnectionStrings__AttendanceDb`:
   ```
   Server=YOUR_DB_HOST;Port=YOUR_DB_PORT;Database=attendance_db;User ID=attendance_user;Password=YOUR_PASSWORD;SSL Mode=require;
   ```

### Step 5: Database Setup

If using SQL Server on Render:

```powershell
# Use Azure SQL or SQL Server instance
# Update connection string in Render environment variables
```

For PostgreSQL (alternative):

1. Create database on Render
2. Update backend to use PostgreSQL instead of SQL Server
3. Install Entity Framework Core PostgreSQL provider

### Alternative: Manual Deployment

If render.yaml doesn't work, deploy manually:

1. **Create Web Service:**
   - Dashboard → New → Web Service
   - Connect GitHub repository
   - Environment: Docker
   - Build Command: (leave empty, uses Dockerfile)
   - Start Command: (leave empty, uses Dockerfile)

2. **Set Environment Variables:**
   - `ASPNETCORE_ENVIRONMENT`: Production
   - `ConnectionStrings__AttendanceDb`: Your connection string
   - `ASPNETCORE_URLS`: http://0.0.0.0:5187

3. **Configure Custom Domain (Optional):**
   - Settings → Custom Domain
   - Add your domain

## Troubleshooting

### Application won't start
- Check logs: Dashboard → Web Service → Logs
- Verify connection string format
- Ensure database is running and accessible

### Frontend not loading
- Verify nginx configuration
- Check that dist folder is built correctly
- Clear browser cache

### API returns 502 Bad Gateway
- Ensure backend is running on port 5187
- Check database connectivity
- Review Application Logs

## Local Testing Before Deploy

```bash
# Build Docker image locally
docker build -t attendance-routine:latest .

# Run container
docker run -p 80:80 -p 5187:5187 \
  -e "ConnectionStrings__AttendanceDb=Server=YOUR_SERVER;..." \
  attendance-routine:latest

# Access at http://localhost
```

## Database Backup

For production, enable automatic backups in Render:
- Database Settings → Backups
- Set backup frequency

## Performance Optimization

- Enable caching headers in nginx
- Use CDN for static files
- Scale instance if needed: Settings → Plan

## Security Checklist

- [ ] Use HTTPS (Render provides free SSL)
- [ ] Set strong database password
- [ ] Enable CORS restrictions
- [ ] Add authentication/authorization
- [ ] Regular database backups
- [ ] Monitor logs for errors

## Support

For issues with:
- **Render**: https://render.com/docs
- **ASP.NET Core**: https://docs.microsoft.com/dotnet
- **React/Frontend**: Create issue in repository
