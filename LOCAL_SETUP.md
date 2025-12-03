# Local Development Setup

## Quick Start

### 1. Backend Server (Port 3001)
```bash
cd server
npm install
# Make sure .env file exists with:
# DATABASE_URL=postgresql://user:password@localhost:5432/rems_db
# JWT_SECRET=your-secret-key-minimum-32-characters-long
# PORT=3001
npm run dev
```

### 2. Frontend (Port 3000)
```bash
# In root directory
npm install
npm run dev
```

## Environment Variables

### Backend (.env in server folder)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/rems_db
JWT_SECRET=your-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local in root)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Troubleshooting

### Backend not connecting?
1. Check if backend is running: `curl http://localhost:3001/api/health`
2. Check if port 3001 is in use: `netstat -ano | findstr :3001`
3. Restart backend server

### CORS Errors?
- Backend CORS is configured for localhost:3000 and localhost:5173
- Make sure frontend is running on port 3000

### Database Issues?
1. Make sure PostgreSQL is running
2. Run migrations: `cd server && npx prisma migrate dev`
3. Generate Prisma client: `cd server && npx prisma generate`

