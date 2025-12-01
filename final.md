# Property Management Software Workflow

## Property Module Workflow

### Property Add/Edit/Delete
- **Property Add Karna:**
  - Property add hone par → unique property code auto-generate hota hai (format: PROP-YYYYMMDD-XXXX)
  - Property totalUnits count auto-increment hota hai jab unit add hota hai
  - Activity log create hota hai
  - Dashboard par total properties count update hota hai

- **Property Edit Karna:**
  - Property details update hone par → koi automatic calculation nahi hota
  - Activity log create hota hai

- **Property Delete Karna:**
  - Soft delete hota hai (isDeleted = true)
  - Units aur blocks delete nahi hote, sirf property hide hota hai
  - Dashboard par total properties count update hota hai

### Unit Management
- **Unit Add Karna:**
  - Unit add hone par → property.totalUnits auto-increment hota hai
  - Unit status default "Vacant" hota hai
  - Activity log create hota hai

- **Unit Status Update:**
  - Tenant assign hone par → unit status "Occupied" ho jata hai
  - Tenant delete hone par → unit status "Vacant" ho jata hai
  - Occupancy calculation automatically update hota hai

### Revenue Calculation
- **Monthly Revenue:**
  - Sab occupied units ki monthlyRent sum karke calculate hota hai
  - Formula: SUM(monthlyRent) where status = 'Occupied'
  - Dashboard par real-time update hota hai
  - Property-wise revenue bhi calculate hota hai

### Occupancy Calculation
- **Occupancy Rate:**
  - Formula: (occupiedUnits + rentedOrSoldHouses) / (totalUnits + totalHouses) * 100
  - Houses ko separately handle kiya jata hai (type = 'house')
  - Occupied units count: status = 'Occupied' wale units
  - Vacant units count: status = 'Vacant' wale units
  - Dashboard par percentage format mein show hota hai (1 decimal place)

---

## Tenant Module Workflow

### Tenant Add/Edit/Delete
- **Tenant Add Karna:**
  - Tenant add hone par → unique tenant code auto-generate hota hai (format: TENANT-YYYYMMDD-XXXX)
  - Unit status automatically "Occupied" ho jata hai
  - Unit check hota hai ke already occupied to nahi hai
  - Activity log create hota hai
  - Dashboard par total tenants count update hota hai

- **Tenant Edit Karna:**
  - Tenant details update hone par → koi automatic calculation nahi hota
  - Activity log create hota hai

- **Tenant Delete Karna:**
  - Soft delete hota hai (isDeleted = true)
  - Unit status automatically "Vacant" ho jata hai
  - Dashboard par total tenants count update hota hai

### Lease Creation
- **Lease Banane Par:**
  - Lease create hone par → tenant aur unit verify hote hain
  - Lease dates validate hote hain (leaseEnd > leaseStart)
  - Activity log create hota hai
  - **IMPORTANT:** Invoice automatically generate NAHI hota lease creation par
  - Invoice manually create karna padta hai ya scheduled job se generate hota hai

### Lease to Invoice Workflow (BROKEN)
- **Missing Auto-Invoice:**
  - Lease create hone par invoice automatically generate nahi hota
  - `generateMonthlyInvoices()` function exist karta hai lekin manually call karna padta hai
  - Tenancy model use hota hai monthly invoices ke liye, lekin lease se tenancy automatically create nahi hota
  - **Fix Required:** Lease create hone par automatically invoice generate hona chahiye

---

## Finance Module Workflow

### Invoice Management
- **Invoice Create Karna:**
  - Invoice create hone par → unique invoice number auto-generate hota hai (format: INV-YYYYMMDD-XXX)
  - Tax calculation: taxAmount = (amount * taxPercent) / 100
  - Total amount: totalAmount = amount + taxAmount - discountAmount
  - Remaining amount: remainingAmount = totalAmount (initially)
  - Journal entry automatically create hota hai:
    - Debit: Tenant Account (receivable)
    - Credit: Income Account
  - Invoice status: 'unpaid' (default)

