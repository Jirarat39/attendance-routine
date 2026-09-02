# Step-by-Step: Deploy to Render in 10 Minutes

## ⏱️ Timeline
- GitHub Setup: 2 minutes
- Render Creation: 3 minutes  
- Configuration: 3 minutes
- Deployment: 2 minutes

---

## Step 1: Prepare GitHub Repository (2 min)

### 1.1 Create GitHub Repository

Go to https://github.com/new
- Repository name: `attendance-routine`
- Description: HR Report Scheduler
- Visibility: Private (recommended)
- Click **Create repository**

### 1.2 Push Code to GitHub

```powershell
# In your project directory
cd "d:/OneDrive - CDS SOLUTION CORP.,COMPANY LIMITED/Documents/HR Report Scheduler"

# Initialize git
git init
git add .
git commit -m "Initial commit: Attendance Routine System"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/attendance-routine.git
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username**

Verify:
- Go to https://github.com/YOUR_USERNAME/attendance-routine
- You should see all files including Dockerfile and render.yaml

---

## Step 2: Create Render Account (1 min)

1. Visit https://render.com
2. Click **Sign up**
3. Select **Continue with GitHub**
4. Authorize Render to access GitHub
5. Complete profile setup

---

## Step 3: Deploy from GitHub (3 min)

### 3.1 Create Web Service

1. In Render Dashboard, click **+ New**
2. Select **Web Service**
3. Click **Connect repository** (GitHub)
4. Select `attendance-routine`
5. Click **Connect**

### 3.2 Configure Service

Fill in the form:

| Field | Value |
|-------|-------|
| **Name** | `attendance-routine` |
| **Environment** | `Docker` |
| **Region** | `Oregon` (or your region) |
| **Branch** | `main` |
| **Build Command** | (leave empty) |
| **Start Command** | (leave empty) |
| **Plan** | `Standard` ($7/month) |

Click **Create Web Service**

**Render starts building automatically (~5-10 minutes)**

---

## Step 4: Configure Database (3 min)

### 4.1 Prepare Database Connection String

You need SQL Server connection details:

```
Server=YOUR_SERVER_IP_OR_HOSTNAME;
Database=YOUR_DATABASE_NAME;
User ID=YOUR_USERNAME;
Password=YOUR_PASSWORD;
Encrypt=True;
TrustServerCertificate=True;
```

**Example:**
```
Server=192.168.11.100;Database=TEST01;User ID=sa;Password=P@ssw0rd;Encrypt=True;TrustServerCertificate=True;
```

### 4.2 Set Environment Variables in Render

1. Wait for build to complete (check **Logs** tab)
2. Go to **Environment**
3. Click **Add Environment Variable**
4. Add these variables:

#### Variable 1: Environment
- Key: `ASPNETCORE_ENVIRONMENT`
- Value: `Production`
- Click **Save**

#### Variable 2: Database Connection
- Key: `ConnectionStrings__AttendanceDb`
- Value: `Server=...` (your connection string from Step 4.1)
- Click **Save**

#### Variable 3: Port
- Key: `PORT`
- Value: `10000`
- Click **Save**

5. Render automatically redeploys with new variables

---

## Step 5: Verify Deployment (2 min)

### 5.1 Check Deployment Status

1. In Render Dashboard, watch the **Logs** tab
2. Look for: `"Now listening on: http://0.0.0.0:5187"`
3. Look for: nginx started successfully

### 5.2 Test Application

1. Find your app URL in the top-left of Render Dashboard
   - Format: `https://attendance-routine.onrender.com`

2. Click the link or open in browser

3. You should see:
   - ✅ Login page loads
   - ✅ Nginx serving static files
   - ✅ API is responding

### 5.3 Test API Health

Visit: `https://attendance-routine.onrender.com/api/health`

Should return `{"status":"ok"}` or database status

---

## Step 6: Login and Test (1 min)

1. Go to your Render URL
2. Try login with your credentials:
   - Username: Your employee code
   - Password: Your password

3. If login succeeds:
   - ✅ Frontend is working
   - ✅ Backend is running
   - ✅ Database connection is working

---

## ✅ Deployment Complete!

Your app is now live at:
```
https://attendance-routine.onrender.com
```

---

## 🔧 After Deployment

### View Logs
Dashboard → **Logs** tab

### Restart Service
Dashboard → **Restart** button

### Change Configuration
Dashboard → **Environment** → Edit variables → Save

### Custom Domain (Optional)
Dashboard → **Settings** → **Custom Domain**

---

## 🆘 If Something Goes Wrong

### Can't Push to GitHub
```powershell
# Check git status
git status

# Check remote
git remote -v

# Try again
git push -u origin main
```

### Build Fails
Check **Logs** in Render Dashboard:
- Look for error message
- Most common: permission denied, file not found
- Check Dockerfile syntax

### Database Connection Error
```
Error: Cannot connect to server
```

**Solution:**
1. Verify connection string format (no typos)
2. Check database is publicly accessible
3. Ensure firewall allows Render IPs
4. Test connection locally first

### Frontend Not Loading
- Clear browser cache: Ctrl+Shift+Del
- Check console for errors: F12 → Console tab
- Verify nginx configuration in Logs

### Still Stuck?
1. Check [RENDER_QUICKSTART.md](RENDER_QUICKSTART.md)
2. Check [DEPLOYMENT.md](DEPLOYMENT.md)
3. Review Render logs carefully
4. Test locally with Docker first

---

## 📊 Post-Deployment Checklist

- [ ] GitHub repository created and pushed
- [ ] Render account created
- [ ] Web Service deployed
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Login page loads
- [ ] API health check passes
- [ ] Can login successfully
- [ ] Dashboard displays data

---

## 🎯 Common Issues & Fixes

### Issue: "Health check failed"
```
→ Backend not responding
→ Check database connection string
→ Verify backend started successfully in logs
```

### Issue: "Frontend shows blank page"
```
→ nginx not running or misconfigured
→ React build failed
→ Check logs for specific errors
```

### Issue: "Login fails with 500 error"
```
→ Backend error
→ Check database connectivity
→ Review backend logs for exception
```

### Issue: "Port already in use"
```
→ Another service on port 10000
→ Render handles this automatically
→ Should not occur on Render
```

---

## 📞 Support

- **Render Support**: https://render.com/support
- **GitHub Issues**: Create issue in your repository
- **Documentation**: See [DEPLOYMENT.md](DEPLOYMENT.md)

---

**Next: Monitor your deployment in the Render Dashboard and enjoy your live application! 🎉**
