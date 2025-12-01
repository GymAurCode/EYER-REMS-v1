# Quick Start Guide - Frontend Tests

## ⚡ Fast Setup (3 Steps)

### Step 1: Install Dependencies
```bash
cd frontend_tests
npm install
npx playwright install
```

### Step 2: Start Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
# From project root (not frontend_tests)
npm run dev
```

**Terminal 3 - Run Tests:**
```bash
cd frontend_tests
npm test
```

### Step 3: View Results

After tests complete:
```bash
# View HTML report
npm run test:report

# Or generate markdown report
node generate-report.js
```

## 🎯 What Gets Tested

✅ **All Pages**: Dashboard, Properties, Finance, HR, CRM, Tenant Portal  
✅ **All Forms**: Validation, required fields, data types  
✅ **All Actions**: Create, Edit, Delete operations  
✅ **All Calculations**: Rent, Revenue, Occupancy, Payroll, Commissions  
✅ **All Toasts**: Success, Error, Info notifications  
✅ **All Navigation**: Module links, routing  
✅ **Edge Cases**: Empty states, validation, errors  

## 📊 Expected Results

- **Total Tests**: ~50+ test cases
- **Modules Tested**: 11 test files
- **Coverage**: All major UI workflows

## 🐛 Troubleshooting

### Error: "Missing script: dev"
- **Solution**: Start frontend server manually from project root: `npm run dev`

### Error: "ECONNREFUSED"
- **Solution**: Ensure both servers are running (backend on 3001, frontend on 3000)

### Error: "Authentication failed"
- **Solution**: Seed database: `cd server && npm run prisma:seed`

### Tests are slow
- **Normal**: E2E tests take time. Use `npm run test:ui` for interactive debugging.

## 📝 Next Steps

1. Run tests: `npm test`
2. Review report: `npm run test:report`
3. Fix any failures
4. Add more specific test cases as needed

