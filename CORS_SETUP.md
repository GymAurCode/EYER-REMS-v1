# CORS और API URL Configuration Guide

## 📋 Frontend Configuration (Next.js)

### 1. Environment Variable Setup

Frontend mein API URL configure karne ke liye `.env.local` file create karo:

```env
# Development
NEXT_PUBLIC_API_URL=http://localhost:3001/api

# Production (Vercel)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

**Important:** Next.js mein environment variables browser tak access karne ke liye `NEXT_PUBLIC_` prefix zaroori hai.

### 2. API Configuration

`lib/api.ts` file mein API URL automatically environment variable se li jati hai:

```typescript
const rawBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
```

**Note:** Agar environment variable set nahi hai, to default `http://localhost:3001/api` use hoga.

---

## 🔧 Backend CORS Configuration

### 1. Environment Variables

Backend (`server/`) directory mein `.env` file mein ye variables set karo:

```env
# Frontend URL (Production - Vercel)
FRONTEND_URL=https://your-app.vercel.app

# Ya multiple origins (comma-separated)
ALLOWED_ORIGINS=https://your-app.vercel.app,https://preview.vercel.app

# Development
FRONTEND_URL=http://localhost:3000
```

### 2. CORS Features

Backend automatically handle karta hai:

✅ **Localhost** - Development ke liye automatically allowed  
✅ **Vercel Deployments** - Main domain + preview deployments  
✅ **Trailing Slash** - `/` ke saath aur bina dono support  
✅ **Multiple Origins** - Comma-separated list support  

### 3. Vercel Preview Deployments

Agar `ALLOWED_ORIGINS` mein koi `*.vercel.app` domain hai, to sab Vercel preview deployments automatically allowed honge.

Example:
```env
ALLOWED_ORIGINS=https://your-app.vercel.app
```

Is se ye sab allowed honge:
- `https://your-app.vercel.app`
- `https://your-app-git-feature.vercel.app`
- `https://your-app-abc123.vercel.app` (preview URLs)

---

## 🚀 Vercel Deployment Setup

### Frontend (Vercel)

1. Vercel project settings mein environment variables add karo:

```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
```

2. Ya Vercel CLI se:
```bash
vercel env add NEXT_PUBLIC_API_URL production
```

### Backend (Render/Railway/etc)

1. Render/Railway project settings mein environment variables add karo:

```env
FRONTEND_URL=https://your-app.vercel.app
```

Ya multiple origins:
```env
ALLOWED_ORIGINS=https://your-app.vercel.app,https://shaky-cobras-enter.loca.lt
```

---

## 🔍 Verification

### Check CORS is Working

Browser console mein check karo:

```javascript
fetch('https://your-backend.onrender.com/api/health', {
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

Agar CORS error aaye to:
1. ✅ Check karo backend `.env` mein `FRONTEND_URL` ya `ALLOWED_ORIGINS` set hai
2. ✅ Check karo exact domain match kar raha hai (trailing slash matter karta hai)
3. ✅ Backend logs check karo - blocked origins dikhate hain

### Check API URL

Frontend console mein:
```javascript
console.log(process.env.NEXT_PUBLIC_API_URL)
```

---

## 📝 Example Configurations

### Development Setup

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Backend `server/.env`:**
```env
FRONTEND_URL=http://localhost:3000
PORT=3001
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key...
```

### Production Setup

**Frontend Vercel Environment Variables:**
```env
NEXT_PUBLIC_API_URL=https://rems-backend.onrender.com/api
```

**Backend Render Environment Variables:**
```env
FRONTEND_URL=https://rems-frontend.vercel.app
ALLOWED_ORIGINS=https://rems-frontend.vercel.app
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=your-production-secret...
```

---

## ⚠️ Common Issues

### CORS Error: "Access to fetch blocked"

**Solution:**
1. Backend `.env` mein `FRONTEND_URL` set karo exact Vercel URL ke saath
2. Backend restart karo
3. Browser cache clear karo

### API URL Not Working

**Solution:**
1. Frontend `.env.local` mein `NEXT_PUBLIC_API_URL` set karo
2. Next.js dev server restart karo
3. Build time pe environment variables inject hote hain

### Preview Deployments Not Working

**Solution:**
1. Backend `.env` mein `ALLOWED_ORIGINS` use karo instead of `FRONTEND_URL`
2. Ya manually preview URLs add karo:
```env
ALLOWED_ORIGINS=https://your-app.vercel.app,https://your-app-git-feature.vercel.app
```

---

## 🔒 Security Notes

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use different JWT_SECRET** for production
3. **Restrict CORS** - Only allow your frontend domains
4. **Use HTTPS** in production - Always

---

## 📚 Related Files

- Frontend API Config: `lib/api.ts`
- Backend CORS Config: `server/src/index.ts`
- Environment Validation: `server/src/utils/env-validation.ts`