- **Invoice Auto-Sync:**
  - Invoice create hone par → Finance Ledger mein automatically entry create hoti hai
  - `syncInvoiceToFinanceLedger()` function automatically call hota hai
  - Category: 'income'
  - Tenant ledger mein bhi entry create hoti hai (debit)

### Payment Processing
- **Payment Receive Karna:**
  - Payment create hone par → unique payment code auto-generate hota hai (format: PAY-YYYYMMDD-XXX)
  - Invoice allocation automatically hota hai:
    - Specific invoice select ho to us invoice par apply hota hai
    - Multiple invoices par allocate kar sakte hain (oldest first)
    - Partial payment support hota hai
  - Invoice status update hota hai:
    - Fully paid → status = 'paid'
    - Partially paid → status = 'partial'
    - Remaining amount calculate hota hai
  - Tenant outstanding balance update hota hai
  - Tenant ledger mein entry create hoti hai (credit)
  - Journal entry automatically create hota hai:
    - Debit: Bank/Cash Account
    - Credit: Receivable Account
    - Overpayment ho to Advance Account mein credit hota hai
  - Receipt automatically generate hota hai

- **Payment Auto-Sync:**
  - Payment create hone par → Finance Ledger mein automatically entry create hoti hai
  - `syncPaymentToFinanceLedger()` function automatically call hota hai
  - Category: 'income'
  - Dashboard revenue automatically update hota hai

### Overdue Rent Alerts (PARTIALLY IMPLEMENTED)
- **Overdue Detection:**
  - `calculateOverdueInvoices()` function exist karta hai
  - Invoice status automatically 'overdue' ho jata hai jab dueDate < today
  - Late fee calculation:
    - Fixed: daysOverdue * fixedAmount
    - Percentage: (totalAmount * percentage * daysOverdue) / 30
  - **Missing:** Automatic alerts/notifications send nahi hote
  - **Missing:** Scheduled job nahi hai jo daily overdue invoices check kare
  - **Fix Required:** Daily cron job chahiye jo overdue invoices check kare aur alerts send kare

### Rent Payment Flow
- **Complete Flow:**
  1. Invoice create hota hai → Finance Ledger update → Tenant Ledger debit entry
  2. Payment receive hota hai → Invoice status update → Tenant Ledger credit entry → Finance Ledger update
  3. Dashboard revenue automatically update hota hai
  4. Tenant portal par balance update hota hai

---

## CRM Module Workflow

### Lead Management
- **Lead Create Karna:**
  - Lead add hone par → unique lead code auto-generate hota hai (format: LEAD-YYYYMMDD-XXXX)
  - Activity log create hota hai
  - Dashboard par total leads count update hota hai

- **Lead to Client Conversion:**
  - Lead convert hone par → Client create hota hai
  - Client code auto-generate hota hai (format: CLIENT-YYYYMMDD-XXXX)
  - Client number auto-generate hota hai (format: CL-XXXX, sequential)
  - Activity log create hota hai

### Client to Tenant Conversion
- **Client se Tenant:**
  - Client ko tenant mein convert karna manual process hai
  - Automatic conversion nahi hota
  - **Fix Required:** Client se tenant conversion workflow add karna chahiye

### Deal Management
- **Deal Create Karna:**
  - Deal create hone par → unique deal code auto-generate hota hai
  - Commission calculation: commissionAmount = (value * commissionRate) / 100
  - Expected revenue: expectedRevenue = (value * probability) / 100
  - Activity log create hota hai

- **Deal Stage Update:**
  - Deal stage update hone par → commission recalculate hota hai
  - Expected revenue recalculate hota hai
  - Stage history create hoti hai
  - Deal "closed-won" ho to → Finance Ledger mein automatically entry create hoti hai
  - `syncDealToFinanceLedger()` function automatically call hota hai
  - Category: 'income'
  - Dashboard revenue update hota hai

