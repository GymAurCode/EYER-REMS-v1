# 🚀 Deployment Checklist - Vercel + Render

## ✅ Pre-Deployment Setup

### Frontend (Vercel)

1. **Environment Variables** - Vercel dashboard mein add karo:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
   ```

2. **Verify API Config** - `lib/api.ts` check karo ki env variable properly use ho rahi hai

### Backend (Render/Railway)

1. **Environment Variables** - Render dashboard mein add karo:
   ```env
   FRONTEND_URL=https://your-app.vercel.app
   
   # Ya multiple origins:
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://shaky-cobras-enter.loca.lt
   ```

2. **Database** - PostgreSQL connection string set karo:
   ```env
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

3. **JWT Secret** - Production ke liye strong secret generate karo:
   ```env
   JWT_SECRET=your-very-long-and-random-secret-key-at-least-32-chars
   ```

---

## 🔍 Verification Steps

### 1. Check CORS Configuration

Backend logs mein check karo ki CORS properly configured hai:
```
✅ CORS: Allowed origins configured
```

### 2. Test API Connection

Frontend console mein test karo:
```javascript
fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
  .then(r => r.json())
  .then(console.log)
```

### 3. Test Authentication

Login flow test karo:
- ✅ API call successful?
- ✅ CORS errors nahi aaye?
- ✅ Tokens properly store ho rahe hain?

---

## 📝 Quick Reference

### Frontend `.env.local` (Development)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### Backend `server/.env` (Development)
```env
FRONTEND_URL=http://localhost:3000
PORT=3001
DATABASE_URL=postgresql://localhost:5432/rems_db
JWT_SECRET=your-development-secret-key-min-32-chars
```

### Production Environment Variables

**Vercel (Frontend):**
```env
NEXT_PUBLIC_API_URL=https://rems-backend.onrender.com/api
```

**Render (Backend):**
```env
FRONTEND_URL=https://rems-frontend.vercel.app
ALLOWED_ORIGINS=https://rems-frontend.vercel.app
DATABASE_URL=postgresql://...
JWT_SECRET=production-secret-key...
PORT=10000
NODE_ENV=production
```

---

## ⚠️ Common Issues & Solutions

### Issue: CORS Error in Production

**Solution:**
1. Backend `.env` mein `FRONTEND_URL` check karo - exact domain match hona chahiye
2. Trailing slash matter karta hai - dono variations automatically handle hote hain
3. Backend restart karo after env changes

### Issue: API Calls Failing

**Solution:**
1. Check `NEXT_PUBLIC_API_URL` frontend mein set hai
2. Check backend URL accessible hai (health check)
3. Network tab mein check karo - request ja rahi hai ya nahi

### Issue: Vercel Preview Deployments Not Working

**Solution:**
1. Backend mein `ALLOWED_ORIGINS` use karo instead of `FRONTEND_URL`
2. Ya preview URL manually add karo:
   ```env
   ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-feature.vercel.app
   ```

---

## 🔐 Security Checklist

- [ ] Production JWT_SECRET strong hai (min 32 chars)
- [ ] Database credentials secure hain
- [ ] CORS properly restricted hai
- [ ] HTTPS enabled hai (production)
- [ ] Environment variables secure hain (never commit .env files)

---

## 📚 Documentation

Detailed guide: `CORS_SETUP.md`

