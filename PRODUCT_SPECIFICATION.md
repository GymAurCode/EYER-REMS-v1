# Real Estate ERP System (REMS) - Product Specification Document

**Version:** 1.0.0  
**Last Updated:** January 2025  
**Document Status:** Final

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [System Architecture](#system-architecture)
4. [Core Modules](#core-modules)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Functional Requirements](#functional-requirements)
7. [Technical Specifications](#technical-specifications)
8. [User Interface & Experience](#user-interface--experience)
9. [Security & Compliance](#security--compliance)
10. [Integration & APIs](#integration--apis)
11. [Performance Requirements](#performance-requirements)
12. [Deployment & Infrastructure](#deployment--infrastructure)
13. [Future Enhancements](#future-enhancements)

---

## Executive Summary

The Real Estate ERP System (REMS) is a comprehensive, cloud-based enterprise resource planning solution designed specifically for real estate management companies. The system streamlines property management, tenant relations, financial operations, human resources, and customer relationship management through an integrated platform.

### Key Value Propositions

- **Unified Platform**: Single system managing properties, tenants, finances, HR, and CRM
- **Real-time Analytics**: Comprehensive dashboards with actionable insights
- **Automated Workflows**: Reduced manual work through automation
- **Role-based Access**: Secure, permission-based access control
- **Mobile-responsive**: Access from any device, anywhere
- **Scalable Architecture**: Built to grow with your business

### Target Users

- Real Estate Management Companies
- Property Management Firms
- Real Estate Developers
- Property Investment Companies
- Facility Management Companies

---

## Product Overview

### Product Vision

To provide a complete, integrated ERP solution that enables real estate management companies to efficiently manage all aspects of their business operations from a single platform, improving productivity, reducing costs, and enhancing tenant satisfaction.

### Product Goals

1. **Operational Efficiency**: Reduce manual processes by 70%
2. **Financial Transparency**: Real-time financial reporting and analytics
3. **Tenant Satisfaction**: Improved communication and service delivery
4. **Data-Driven Decisions**: Comprehensive analytics and reporting
5. **Scalability**: Support growth from 10 to 10,000+ properties

### Key Features

- Property & Unit Management
- Tenant Portal & Lease Management
- Financial Management & Accounting
- CRM & Lead Management
- HR & Payroll Management
- Automated Reporting & Analytics
- AI-Powered Intelligence
- Document Management
- Notification System

---

## System Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 15.5.4
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4.1.9
- **UI Components**: Radix UI (latest)
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation
- **State Management**: React Context API
- **HTTP Client**: Axios 1.7.9

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.21.1
- **Language**: TypeScript 5.6.3
- **ORM**: Prisma 5.19.1
- **Database**: PostgreSQL 14+
- **Authentication**: JWT (jsonwebtoken 9.0.2)
- **Password Hashing**: bcryptjs 2.4.3
- **File Upload**: Multer 1.4.5
- **Validation**: Zod 3.23.8

#### Database
- **Primary Database**: PostgreSQL
- **ORM**: Prisma Client
- **Migrations**: Prisma Migrate

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Next.js    │  │   React UI   │  │   Charts     │     │
│  │   Frontend   │  │  Components  │  │  (Recharts)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/REST API
                            │
┌─────────────────────────────────────────────────────────────┐
│                  Application Layer (Server)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Express.js  │  │   Auth/JWT   │  │   RBAC       │     │
│  │   REST API    │  │  Middleware  │  │  Middleware  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Routes      │  │  Controllers │  │   Services   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Prisma ORM
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (PostgreSQL)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Properties │  │   Finance    │  │     HR       │     │
│  │   & Units    │  │   & Accounts │  │  & Payroll   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     CRM      │  │    Tenant    │  │   Users &    │     │
│  │   & Leads    │  │   Portal     │  │   Roles      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture

- **Frontend**: Vercel/Netlify or self-hosted
- **Backend**: Node.js server (AWS, Azure, GCP, or self-hosted)
- **Database**: PostgreSQL (managed or self-hosted)
- **File Storage**: Local filesystem or cloud storage (S3, Azure Blob, etc.)

---

## Core Modules

### 1. Dashboard & Analytics Module

**Purpose**: Centralized view of key metrics and system overview

**Features**:
- Real-time KPI cards (Properties, Tenants, Revenue, Employees, etc.)
- Revenue vs Expenses charts (monthly/yearly)
- Property type distribution (pie chart)
- Occupancy rate trends
- Sales pipeline funnel
- Recent activities feed
- Quick action buttons
- Auto-refresh capability

**Key Metrics Displayed**:
- Total Properties
- Total Units (Occupied/Vacant)
- Total Tenants
- Monthly Revenue
- Monthly Expenses
- Monthly Profit
- Total Employees
- Active Leads
- Active Deals
- Occupancy Rate
- Sales Value

**Charts & Visualizations**:
- Revenue vs Expenses (Line/Bar Chart)
- Property Type Distribution (Pie Chart)
- Occupancy Trends (Line Chart)
- Sales Funnel (Funnel/Bar Chart)
- Monthly Revenue Breakdown

---

### 2. Properties Management Module

**Purpose**: Comprehensive property and unit lifecycle management

#### 2.1 Property Management

**Features**:
- **Property CRUD Operations**
  - Create, Read, Update, Delete properties
  - Auto-generated unique property codes (PROP-YYYYMMDD-XXXX)
  - Soft delete functionality
  - Property search and filtering

- **Property Details**
  - Basic Info: Name, title, type (Residential/Commercial/Industrial/Land)
  - Location: Address, city, location, coordinates
  - Physical Attributes: Size (sq ft), total area, year built
  - Financial: Rent amount, security deposit, rent escalation %
  - Ownership: Owner name, owner phone
  - Status: Vacant, Occupied, Under-Maintenance
  - Documents: Multiple document attachments
  - Images: Property photos

- **Property Organization**
  - Blocks management (A, B, C, etc.)
  - Floors management (Ground, 1st, 2nd, etc.)
  - Hierarchical structure

- **Property Analytics**
  - Total units count (auto-calculated)
  - Occupancy rate
  - Revenue per property
  - Expense tracking

#### 2.2 Unit Management

**Features**:
- **Unit CRUD Operations**
  - Create, Read, Update, Delete units
  - Link units to properties, blocks, and floors
  - Unit status tracking (Vacant/Occupied)
  - Soft delete functionality

- **Unit Details**
  - Unit name/number
  - Monthly rent
  - Description
  - Status (Vacant/Occupied)
  - Associated tenant (if occupied)

- **Unit Status Automation**
  - Auto-update to "Occupied" when tenant assigned
  - Auto-update to "Vacant" when tenant removed
  - Maintenance history tracking

#### 2.3 Property Reports

**Features**:
- Properties list with filters
- Vacant units report
- Occupied units report
- Properties for sale
- Lease expiry report
- Revenue by property
- Property expenses report

---

### 3. Tenant Management Module

**Purpose**: Complete tenant lifecycle and lease management

#### 3.1 Tenant Management

**Features**:
- **Tenant CRUD Operations**
  - Create, Read, Update, Delete tenants
  - Auto-generated unique tenant codes (TENANT-YYYYMMDD-XXXX)
  - Soft delete functionality
  - Tenant search and filtering

- **Tenant Details**
  - Personal Info: Name, email, phone, CNIC
  - Address information
  - Profile photo upload
  - CNIC document upload
  - Tenant code (unique identifier)
  - Status: Active/Inactive

- **Financial Tracking**
  - Advance balance
  - Outstanding balance
  - Payment history
  - Invoice history

- **Unit Assignment**
  - One-to-one relationship with units
  - Automatic unit status update
  - Lease history tracking

#### 3.2 Lease Management

**Features**:
- **Lease CRUD Operations**
  - Create, Read, Update, Delete leases
  - Auto-generated lease numbers
  - Lease document upload (PDF)

- **Lease Details**
  - Lease start and end dates
  - Monthly rent amount
  - Security deposit
  - Notice period (days)
  - Renewal date tracking
  - Renewal history (JSON array)
  - Terms and conditions
  - Rent terms (payment day, late fee rules)
  - Status: Active, Expired, Terminated, Renewed

- **Lease Automation**
  - Auto-calculate next invoice date
  - Track lease expiry
  - Renewal reminders
  - Lease expiry notifications

#### 3.3 Tenant Portal

**Purpose**: Self-service portal for tenants

**Features**:
- **Tenant Login**
  - Secure authentication
  - Password-based login
  - Last login tracking

- **Dashboard**
  - Tenant profile overview
  - Current lease information
  - Outstanding balance
  - Upcoming payments
  - Recent transactions

- **Payment Management**
  - View invoices
  - Payment history
  - Receipts download
  - Payment reminders

- **Maintenance Requests**
  - Submit maintenance tickets
  - Track ticket status
  - View maintenance history
  - Upload photos for issues

- **Lease Management**
  - View lease documents
  - Lease expiry information
  - Renewal requests

- **Notifications**
  - Payment reminders
  - Lease expiry notifications
  - Maintenance updates
  - Announcements

- **Documents**
  - View receipts
  - Download lease documents
  - View notices

---

### 4. Financial Management Module

**Purpose**: Complete financial operations and accounting

#### 4.1 Transactions Management

**Features**:
- **Transaction CRUD**
  - Create, Read, Update, Delete transactions
  - Auto-generated transaction codes (TX-YYYYMMDD-####)
  - Transaction categories
  - Transaction types: Income, Expense

- **Transaction Details**
  - Transaction code (unique)
  - Type (Income/Expense)
  - Category
  - Description
  - Amount (base, tax, total)
  - Payment method
  - Date
  - Status: Completed, Pending, Failed
  - Linked accounts (Debit/Credit)
  - Attachments
  - Linked entities (Tenant, Dealer, Property)

- **Transaction Validation**
  - Debit = Credit balance validation
  - Date validation
  - Amount validation
  - Account validation

#### 4.2 Invoice Management

**Features**:
- **Invoice CRUD**
  - Create, Read, Update, Delete invoices
  - Auto-generated invoice numbers
  - Invoice templates

- **Invoice Details**
  - Invoice number (unique)
  - Tenant/Property linkage
  - Billing date
  - Due date
  - Amount breakdown:
    - Base amount
    - Tax percentage
    - Tax amount
    - Discount amount
    - Total amount
    - Remaining amount
  - Late fee rules (Fixed, Percentage, None)
  - Status: Unpaid, Paid, Overdue, Cancelled, Partial
  - Terms and conditions
  - Attachments
  - Linked accounts

- **Invoice Automation**
  - Auto-generate monthly invoices
  - Overdue detection
  - Partial payment tracking
  - Payment allocation

#### 4.3 Payment Management

**Features**:
- **Payment CRUD**
  - Create, Read, Update, Delete payments
  - Auto-generated payment IDs
  - Payment allocation

- **Payment Details**
  - Payment ID (unique)
  - Tenant/Invoice linkage
  - Amount
  - Payment method (Cash, Bank, Online, Card, Other)
  - Reference number
  - Date
  - Status: Completed, Pending, Failed, Refunded
  - Allocated amount
  - Overpayment amount
  - Allocations (JSON)
  - Notes
  - Attachments
  - Linked accounts

- **Payment Allocation**
  - Automatic allocation to invoices
  - Partial payment handling
  - Overpayment tracking
  - Advance balance management

#### 4.4 Accounting System

**Features**:
- **Chart of Accounts**
  - Account management (CRUD)
  - Account types: Asset, Liability, Equity, Revenue, Expense
  - Account codes
  - Account hierarchy
  - Active/Inactive status

- **Journal Entries**
  - Create journal entries
  - Auto-generated entry numbers
  - Multiple journal lines
  - Debit/Credit validation
  - Status: Draft, Posted, Cancelled
  - Prepared by / Approved by tracking
  - Narration field

- **Vouchers**
  - Bank Payment Vouchers
  - Bank Receipt Vouchers
  - Cash Payment Vouchers
  - Cash Receipt Vouchers
  - Voucher numbering
  - Approval workflow
  - Attachments

- **Ledgers**
  - General Ledger
  - Tenant Ledger
  - Account Ledgers
  - Real-time balance calculation
  - Transaction history
  - Balance reports

#### 4.5 Commissions Management

**Features**:
- **Commission Tracking**
  - Commission calculation
  - Commission rates
  - Dealer commissions
  - Sale commissions
  - Commission history
  - Commission settlement

- **Commission Details**
  - Dealer/Sale linkage
  - Commission rate (%)
  - Commission amount
  - Status tracking
  - Payment status

#### 4.6 Financial Reports

**Features**:
- Revenue vs Expenses (Monthly/Yearly)
- Profit & Loss Statement
- Balance Sheet
- Cash Flow Statement
- Accounts Receivable Report
- Accounts Payable Report
- Commission Reports
- Transaction Reports
- Invoice Reports
- Payment Reports

---

### 5. CRM Module

**Purpose**: Customer relationship and lead management

#### 5.1 Lead Management

**Features**:
- **Lead CRUD**
  - Create, Read, Update, Delete leads
  - Auto-generated lead codes
  - Lead conversion to clients

- **Lead Details**
  - Basic Info: Name, email, phone, CNIC
  - Source: Website, Referral, Social Media, Event, Walk-in, Advertisement, Other
  - Source details
  - Interest: Buy, Rent, Invest
  - Interest Type: Residential, Commercial, Industrial, Land
  - Budget: Min/Max values
  - Location: Street, city, country, postal code, coordinates
  - Agent Assignment
  - Tags (multiple)
  - Documents/Attachments
  - Notes
  - Priority: Low, Medium, High, Urgent
  - Score (lead scoring)
  - Temperature: Cold, Warm, Hot
  - Expected close date
  - Follow-up date
  - Communication preference

- **Lead Stages**
  - New
  - Qualified
  - Negotiation
  - Won
  - Lost
  - Converted

- **Lead Features**
  - Search by name, email, phone
  - Filter by status, priority, temperature
  - Convert to client (one-click)
  - Lead scoring
  - Follow-up reminders

#### 5.2 Client Management

**Features**:
- **Client CRUD**
  - Create, Read, Update, Delete clients
  - Auto-generated client codes
  - Client numbering

- **Client Details**
  - Basic Info: Name, email, phone, CNIC
  - Client Type: Individual, Corporate, Government
  - Client Category: VIP, Regular, Corporate, Premium
  - Company name (for corporate)
  - Addresses: Billing address, mailing address
  - Status: Active, Inactive, VIP
  - Property interest
  - Property linkage
  - Assigned dealer
  - Assigned agent
  - Contact persons (multiple)
  - Tags
  - Documents/Attachments
  - Converted from lead (tracking)

- **Client Features**
  - Search by name, email, company
  - Filter by type, status, category
  - Contact person management
  - Deal history
  - Communication history

#### 5.3 Dealer Management

**Features**:
- **Dealer CRUD**
  - Create, Read, Update, Delete dealers
  - Auto-generated dealer codes

- **Dealer Details**
  - Basic Info: Name, email, phone, CNIC
  - Company name
  - Commission rate (%)
  - Address information
  - Bank details (Account, Bank, Branch, IBAN)
  - Qualifications
  - Experience years
  - Assigned region
  - Rating (0-5)
  - Status: Active/Inactive
  - CNIC image
  - Agreement contract
  - Tags
  - Notes

- **Dealer Analytics**
  - Total deals closed
  - Total commission earned
  - Current pipeline value
  - Settlement history
  - Reviews and ratings

#### 5.4 Deal Management

**Features**:
- **Deal CRUD**
  - Create, Read, Update, Delete deals
  - Auto-generated deal codes

- **Deal Details**
  - Title
  - Deal code (unique)
  - Value and value breakdown
  - Deal type: Rental, Sale, Investment
  - Stage: Prospecting, Qualified, Proposal, Negotiation, Closing, Closed-Won, Closed-Lost
  - Probability (0-100%)
  - Client linkage
  - Dealer linkage
  - Property linkage
  - Commission rate and amount
  - Expected closing date
  - Actual closing date
  - Expected revenue (calculated)
  - Attachments
  - Notes
  - Tags
  - Approval workflow
  - Deal agents (multiple)

- **Deal Features**
  - Stage history tracking
  - Probability calculation
  - Expected revenue calculation
  - Deal agents assignment
  - Commission calculation
  - Approval workflow

#### 5.5 Communication Management

**Features**:
- **Communication Logging**
  - Log all communications
  - Multiple channels: Email, Phone, Meeting, WhatsApp, SMS, Message
  - Activity types: Call, Email, Meeting, Note, WhatsApp, SMS

- **Communication Details**
  - Channel
  - Activity type
  - Subject
  - Content
  - Activity date
  - Activity outcome
  - Attachments
  - Voice notes
  - Next follow-up date
  - Reminder settings
  - Recurrence
  - Contact person
  - Assigned agent
  - Tags

- **Communication Features**
  - Link to Leads, Clients, Deals
  - Follow-up reminders
  - Recurring communications
  - Communication history
  - Search and filter

#### 5.6 CRM Activities

**Features**:
- Activity tracking
- Task management
- Reminder system
- Activity history
- Link to Leads, Clients, Deals

---

### 6. HR Management Module

**Purpose**: Human resources and workforce management

#### 6.1 Employee Management

**Features**:
- **Employee CRUD**
  - Create, Read, Update, Delete employees
  - Auto-generated employee IDs
  - Soft delete functionality

- **Employee Details**
  - **Basic Info**
    - Name, gender, DOB, blood group, nationality, CNIC
  - **Contact Info**
    - Phone, email, address (full with city, country, postal code)
  - **Employment Info**
    - Employee ID (auto-generated)
    - Department, position, role
    - Reporting manager
    - Join date
    - Status: Active, Inactive, On Leave, Terminated
    - Employee type: Full-time, Part-time, Contract, Intern
    - Probation period
    - Work location
    - Shift timings
  - **Bank Info**
    - Account number, bank name, branch, IBAN
  - **Emergency Contact**
    - Name, phone, relation
  - **Documents**
    - CNIC document upload
    - Profile photo upload
  - **Education & Experience**
    - Education history (JSON array)
    - Experience history (JSON array)

- **Employee Features**
  - Advanced search (name, email, position, employee ID, phone)
  - Filter by department, status, type
  - Sorting (name, department, position, join date, status)
  - Employee profile view
  - Links to payroll, attendance, leave history

#### 6.2 Attendance Management

**Features**:
- **Real-time Attendance Portal**
  - Live clock display
  - Employee list with current status
  - Status indicators (Present, Absent, On Leave, Pending)
  - Quick attendance marking
  - Status selection

- **Attendance Tracking**
  - Check-in/Check-out recording
  - Location tracking (GPS coordinates)
  - Device ID tracking
  - Status: Present, Absent, Leave, Half-day, Late, Overtime
  - Hours calculation
  - Overtime hours
  - Late minutes
  - Grace minutes
  - Suspicious activity detection
  - Manual override capability

- **Attendance Features**
  - Daily attendance view
  - Monthly attendance reports
  - Attendance history
  - Attendance corrections
  - QR code attendance (optional)
  - Shift management
  - Night shift support

#### 6.3 Leave Management

**Features**:
- **Leave Request Management**
  - Create, approve, reject leave requests
  - Leave types: Annual, Sick, Casual, Emergency, Maternity, Paternity, Unpaid, Other
  - Half-day leave support
  - Leave balance checking
  - Proof document upload

- **Leave Details**
  - Leave type
  - Start date, end date
  - Half-day type (first-half, second-half)
  - Days (can be decimal)
  - Reason
  - Proof document
  - Leave balance at time of request
  - Payroll deduction amount
  - Status: Pending, Approved, Rejected, Cancelled
  - Approval workflow
  - Approval/rejection reasons

- **Leave Balance Management**
  - Leave type balances
  - Total allocated
  - Used
  - Pending
  - Available
  - Carry forward
  - Year-wise tracking
  - Accrual rate
  - Max carry forward limits

- **Leave Features**
  - Leave calendar
  - Pending leaves view
  - Leave history
  - Leave balance reports
  - Public holidays integration

#### 6.4 Payroll Management

**Features**:
- **Payroll Processing**
  - Monthly payroll generation
  - Auto-calculation of salaries
  - Payroll approval workflow

- **Payroll Components**
  - Base salary
  - Basic salary
  - Gross salary (Basic + Allowances)
  - Bonus
  - Overtime amount
  - Allowances (total)
  - Deductions (total)
  - Tax amount and percentage
  - EPF amount
  - ETF amount
  - Insurance amount
  - Advance deduction
  - Net pay

- **Payroll Allowances**
  - Housing allowance
  - Transport allowance
  - Medical allowance
  - Food allowance
  - Other allowances

- **Payroll Deductions**
  - Tax
  - EPF
  - ETF
  - Insurance
  - Advance
  - Late deductions
  - Absence deductions
  - Other deductions

- **Payroll Details**
  - Month (YYYY-MM format)
  - Payment method (Cash, Bank Transfer, Cheque, Online)
  - Payment status: Pending, Processed, Paid, Failed
  - Payment date
  - Payslip URL (PDF)
  - Finance linking
  - Journal entry linking
  - Notes

- **Payroll Features**
  - Payroll history
  - Payslip generation
  - Payroll reports
  - Salary history tracking
  - Auto-linking to finance module

#### 6.5 HR Reports

**Features**:
- Employee list reports
- Attendance reports
- Leave reports
- Payroll reports
- Department-wise reports
- Salary history reports

---

### 7. AI Intelligence Module

**Purpose**: AI-powered insights and recommendations

**Features**:
- **Predictive Analytics**
  - Revenue forecasting
  - Occupancy predictions
  - Lease expiry predictions
  - Maintenance predictions

- **Recommendations**
  - Property recommendations
  - Pricing recommendations
  - Tenant matching
  - Deal recommendations

- **Insights**
  - Market trends
  - Performance insights
  - Anomaly detection
  - Risk assessment

- **Chat Interface**
  - AI-powered chat assistant
  - Natural language queries
  - Data insights on demand

---

### 8. Settings Module

**Purpose**: System configuration and preferences

**Features**:
- **User Management**
  - User profiles
  - Password management
  - Preferences

- **Role Management**
  - Create, edit, delete roles
  - Permission assignment
  - Role-based access control
  - Invite link generation

- **System Settings**
  - General settings
  - Email settings
  - Notification settings
  - Theme settings (Light/Dark mode)

- **Department Management**
  - Create, edit departments
  - Department codes
  - Active/Inactive status

---

### 9. Notifications Module

**Purpose**: System-wide notification management

**Features**:
- **Notification Types**
  - Info
  - Warning
  - Error
  - Success

- **Notification Features**
  - Real-time notifications
  - Unread count
  - Mark as read
  - Mark all as read
  - Notification history
  - User-specific notifications

- **Notification Triggers**
  - Payment reminders
  - Lease expiry
  - Maintenance updates
  - Approval requests
  - System alerts

---

### 10. Device Approval Module

**Purpose**: Security and device management

**Features**:
- **Device Approval Workflow**
  - New device detection
  - Device approval requests
  - Admin approval/rejection
  - Device information tracking

- **Device Details**
  - User agent
  - IP address
  - Device ID
  - Request timestamp
  - Approval timestamp
  - Status: Pending, Approved, Rejected

- **Security Features**
  - Device whitelisting
  - Suspicious device detection
  - Device history tracking

---

## User Roles & Permissions

### Role-Based Access Control (RBAC)

The system implements a comprehensive RBAC system with granular permissions.

### Default Roles

#### 1. Admin
- **Permissions**: Full system access (`*`)
- **Capabilities**:
  - All module access
  - User and role management
  - System configuration
  - Device approvals
  - All CRUD operations
  - Report generation
  - Data export

#### 2. HR Manager
- **Permissions**: `hr.view`, `hr.create`, `hr.update`, `hr.delete`
- **Capabilities**:
  - Employee management
  - Attendance management
  - Leave management
  - Payroll management
  - HR reports

#### 3. Dealer
- **Permissions**: `crm.view`, `crm.create`, `crm.update`, `properties.view`
- **Capabilities**:
  - Lead management
  - Client management
  - Deal management
  - Communication logging
  - Property viewing
  - CRM reports

#### 4. Tenant
- **Permissions**: `tenant.view`, `tenant.update`
- **Capabilities**:
  - Tenant portal access
  - View own profile
  - View invoices and payments
  - Submit maintenance requests
  - View lease information
  - Download receipts

#### 5. Accountant
- **Permissions**: `finance.view`, `finance.create`, `finance.update`, `finance.delete`
- **Capabilities**:
  - Transaction management
  - Invoice management
  - Payment management
  - Accounting operations
  - Financial reports
  - Voucher management
  - Journal entries

### Permission Structure

Permissions follow the pattern: `{module}.{action}`

**Available Permissions**:
- `hr.view`, `hr.create`, `hr.update`, `hr.delete`
- `crm.view`, `crm.create`, `crm.update`, `crm.delete`
- `properties.view`, `properties.create`, `properties.update`, `properties.delete`
- `finance.view`, `finance.create`, `finance.update`, `finance.delete`
- `tenant.view`, `tenant.update`
- `*` (All permissions - Admin only)

### Invite System

- Role-based invite links
- Secure token-based registration
- Expiration support
- One-time use links
- Custom messages

---

## Functional Requirements

### FR1: Authentication & Authorization

**FR1.1 User Authentication**
- Users must authenticate using email/username and password
- Passwords must be hashed using bcrypt
- JWT tokens for session management
- Token expiration (configurable, default: 7 days)
- Password reset functionality

**FR1.2 Role-Based Access**
- All API endpoints must check user permissions
- UI components must respect role permissions
- Unauthorized access attempts must be logged

**FR1.3 Device Approval**
- New devices require admin approval
- Device information must be captured
- Approval workflow must be enforced

### FR2: Property Management

**FR2.1 Property Operations**
- Create properties with auto-generated codes
- Update property details
- Soft delete properties
- Search and filter properties
- Property code format: `PROP-YYYYMMDD-XXXX`

**FR2.2 Unit Management**
- Create units linked to properties
- Auto-update unit status based on tenant assignment
- Track unit occupancy
- Calculate occupancy rates

**FR2.3 Property Analytics**
- Real-time property counts
- Occupancy calculations
- Revenue per property
- Expense tracking

### FR3: Tenant Management

**FR3.1 Tenant Operations**
- Create tenants with auto-generated codes
- Link tenants to units (one-to-one)
- Update tenant information
- Soft delete tenants
- Tenant code format: `TENANT-YYYYMMDD-XXXX`

**FR3.2 Lease Management**
- Create and manage leases
- Track lease start/end dates
- Auto-calculate next invoice dates
- Lease expiry notifications
- Renewal tracking

**FR3.3 Tenant Portal**
- Secure tenant login
- Dashboard with tenant information
- Invoice and payment viewing
- Maintenance request submission
- Document access

### FR4: Financial Management

**FR4.1 Transaction Management**
- Create transactions with auto-generated codes
- Transaction code format: `TX-YYYYMMDD-####`
- Debit = Credit validation
- Link transactions to accounts, tenants, properties
- Transaction categorization

**FR4.2 Invoice Management**
- Auto-generate monthly invoices
- Invoice numbering
- Tax and discount calculations
- Overdue detection
- Partial payment tracking

**FR4.3 Payment Management**
- Record payments
- Payment allocation to invoices
- Overpayment handling
- Advance balance management
- Receipt generation

**FR4.4 Accounting**
- Chart of Accounts management
- Journal entries with validation
- Voucher management
- Ledger generation
- Real-time balance calculations

### FR5: CRM Management

**FR5.1 Lead Management**
- Create and manage leads
- Lead scoring and prioritization
- Lead stages tracking
- Convert leads to clients
- Follow-up reminders

**FR5.2 Client Management**
- Client CRUD operations
- Client categorization
- Contact person management
- Deal history tracking

**FR5.3 Deal Management**
- Deal pipeline management
- Stage tracking
- Probability calculations
- Commission calculations
- Approval workflows

### FR6: HR Management

**FR6.1 Employee Management**
- Employee CRUD operations
- Auto-generated employee IDs
- Department assignment
- Manager hierarchy
- Document management

**FR6.2 Attendance Management**
- Real-time attendance tracking
- Check-in/Check-out recording
- Location tracking
- Attendance reports
- Correction requests

**FR6.3 Leave Management**
- Leave request workflow
- Leave balance tracking
- Approval workflow
- Leave calendar
- Public holidays integration

**FR6.4 Payroll Management**
- Monthly payroll generation
- Salary calculations
- Allowance and deduction management
- Payslip generation
- Finance integration

### FR7: Reporting & Analytics

**FR7.1 Dashboard Analytics**
- Real-time KPI cards
- Revenue vs Expenses charts
- Property distribution charts
- Occupancy trends
- Sales funnel visualization

**FR7.2 Module Reports**
- Property reports
- Financial reports
- HR reports
- CRM reports
- Tenant reports

**FR7.3 Export Capabilities**
- PDF report generation
- Excel export
- CSV export
- Custom date ranges

### FR8: Notifications

**FR8.1 Notification System**
- Real-time notifications
- User-specific notifications
- Notification types (Info, Warning, Error, Success)
- Unread count tracking
- Notification history

**FR8.2 Notification Triggers**
- Payment reminders
- Lease expiry
- Maintenance updates
- Approval requests
- System alerts

---

## Technical Specifications

### API Architecture

**RESTful API Design**
- Standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- JSON request/response format
- Consistent error handling
- API versioning support

**API Endpoints Structure**:
```
/api/auth/*          - Authentication endpoints
/api/roles/*         - Role management
/api/properties/*    - Property management
/api/tenants/*       - Tenant management
/api/finance/*       - Financial operations
/api/crm/*           - CRM operations
/api/hr/*            - HR operations
/api/stats/*         - Statistics and analytics
/api/notifications/* - Notifications
/api/device-approval/* - Device management
```

### Database Schema

**Key Models**:
- User, Role, RoleInviteLink
- Property, Block, Floor, Unit
- Tenant, Lease, Tenancy
- Transaction, Invoice, Payment
- Account, JournalEntry, Voucher
- Lead, Client, Dealer, Deal
- Employee, Attendance, LeaveRequest, Payroll
- Communication, CRMActivity
- Notification, DeviceApproval
- FinanceLedger, Attachment, AuditLog

**Database Features**:
- Soft delete support
- Timestamps (createdAt, updatedAt)
- Indexes for performance
- Foreign key constraints
- Unique constraints
- JSON fields for flexible data

### Security Specifications

**Authentication**:
- JWT-based authentication
- Password hashing (bcrypt, 10 rounds)
- Token expiration
- Secure token storage

**Authorization**:
- Role-based access control
- Permission-based authorization
- Middleware-based enforcement
- API-level protection

**Data Security**:
- Input validation (Zod)
- SQL injection prevention (Prisma ORM)
- XSS protection
- CSRF protection
- Secure file uploads
- Data encryption at rest (database level)

**API Security**:
- CORS configuration
- Rate limiting (recommended)
- Request validation
- Error message sanitization

### Performance Requirements

**Response Times**:
- API response time: < 500ms (average)
- Page load time: < 2 seconds
- Dashboard load: < 3 seconds
- Report generation: < 5 seconds

**Scalability**:
- Support 1000+ concurrent users
- Handle 10,000+ properties
- Process 100,000+ transactions
- Support horizontal scaling

**Database Performance**:
- Indexed queries
- Optimized joins
- Query result caching (recommended)
- Pagination for large datasets

### File Storage

**Supported File Types**:
- Images (JPG, PNG, GIF)
- Documents (PDF, DOC, DOCX)
- Spreadsheets (XLS, XLSX)

**Storage Options**:
- Local filesystem (default)
- Cloud storage (S3, Azure Blob, etc.) - recommended for production

**File Management**:
- File size limits
- File type validation
- Secure file uploads
- File deletion on entity deletion

---

## User Interface & Experience

### Design Principles

- **Modern & Clean**: Minimalist design with focus on content
- **Responsive**: Mobile-first approach, works on all devices
- **Accessible**: WCAG 2.1 AA compliance
- **Consistent**: Unified design system
- **Intuitive**: Easy navigation and user flows

### UI Components

**Component Library**: Radix UI + Custom Components

**Key Components**:
- Buttons, Cards, Dialogs, Forms
- Tables, Charts, Badges, Alerts
- Navigation, Sidebar, Header
- Date Pickers, Selects, Inputs
- Toast notifications
- Loading states
- Empty states

### Theme Support

- **Light Mode**: Default theme
- **Dark Mode**: Full dark mode support
- **Theme Toggle**: User preference
- **System Preference**: Auto-detect

### Responsive Design

**Breakpoints**:
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

**Mobile Features**:
- Touch-optimized interactions
- Collapsible navigation
- Mobile-friendly forms
- Responsive tables
- Mobile charts

### User Experience Features

- **Loading States**: Skeleton loaders, spinners
- **Error Handling**: User-friendly error messages
- **Empty States**: Helpful guidance when no data
- **Success Feedback**: Toast notifications
- **Form Validation**: Real-time validation
- **Auto-save**: Draft saving (where applicable)
- **Keyboard Shortcuts**: Power user features
- **Search**: Global and module-specific search
- **Filters**: Advanced filtering options
- **Sorting**: Multi-column sorting
- **Pagination**: Efficient data pagination

---

## Security & Compliance

### Security Measures

**Authentication Security**:
- Strong password requirements (recommended)
- Password hashing (bcrypt)
- JWT token security
- Session management
- Password reset security

**Authorization Security**:
- Role-based access control
- Permission checks on all endpoints
- UI permission enforcement
- Audit logging

**Data Security**:
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Secure file uploads
- Data encryption

**API Security**:
- CORS configuration
- Rate limiting (recommended)
- Request validation
- Error handling

### Audit & Logging

**Audit Logging**:
- User actions logged
- Entity changes tracked
- Login/logout tracking
- Permission changes logged
- Data access logging

**Audit Log Fields**:
- Entity type and ID
- Action performed
- User information
- Timestamp
- IP address
- User agent
- Old and new values
- Change diff

### Compliance

**Data Privacy**:
- User data protection
- GDPR considerations (if applicable)
- Data retention policies
- Right to deletion

**Backup & Recovery**:
- Regular database backups (recommended)
- Backup retention policy
- Disaster recovery plan
- Data recovery procedures

---

## Integration & APIs

### REST API

**Base URL**: `http://localhost:3001/api` (development)

**Authentication**: Bearer token in Authorization header
```
Authorization: Bearer <JWT_TOKEN>
```

**Response Format**:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Format**:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Key API Endpoints

**Authentication**:
- `POST /api/auth/login` - User login
- `POST /api/auth/invite-login` - Invite link login
- `GET /api/auth/me` - Get current user

**Properties**:
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/properties/:id` - Get property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

**Tenants**:
- `GET /api/tenants` - List tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:id` - Get tenant
- `PUT /api/tenants/:id` - Update tenant

**Finance**:
- `GET /api/finance/transactions` - List transactions
- `POST /api/finance/transactions` - Create transaction
- `GET /api/finance/invoices` - List invoices
- `POST /api/finance/invoices` - Create invoice
- `GET /api/finance/payments` - List payments
- `POST /api/finance/payments` - Create payment

**CRM**:
- `GET /api/crm/leads` - List leads
- `POST /api/crm/leads` - Create lead
- `GET /api/crm/clients` - List clients
- `POST /api/crm/clients` - Create client
- `GET /api/crm/deals` - List deals
- `POST /api/crm/deals` - Create deal

**HR**:
- `GET /api/hr/employees` - List employees
- `POST /api/hr/employees` - Create employee
- `GET /api/hr/attendance` - List attendance
- `POST /api/hr/attendance` - Mark attendance
- `GET /api/hr/payroll` - List payroll
- `POST /api/hr/payroll` - Create payroll

**Statistics**:
- `GET /api/stats/properties` - Property statistics
- `GET /api/stats/finance` - Finance statistics
- `GET /api/stats/hr` - HR statistics
- `GET /api/stats/crm` - CRM statistics
- `GET /api/stats/revenue-vs-expense` - Revenue vs expenses

### Third-Party Integrations

**Potential Integrations**:
- Payment gateways (Stripe, PayPal, etc.)
- Email services (SendGrid, AWS SES, etc.)
- SMS services (Twilio, etc.)
- Cloud storage (AWS S3, Azure Blob, etc.)
- Accounting software (QuickBooks, Xero, etc.)
- Document signing (DocuSign, etc.)

---

## Performance Requirements

### Response Time Targets

- **API Endpoints**: < 500ms average response time
- **Page Load**: < 2 seconds initial load
- **Dashboard**: < 3 seconds with all data
- **Reports**: < 5 seconds generation time
- **Search**: < 300ms search results

### Scalability Targets

- **Concurrent Users**: 1000+ simultaneous users
- **Properties**: 10,000+ properties
- **Transactions**: 100,000+ transactions
- **Users**: 10,000+ system users

### Optimization Strategies

- **Database**: Indexed queries, optimized joins
- **Caching**: API response caching (recommended)
- **Pagination**: Efficient data pagination
- **Lazy Loading**: Component and data lazy loading
- **Code Splitting**: Route-based code splitting
- **Image Optimization**: Optimized image delivery

---

## Deployment & Infrastructure

### Development Environment

**Requirements**:
- Node.js 18+
- PostgreSQL 14+
- npm or yarn
- Git

**Setup**:
1. Clone repository
2. Install dependencies (`npm install`)
3. Configure environment variables
4. Run database migrations
5. Seed database (optional)
6. Start development servers

### Production Environment

**Recommended Stack**:
- **Frontend**: Vercel, Netlify, or self-hosted
- **Backend**: AWS EC2, Azure VM, GCP Compute, or self-hosted
- **Database**: AWS RDS, Azure Database, or self-hosted PostgreSQL
- **File Storage**: AWS S3, Azure Blob Storage, or local storage

**Environment Variables**:
```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Server
PORT=3001
NODE_ENV=production
FRONTEND_URL="https://yourdomain.com"

# File Storage (if using cloud)
STORAGE_TYPE="s3" # or "local"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_BUCKET_NAME=""
AWS_REGION=""
```

### Deployment Steps

1. **Build Frontend**:
   ```bash
   npm run build
   ```

2. **Build Backend**:
   ```bash
   cd server
   npm run build
   ```

3. **Database Migration**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Start Services**:
   - Start PostgreSQL
   - Start backend server
   - Deploy frontend

### Monitoring & Maintenance

**Recommended Monitoring**:
- Application performance monitoring (APM)
- Error tracking (Sentry, etc.)
- Database monitoring
- Server resource monitoring
- Uptime monitoring

**Maintenance Tasks**:
- Regular database backups
- Log rotation
- Security updates
- Performance optimization
- Database maintenance

---

## Future Enhancements

### Phase 2 Features

1. **Mobile Applications**
   - iOS app
   - Android app
   - Mobile-optimized features

2. **Advanced Analytics**
   - Predictive analytics
   - Machine learning insights
   - Custom report builder
   - Data visualization enhancements

3. **Communication Enhancements**
   - In-app messaging
   - Email integration
   - SMS integration
   - WhatsApp integration

4. **Document Management**
   - Document templates
   - E-signature integration
   - Document versioning
   - Document search

5. **Workflow Automation**
   - Custom workflows
   - Automated approvals
   - Task automation
   - Scheduled tasks

### Phase 3 Features

1. **Multi-tenancy**
   - Multiple organization support
   - Organization isolation
   - Cross-organization reporting

2. **Advanced Reporting**
   - Custom dashboards
   - Scheduled reports
   - Report sharing
   - Export to multiple formats

3. **Integration Marketplace**
   - Third-party integrations
   - API marketplace
   - Webhook support
   - Integration templates

4. **Advanced Security**
   - Two-factor authentication (2FA)
   - Single sign-on (SSO)
   - Advanced audit logging
   - Security compliance certifications

5. **Internationalization**
   - Multi-language support
   - Currency support
   - Regional compliance
   - Localization

---

## Appendix

### A. Glossary

- **ERP**: Enterprise Resource Planning
- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token
- **CRUD**: Create, Read, Update, Delete
- **KPI**: Key Performance Indicator
- **API**: Application Programming Interface
- **ORM**: Object-Relational Mapping

### B. Code Generation Patterns

- **Property Code**: `PROP-YYYYMMDD-XXXX` (e.g., PROP-20250115-0001)
- **Tenant Code**: `TENANT-YYYYMMDD-XXXX` (e.g., TENANT-20250115-0001)
- **Transaction Code**: `TX-YYYYMMDD-####` (e.g., TX-20250115-0001)
- **Employee ID**: Auto-generated based on department/sequence

### C. Default Credentials

**Development Environment**:
- Email: `admin@realestate.com`
- Password: `admin123`

**Note**: Change default credentials in production!

### D. Support & Documentation

- **API Documentation**: Available at `/api/docs` (if implemented)
- **User Guide**: Available in application help section
- **Developer Documentation**: Code comments and README files

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | January 2025 | Development Team | Initial product specification document |

---

**End of Document**