### Dealer Commission
- **Commission Calculation:**
  - Sale create hone par → commission automatically calculate hota hai
  - Formula: commission = (saleValue * commissionRate) / 100
  - Default commission rate: 2%
  - Dealer ka commission rate use hota hai agar dealer assigned ho
  - Commission record create hota hai
  - Finance Ledger mein expense entry create hoti hai (dealer commission payment ke liye)

---

## HR Module Workflow

### Employee Management
- **Employee Add Karna:**
  - Employee add hone par → unique employee ID auto-generate hota hai (format: EMPXXXX, sequential)
  - Probation end date automatically calculate hoti hai agar probation period diya ho
  - Activity log create hota hai
  - Dashboard par total employees count update hota hai

- **Employee Edit Karna:**
  - Employee details update hone par → probation end date recalculate hoti hai agar probation period change ho
  - Activity log create hota hai

### Attendance Management
- **Check-In:**
  - Check-in hone par → attendance record create/update hota hai
  - Late detection: 9 AM se late ho to status = 'late', warna 'present'
  - Activity log create hota hai

- **Check-Out:**
  - Check-out hone par → work hours automatically calculate hote hain
  - Formula: hours = (checkOutTime - checkInTime) / (1000 * 60 * 60)
  - Attendance record update hota hai

- **Overtime Calculation:**
  - Work hours > 8 hours ho to overtime calculate hota hai
  - Overtime amount payroll mein include hota hai
  - **Note:** Overtime calculation payroll creation time par hota hai

### Payroll Management
- **Payroll Create Karna:**
  - Payroll create hone par → calculations automatically hote hain:
    - Gross Salary = basicSalary + allowances + bonus + overtimeAmount
    - Tax Amount = (grossSalary * taxPercent) / 100
    - Net Pay = grossSalary - deductions - taxAmount
  - Allowances list create hoti hai (PayrollAllowance records)
  - Deductions list create hoti hai (PayrollDeduction records)
  - Activity log create hota hai

- **Payroll Payment:**
  - Payroll status 'paid' hone par → Finance Ledger mein automatically entry create hoti hai
  - `syncPayrollToFinanceLedger()` function automatically call hota hai
  - Category: 'expense'
  - Amount: netPay
  - Dashboard expenses update hote hain

### Leave Management
- **Leave Request:**
  - Leave request create hone par → status 'pending' hota hai
  - Approval workflow manual hai
  - Dashboard par pending leaves count update hota hai
  - Urgent leaves (3 days mein) highlight hote hain

---

## Dashboard Module Workflow

### KPI Auto-Updates
- **Properties KPIs:**
  - Total properties: real-time count (isDeleted = false)
  - Active properties: status = 'Active' count
  - Occupancy rate: automatically calculate (formula above)
  - Monthly revenue: SUM(monthlyRent) from occupied units
  - Properties change: this month vs last month comparison

- **Tenants KPIs:**
  - Total tenants: real-time count (isDeleted = false)
  - Tenants change: this month vs last month comparison

- **Finance KPIs:**
  - Total revenue: SUM(amount) from income transactions
  - Monthly revenue: current month income transactions
  - Outstanding payments: SUM(remainingAmount) from unpaid invoices
  - Monthly expenses: current month expense transactions
  - Revenue change: current month vs previous month percentage
  - Expenses change: current month vs previous month percentage

- **HR KPIs:**
  - Total employees: real-time count (isDeleted = false)
  - Active today: today's attendance count (status = 'present' or 'late')
  - Attendance rate: (activeToday / totalEmployees) * 100
  - Pending leaves: status = 'pending' count
  - Average work hours: last 7 days ka average

- **CRM KPIs:**
  - Total leads: all leads count
  - Active leads: status in ['new', 'qualified', 'negotiation']
  - Converted leads: status = 'won'
  - Conversion rate: (convertedLeads / totalLeads) * 100
  - Total clients: all clients count
  - Active deals: stage in ['prospecting', 'proposal', 'negotiation']

