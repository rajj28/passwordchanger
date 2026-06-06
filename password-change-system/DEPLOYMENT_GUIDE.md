# 🚀 Deployment Guide - Password Change System

This guide will help you deploy your password change system to production.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment (Railway/Render/Heroku)](#backend-deployment)
3. [Frontend Deployment (Vercel/Netlify)](#frontend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Post-Deployment Testing](#post-deployment-testing)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account
- ✅ MongoDB Atlas account (already set up)
- ✅ Backend code ready
- ✅ Frontend code ready

---

## 🔧 Backend Deployment

### Option 1: Deploy to Railway (Recommended - Free & Easy)

#### Step 1: Prepare Backend for Deployment

1. **Create a GitHub repository** (if not already done):
```bash
cd password-change-system
git init
git add .
git commit -m "Initial commit - Password change system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/password-change-system.git
git push -u origin main
```

2. **Verify package.json has correct scripts**:
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

#### Step 2: Deploy to Railway

1. Go to [Railway.app](https://railway.app/)
2. Click **"Start a New Project"**
3. Click **"Deploy from GitHub repo"**
4. Select your repository: `password-change-system`
5. Railway will auto-detect Node.js

#### Step 3: Configure Environment Variables on Railway

Go to your project → **Variables** tab → Add these:

```env
NODE_ENV=production
PORT=3000
API_VERSION=v1

MONGODB_URI=mongodb+srv://ruturajsonkamble29_db_user:XIv1UZ3qBylym0uS@cluster0.xoqhdno.mongodb.net/password_change_db?retryWrites=true&w=majority

JWT_SECRET=ysgfgdfgskhjgsdfjghsfhjgkjhskghjskfhjgksdfhjg
JWT_EXPIRES_IN=7d

BCRYPT_COST=12

RATE_LIMIT_IP_WINDOW_MS=900000
RATE_LIMIT_IP_MAX=5
RATE_LIMIT_USER_WINDOW_MS=3600000
RATE_LIMIT_USER_MAX=3

CORS_ORIGINS=https://your-frontend-domain.vercel.app

TRUST_PROXY=true
```

#### Step 4: Deploy

1. Railway will automatically deploy
2. Wait for build to complete
3. You'll get a URL like: `https://password-change-system-production.up.railway.app`
4. Copy this URL - you'll need it for frontend!

---

### Option 2: Deploy to Render.com (Alternative - Also Free)

1. Go to [Render.com](https://render.com/)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `password-change-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Add environment variables (same as Railway)
6. Click **"Create Web Service"**
7. Copy your URL: `https://password-change-backend.onrender.com`

---

### Option 3: Deploy to Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
cd password-change-system
heroku create your-password-backend

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your_mongodb_uri"
heroku config:set JWT_SECRET="your_jwt_secret"
heroku config:set CORS_ORIGINS="your_frontend_url"

# Deploy
git push heroku main

# Open
heroku open
```

---

## 🎨 Frontend Deployment

### Option 1: Deploy to Vercel (Recommended - Best for React/Vite)

#### Step 1: Prepare Frontend

1. **Update API URL** in frontend:

Create `frontend/.env.production`:
```env
VITE_API_URL=https://your-backend-url.railway.app/api/v1
```

Example:
```env
VITE_API_URL=https://password-change-system-production.up.railway.app/api/v1
```

2. **Build test locally**:
```bash
cd frontend
npm run build
```

#### Step 2: Deploy to Vercel

**Method A: Using Vercel CLI**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel

# Follow prompts:
# - Project name: password-change-frontend
# - Framework: Vite
# - Build command: npm run build
# - Output directory: dist

# Deploy to production
vercel --prod
```

**Method B: Using Vercel Website**

1. Go to [Vercel.com](https://vercel.com/)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add **Environment Variables**:
   - Key: `VITE_API_URL`
   - Value: `https://your-backend-url.railway.app/api/v1`
6. Click **"Deploy"**
7. You'll get a URL like: `https://password-change-frontend.vercel.app`

---

### Option 2: Deploy to Netlify

1. Go to [Netlify.com](https://www.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub
4. Configure:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
5. Add **Environment Variables**:
   - `VITE_API_URL` = `https://your-backend-url.railway.app/api/v1`
6. Click **"Deploy site"**

---

## 🔄 Update CORS in Backend

After deploying frontend, update backend CORS:

### On Railway:
1. Go to your backend project
2. Variables tab
3. Update `CORS_ORIGINS`:
```
CORS_ORIGINS=https://password-change-frontend.vercel.app
```

### In your code (if needed):
Update `password-change-system/.env`:
```env
CORS_ORIGINS=https://password-change-frontend.vercel.app,https://www.password-change-frontend.vercel.app
```

Redeploy backend after changing CORS.

---

## 🧪 Post-Deployment Testing

### Test Backend

```bash
# Health check
curl https://your-backend-url.railway.app/health

# Test password change
curl -X POST https://your-backend-url.railway.app/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "test123",
    "newPassword": "newpass456",
    "confirmPassword": "newpass456"
  }'
```

### Test Frontend

1. Open your frontend URL: `https://password-change-frontend.vercel.app`
2. Fill the form
3. Submit
4. Should redirect to Instagram app
5. Check MongoDB for new user and audit log

---

## 📱 Mobile Testing

### Test on iOS:

1. Open Safari on iPhone
2. Go to: `https://password-change-frontend.vercel.app`
3. Change password
4. Should open Instagram app to @by__mansi

### Test on Android:

1. Open Chrome on Android
2. Go to: `https://password-change-frontend.vercel.app`
3. Change password
4. Should open Instagram app to @by__mansi

---

## 🔐 Security Checklist Before Production

- [ ] Change JWT_SECRET to a strong random string
- [ ] Set NODE_ENV=production
- [ ] Enable TRUST_PROXY=true
- [ ] Set proper CORS_ORIGINS (your frontend URL only)
- [ ] Review rate limits (adjust if needed)
- [ ] Test on mobile devices
- [ ] Test Instagram app redirect
- [ ] Verify MongoDB connection
- [ ] Check logs for errors

---

## 📊 Monitoring & Logs

### Railway Logs:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# View logs
railway logs
```

### Render Logs:
Go to Dashboard → Your Service → Logs tab

### Vercel Logs:
Go to Dashboard → Your Project → Functions tab

---

## 🎯 Quick Deployment Summary

1. **Backend** → Railway/Render
   - Push code to GitHub
   - Connect to Railway
   - Add environment variables
   - Get backend URL

2. **Frontend** → Vercel
   - Add `.env.production` with backend URL
   - Deploy to Vercel
   - Get frontend URL

3. **Update CORS** → Backend
   - Add frontend URL to CORS_ORIGINS
   - Redeploy backend

4. **Test** → Mobile
   - Open frontend URL on phone
   - Test password change
   - Verify Instagram app opens

---

## 🆘 Troubleshooting

### Backend won't start:
- Check Railway/Render logs
- Verify MongoDB connection string
- Check all environment variables are set

### Frontend shows CORS error:
- Verify CORS_ORIGINS includes your frontend URL
- Include both `https://app.vercel.app` and `https://www.app.vercel.app`
- Redeploy backend after changing CORS

### Instagram app doesn't open:
- Verify deep link: `instagram://user?username=by__mansi`
- Test on actual mobile device (not desktop)
- Ensure Instagram app is installed

### 500 Server Error:
- Check backend logs
- Verify MongoDB connection
- Check environment variables

---

## 📝 Custom Domain (Optional)

### Frontend Custom Domain:

**On Vercel:**
1. Go to Project Settings → Domains
2. Add your domain: `password.yourdomain.com`
3. Follow DNS configuration steps

**On Netlify:**
1. Go to Domain Settings
2. Add custom domain
3. Update DNS records

### Backend Custom Domain:

**On Railway:**
1. Go to Settings → Domains
2. Add custom domain
3. Update DNS CNAME

---

## 🎉 You're Done!

Your password change system is now live!

- Frontend: `https://password-change-frontend.vercel.app`
- Backend: `https://password-change-backend.railway.app`
- Database: MongoDB Atlas (already running)

Users can now:
1. Visit your frontend URL
2. Change their password
3. Get redirected to Instagram app (@by__mansi)
4. Their data is saved in MongoDB

---

## 📞 Need Help?

If you encounter issues:
1. Check logs in Railway/Vercel
2. Test endpoints with curl
3. Verify environment variables
4. Check MongoDB connection
5. Test on mobile device

---

**Deployment complete! 🚀**
