# REMS Deployment Guide

Complete step-by-step guide to deploy the REMS application on Railway (Backend) and Vercel (Frontend).

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment (Railway)](#backend-deployment-railway)
3. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
4. [Environment Variables](#environment-variables)
5. [Database Migrations](#database-migrations)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Railway account (free tier available)
- Vercel account (free tier available)
- GitHub repository with your code
- Railway PostgreSQL database created

---

## Backend Deployment (Railway)

### Step 1: Create Railway Project

1. Go to [Railway](https://railway.app) and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository
5. Select the **`server`** folder as the root directory

### Step 2: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create a PostgreSQL database
4. Note the connection details (you'll need them for DATABASE_URL)

### Step 3: Configure Environment Variables

In your Railway service settings, go to **"Variables"** and add:

```bash
# Database (from Railway PostgreSQL service)
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:PORT/DATABASE?sslmode=require

# JWT Configuration
JWT_SECRET=<generate-a-secure-32-char-minimum-string>
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
NODE_ENV=production
PORT=3001

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app

# Optional: CSRF Protection
CSRF_SECRET=<generate-a-secure-32-char-minimum-string>

# Optional: CORS (if you have multiple frontend domains)
ALLOWED_ORIGINS=https://your-app.vercel.app,https://www.yourdomain.com
```

**Important Notes:**
- **DATABASE_URL**: Get this from Railway PostgreSQL service → **"Connect"** → **"Public Network"**
  - If password contains special characters, URL-encode them:
    - `@` = `%40`, `#` = `%23`, `$` = `%24`, `%` = `%25`, `&` = `%26`, `+` = `%2B`, `/` = `%2F`, `:` = `%3A`, `?` = `%3F`, `=` = `%3D`
- **JWT_SECRET**: Generate using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- **CSRF_SECRET**: Generate the same way as JWT_SECRET

### Step 4: Configure Build & Start Commands

In Railway service settings → **"Settings"** → **"Deploy"**:

- **Build Command**: `npm run build`
- **Start Command**: `npm start`

Railway will automatically:
1. Run `npm install` (which triggers `postinstall` → `prisma generate`)
2. Run your build command
3. Run your start command

### Step 5: Deploy

1. Railway will automatically deploy on every push to your main branch
2. Or click **"Deploy"** manually
3. Wait for deployment to complete
4. Note your Railway backend URL (e.g., `https://your-app.up.railway.app`)

### Step 6: Run Database Migrations

After first deployment, migrations should run automatically via `prisma migrate deploy` in the build process.

If migrations fail, you can manually trigger them:

1. Go to Railway service → **"Deployments"**
2. Click on the latest deployment
3. Open **"Logs"**
4. Check for Prisma migration errors

**Common Migration Issues:**

- **P1001 (Can't reach database)**: Check DATABASE_URL is correct
- **P1012 (Migration failed)**: Check migration files are correct
- **P1013 (Invalid database URL)**: URL-encode special characters in password

---

## Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to [Vercel](https://vercel.com) and sign in
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 2: Configure Build Settings

- **Framework Preset**: Next.js
- **Root Directory**: `./` (root of repository)
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 3: Configure Environment Variables

In Vercel project settings → **"Environment Variables"**, add:

```bash
# Backend API URL (from Railway)
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app/api

# Optional: Analytics, etc.
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

**Important:**
- `NEXT_PUBLIC_*` variables are exposed to the browser
- Use `NEXT_PUBLIC_API_URL` to point to your Railway backend
- Update this after you get your Railway backend URL

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete
3. Note your Vercel frontend URL (e.g., `https://your-app.vercel.app`)

### Step 5: Update Backend CORS

After getting your Vercel URL, update Railway backend environment variables:

1. Go back to Railway → Your service → **"Variables"**
2. Update `FRONTEND_URL` to your Vercel URL: `https://your-app.vercel.app`
3. Railway will automatically redeploy

---

## Environment Variables Summary

### Backend (Railway)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string from Railway | `postgresql://postgres:pass@host:port/db?sslmode=require` |
| `JWT_SECRET` | ✅ Yes | At least 32 characters, random string | `abc123...` (32+ chars) |
| `JWT_EXPIRES_IN` | ❌ No | JWT expiration time | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | ❌ No | Refresh token expiration | `7d` |
| `PORT` | ❌ No | Server port (Railway sets automatically) | `3001` |
| `NODE_ENV` | ✅ Yes | Environment | `production` |
| `FRONTEND_URL` | ✅ Yes | Vercel frontend URL | `https://app.vercel.app` |
| `ALLOWED_ORIGINS` | ❌ No | Comma-separated CORS origins | `https://app.vercel.app,https://www.domain.com` |
| `CSRF_SECRET` | ❌ No | CSRF protection secret (32+ chars) | `xyz789...` |

### Frontend (Vercel)

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | Railway backend API URL | `https://app.up.railway.app/api` |
| `NEXT_PUBLIC_APP_URL` | ❌ No | Frontend URL (for redirects) | `https://app.vercel.app` |

---

## Database Migrations

### Automatic Migrations

Migrations run automatically during Railway deployment via:
- `postinstall` script → `prisma generate`
- Build process includes Prisma client generation

### Manual Migration (if needed)

If you need to run migrations manually:

1. **Option 1: Via Railway CLI**
   ```bash
   railway login
   railway link
   railway run npx prisma migrate deploy
   ```

2. **Option 2: Via Railway Dashboard**
   - Go to your service → **"Deployments"**
   - Create a new deployment with custom command: `npx prisma migrate deploy`

### Migration Troubleshooting

**Error: P1001 (Can't reach database)**
- Check DATABASE_URL is correct
- Verify Railway PostgreSQL is running
- Check network connectivity

**Error: P1012 (Migration failed)**
- Check migration SQL files for syntax errors
- Verify database schema matches Prisma schema
- Review migration logs in Railway

**Error: P1013 (Invalid database URL)**
- URL-encode special characters in password
- Ensure `sslmode=require` is included
- Verify connection string format

---

## Troubleshooting

### Backend Issues

**Build fails with TypeScript errors**
- Check `tsconfig.json` is correct
- Verify all route files have explicit type annotations
- Run `npm run build` locally first

**Server won't start**
- Check environment variables are set correctly
- Verify DATABASE_URL is accessible
- Check Railway logs for errors

**CORS errors**
- Verify `FRONTEND_URL` matches your Vercel URL exactly
- Check `ALLOWED_ORIGINS` if using multiple domains
- Ensure no trailing slash mismatches

### Frontend Issues

**API calls fail with CORS**
- Verify `NEXT_PUBLIC_API_URL` points to Railway backend
- Check backend CORS configuration allows your Vercel domain
- Ensure credentials are included in requests

**API calls return 404**
- Verify `NEXT_PUBLIC_API_URL` ends with `/api`
- Check Railway backend is running and accessible
- Test backend health endpoint: `https://your-backend.up.railway.app/api/health`

### Database Issues

**Connection refused**
- Verify DATABASE_URL format
- Check Railway PostgreSQL service is running
- Ensure `sslmode=require` is in connection string

**Migration errors**
- Review migration SQL files
- Check for table/column existence before altering
- Use conditional migrations (IF EXISTS checks)

---

## Quick Reference Commands

### Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate CSRF_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### URL-Encode Special Characters

Common encodings:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- `%` → `%25`
- `&` → `%26`
- `+` → `%2B`
- `/` → `%2F`
- `:` → `%3A`
- `?` → `%3F`
- `=` → `%3D`

### Test Backend Health

```bash
curl https://your-backend.up.railway.app/api/health
```

Expected response:
```json
{"status":"ok","message":"REMS Backend is running"}
```

---

## Security Checklist

- ✅ JWT_SECRET is at least 32 characters and random
- ✅ CSRF_SECRET is set and random
- ✅ DATABASE_URL uses `sslmode=require`
- ✅ CORS only allows Vercel frontend domain
- ✅ NODE_ENV is set to `production`
- ✅ No sensitive data in frontend environment variables
- ✅ Railway and Vercel deployments are private (if needed)

---

## Support

If you encounter issues:

1. Check Railway deployment logs
2. Check Vercel deployment logs
3. Verify all environment variables are set
4. Test backend health endpoint
5. Review this guide's troubleshooting section

---

**Last Updated**: December 2024