### Real-Time Updates
- **Automatic Updates:**
  - Property add/edit/delete → Properties KPI update
  - Tenant add/edit/delete → Tenants KPI update
  - Payment receive → Revenue KPI update
  - Invoice create → Outstanding payments KPI update
  - Payroll paid → Expenses KPI update
  - Attendance mark → HR KPI update
  - Lead convert → CRM KPI update

---

## Tenant Portal Workflow

### Tenant Dashboard
- **Dashboard Data:**
  - Current rent: active lease ka rent amount
  - Overdue rent: overdue invoices ka total remaining amount
  - Next due date: upcoming invoices ka earliest due date
  - Outstanding balance: unpaid invoices ka total remaining amount
  - Lease expiry days: active lease end date se days remaining
  - Pending tickets: open/in-progress maintenance tickets count

### Rent History
- **Ledger View:**
  - Tenant ledger automatically generate hota hai invoices aur payments se
  - Debit entries: invoices (rent charges)
  - Credit entries: payments (rent payments)
  - Running balance automatically calculate hota hai
  - Invoice aur payment details show hote hain

### Payment Processing
- **Online Payment:**
  - Payment create hone par → invoice automatically update hota hai
  - Tenant outstanding balance update hota hai
  - Tenant ledger mein credit entry create hoti hai
  - Receipt automatically generate hota hai
  - Payment status: 'completed' (online) ya 'pending' (bank slip)

### Maintenance Requests
- **Ticket Create Karna:**
  - Ticket create hone par → unique ticket number auto-generate hota hai (format: TKT-YYYYMMDD-XXXX)
  - Maintenance activity log create hota hai
  - Ticket status: 'open' (default)
  - Dashboard par pending tickets count update hota hai

### Notices
- **Notice to Vacate:**
  - Notice submit hone par → unique notice number auto-generate hota hai (format: NOT-YYYYMMDD-XXXX)
  - Notice status: 'pending' (default)
  - Approval workflow manual hai

---

## Broken Workflows aur Missing Auto-Updates

### 1. Lease se Invoice Auto-Generation (BROKEN)
- **Problem:** Lease create hone par invoice automatically generate nahi hota
- **Current State:** Invoice manually create karna padta hai
- **Expected:** Lease create hone par automatically first month ka invoice generate hona chahiye
- **Fix:** Lease creation route mein `generateInvoiceFromLease()` function call karna chahiye

### 2. Overdue Rent Alerts (MISSING)
- **Problem:** Overdue invoices ka automatic alert system nahi hai
- **Current State:** `calculateOverdueInvoices()` function exist karta hai lekin manually call karna padta hai
- **Expected:** Daily cron job jo overdue invoices check kare aur:
  - Invoice status 'overdue' update kare
  - Late fees calculate kare
  - Tenant ko email/SMS alert send kare
  - Dashboard par overdue alerts show kare
- **Fix:** Scheduled job add karna chahiye jo daily run ho

### 3. Monthly Invoice Auto-Generation (PARTIALLY IMPLEMENTED)
- **Problem:** Monthly invoices automatically generate nahi hote
- **Current State:** `generateMonthlyInvoices()` function exist karta hai lekin scheduled job nahi hai
- **Expected:** Monthly cron job jo har month 1st date ko run ho aur sab active tenancies ke liye invoices generate kare
- **Fix:** Scheduled job add karna chahiye jo monthly run ho

### 4. Client to Tenant Conversion (MISSING)
- **Problem:** Client ko tenant mein convert karne ka automatic workflow nahi hai
- **Current State:** Manual process hai
- **Expected:** Client se tenant conversion button/option hona chahiye jo:
  - Client data se tenant create kare
  - Related deals link kare
  - CRM history preserve kare
- **Fix:** Conversion workflow add karna chahiye

