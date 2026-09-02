# Deploy Attendance Routine to Render - Quick Start

## 📋 Prerequisites

- GitHub account (repository)
- Render account (https://render.com)
- SQL Server/Azure SQL instance (or use PostgreSQL)

## 🚀 Quick Deploy (5 minutes)

### Step 1: Initialize Git & Push to GitHub

```powershell
# In project directory
git init
git add .
git commit -m "Initial commit for Render deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/attendance-routine.git
git push -u origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub
3. Authorize GitHub access

### Step 3: Create Web Service on Render

**Option A: Using Blueprint (Recommended)**

1. In Render Dashboard → click **New +** → **Blueprint**
2. Select your `attendance-routine` repository
3. Review `render.yaml` configuration
4. Click **Create New Blueprint**

**Option B: Manual Setup**

1. In Render Dashboard → **New +** → **Web Service**
2. Connect your GitHub repository
3. Set configuration:
   - **Name**: `attendance-routine`
   - **Environment**: Docker
   - **Region**: Oregon (or your preference)
   - **Plan**: Standard or Pro

### Step 4: Configure Environment Variables

After service is created, go to **Settings** → **Environment**

Add these variables:

```
ASPNETCORE_ENVIRONMENT = Production
ConnectionStrings__AttendanceDb = Server=YOUR_SQL_SERVER;Database=YOUR_DB;User ID=sa;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;
```

### Step 5: Database Setup

**Option A: Azure SQL (Recommended)**

1. Create Azure SQL Server & Database
2. Get connection string from Azure Portal
3. Update environment variable in Render

**Option B: SQL Server on Linux**

Use Docker-based SQL Server or managed SQL services.

### Step 6: Test Deployment

1. Render builds automatically (~5-10 minutes)
2. Check **Logs** tab for errors
3. Visit your app URL: `https://attendance-routine.onrender.com`

## ⚙️ Configuration

### Database Connection String Format

```
Server=YOUR_HOST;Database=YOUR_DB;User ID=YOUR_USER;Password=YOUR_PASSWORD;Encrypt=True;TrustServerCertificate=True;
```

### Environment Variables Explained

| Variable | Value | Notes |
|----------|-------|-------|
| `ASPNETCORE_ENVIRONMENT` | `Production` | Required for production settings |
| `ConnectionStrings__AttendanceDb` | SQL connection string | Required - update with real database |
| `ASPNETCORE_URLS` | `http://0.0.0.0:5187` | Auto-set, backend port |

### Custom Domain (Optional)

1. In Render → Web Service → **Settings**
2. Scroll to **Custom Domain**
3. Add your domain
4. Update DNS records as shown

## 📁 Important Files

- `Dockerfile` - Docker build configuration
- `nginx.conf` - Web server configuration
- `render.yaml` - Render deployment blueprint
- `appsettings.Production.json` - Production settings
- `DEPLOYMENT.md` - Detailed deployment guide

## 🔧 Troubleshooting

### Application won't start
```bash
# Check logs in Render dashboard
Settings → Logs → View all logs
```

Look for:
- Database connection errors
- Missing connection string
- Port binding issues

### Database connection failed

```
Error: Server=192.168.11.100 not reachable
```

**Solution:**
- Ensure database is publicly accessible
- Check firewall rules allow Render IP range
- Verify connection string format

### Frontend not loading / shows 404

**Solution:**
- Frontend should be served at `/`
- API proxied to `/api/`
- Check nginx logs in Docker output

## 🔐 Security Checklist

- [ ] Use HTTPS (Render provides free SSL)
- [ ] Set strong database password
- [ ] Don't commit secrets to GitHub
- [ ] Use environment variables for sensitive data
- [ ] Enable database backups
- [ ] Restrict CORS origins in `appsettings.Production.json`

## 📊 Monitoring

In Render Dashboard:
- **Metrics** - CPU, memory, requests
- **Logs** - Application output and errors
- **Events** - Deployment history

## 🆘 Getting Help

- Check application logs: Settings → Logs
- Render docs: https://render.com/docs
- Project README: [README.md](README.md)
- Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)

## 🎯 Next Steps

1. ✅ Deploy to Render (this guide)
2. Setup CI/CD (auto-deploy on git push)
3. Configure SSL certificate
4. Add custom domain
5. Enable monitoring and alerts

---

**Deployed URL:** `https://attendance-routine.onrender.com` (or your custom domain)