### 5. Lease Expiry Alerts (MISSING)
- **Problem:** Lease expiry alerts automatically send nahi hote
- **Current State:** Dashboard par lease expiry days show hote hain lekin alerts nahi
- **Expected:** Lease expiry se 30 days, 15 days, aur 7 days pehle automatic alerts
- **Fix:** Scheduled job add karna chahiye jo daily lease expiry check kare

### 6. Finance Ledger Auto-Sync (PARTIALLY WORKING)
- **Problem:** Kuch transactions automatically sync nahi hote
- **Current State:**
  - Invoice → Finance Ledger: ✅ Auto-sync
  - Payment → Finance Ledger: ✅ Auto-sync
  - Deal → Finance Ledger: ✅ Auto-sync (closed-won par)
  - Payroll → Finance Ledger: ✅ Auto-sync (paid status par)
  - Property expenses → Finance Ledger: ❌ Manual sync required
  - Maintenance costs → Finance Ledger: ❌ Manual sync required
- **Fix:** Property expenses aur maintenance costs ke liye auto-sync add karna chahiye

### 7. Unit Rent Update (MISSING AUTO-UPDATE)
- **Problem:** Unit ka monthlyRent update hone par existing leases update nahi hote
- **Current State:** Unit rent change hone par existing leases par effect nahi hota
- **Expected:** Unit rent update hone par:
  - Active leases ka rent update option dena chahiye
  - Ya warning dena chahiye ke existing leases par effect hoga
- **Fix:** Unit rent update par validation aur warning add karni chahiye

### 8. Dealer Commission Payment Tracking (MISSING)
- **Problem:** Dealer commission payment track nahi hota
- **Current State:** Commission calculate hota hai lekin payment status track nahi hota
- **Expected:** Commission payment status (pending/paid) track hona chahiye
- **Fix:** Commission model mein payment status field add karni chahiye

---

## Summary: Working Workflows

### ✅ Fully Working:
1. Property add/edit/delete → Dashboard update
2. Tenant add/edit/delete → Unit status update, Dashboard update
3. Invoice create → Finance Ledger sync, Tenant Ledger update, Journal entry
4. Payment receive → Invoice update, Tenant balance update, Finance Ledger sync, Receipt generate
5. Payroll create → Calculations (gross, tax, net), Finance Ledger sync (paid par)
6. Attendance check-in/out → Hours calculation, Status update
7. Deal stage update → Commission calculation, Finance Ledger sync (closed-won par)
8. Occupancy calculation → Real-time from unit status
9. Revenue calculation → Real-time from occupied units
10. Dashboard KPIs → Real-time updates from all modules

### ⚠️ Partially Working:
1. Monthly invoice generation → Function exist hai lekin scheduled job nahi
2. Overdue rent detection → Function exist hai lekin alerts nahi
3. Finance Ledger sync → Most transactions sync hote hain, kuch manual

### ❌ Missing/Broken:
1. Lease se invoice auto-generation
2. Overdue rent automatic alerts
3. Monthly invoice scheduled job
4. Client to tenant conversion workflow
5. Lease expiry alerts
6. Property expenses auto-sync
7. Unit rent update validation
8. Dealer commission payment tracking

---

## Recommendations

1. **Immediate Fixes:**
   - Lease creation par invoice auto-generation add karo
   - Monthly invoice generation ke liye scheduled job add karo
   - Overdue rent alerts ke liye scheduled job add karo

2. **Short-term Improvements:**
   - Client to tenant conversion workflow
   - Lease expiry alerts
   - Property expenses auto-sync

3. **Long-term Enhancements:**
   - Unit rent update validation
   - Dealer commission payment tracking
   - Advanced reporting aur analytics

---

**Note:** Ye document sirf workflow aur data flow ko explain karta hai. UI details, dialog boxes, aur extra fields include nahi kiye gaye hain. Sab calculations aur auto-updates ka detailed explanation diya gaya hai.

