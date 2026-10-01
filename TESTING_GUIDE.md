# ThinkMTB Order System - Testing Guide

**Deployment Date:** September 23, 2026  
**Latest Update:** Admin Interface Consolidation - /cmsadmin removed, all functionality in /platform-admin/dashboard  
**Server:** Production (74.208.132.71)  
**Status:** ✅ Live and Fully Deployed

---

## 🎯 Quick Access URLs

### ✅ SINGLE DOMAIN - All services use custom.cmssportswear.us

#### Platform Admin Dashboard (NEW)
```
https://custom.cmssportswear.us/platform-admin
```
- **Login URL:** `https://custom.cmssportswear.us/platform-admin/login`
- **Email:** `admin@regusa.com`
- **Password:** `Password123!` ⚠️ (DO NOT CHANGE)
- **Features:**
  - 👥 Teams Management - Create and manage all tenants/teams
  - 📦 Catalog Management - Manage products, designs, and associations
  - 📋 Orders Management - Create and view orders on behalf of teams
  - 📊 Breakdown Analysis - View detailed analytics by product/status/user
  - 👤 Per-Person Analysis - Team member totals and contribution tracking
  - 💳 Payments Management - Track and manage submitted payments
  - 💰 Pricing Manager - Manage pricing tiers across all teams
- **Dashboard URL:** `https://custom.cmssportswear.us/platform-admin/dashboard`

#### Legacy Admin Interface (REMOVED ❌)
```
https://custom.cmssportswear.us/cmsadmin - NO LONGER AVAILABLE
```
- **Status:** Removed as of consolidation phase
- **Migration:** All functionality now in Platform Admin Dashboard
- **API Access:** Legacy `/api/platform-admin/*` endpoints remain for backwards compatibility only

#### Customer Landing Portal
```
https://custom.cmssportswear.us/
```
- Join form to enter team portals
- Features overview

#### Team Portal Access
```
https://custom.cmssportswear.us/custom/[teamname]/unlock
```
- **Example:** `https://custom.cmssportswear.us/custom/thinkmtb/unlock`
- **Team Password:** `thinkmtb2024`

#### Team Login (After Password Verification)
```
https://custom.cmssportswear.us/custom/[teamname]/login
```
- **Example:** `https://custom.cmssportswear.us/custom/thinkmtb/login`
- User login after team password is verified

#### Password Reset
```
https://custom.cmssportswear.us/custom/[teamname]/forgot-password
```

---

## 🧪 Testing Scenarios

### Test 1: Landing Page
**Purpose:** Verify customer portal is accessible

```bash
# Visit the landing page
https://custom.cmssportswear.us/

# Expected behavior:
# - Welcome message for CMS Sports Wear Custom Designs
# - Feature highlights displayed
# - Team name input form visible
```

---

### Test 2: Team Portal Access
**Purpose:** Test team password gate

```bash
# Step 1: From landing page, enter team name
https://custom.cmssportswear.us/
Team: thinkmtb
Click "Enter Portal"

# Step 2: On unlock page, enter team password
https://custom.cmssportswear.us/custom/thinkmtb/unlock
Team Password: thinkmtb2024

# Expected behavior:
# - Form accepts password
# - Redirects to login page on success
# - Session cookie set
```

---

### Test 3: Team Login
**Purpose:** Test user authentication after team gate

```bash
# Step 1: Direct access to login (after password verified)
https://custom.cmssportswear.us/custom/thinkmtb/login

# Step 2: Enter user credentials
User Email: (test user account)
Password: (user password)

# Expected behavior:
# - Login form displays with team branding
# - Credentials validated
# - Redirects to user dashboard
# - Session cookie set (user_token)
```

---

### Test 4a: Platform Admin Dashboard - Login
**Purpose:** Access global admin dashboard for multi-tenant management

```bash
# Step 1: Navigate to platform admin login
https://custom.cmssportswear.us/platform-admin/login

# Step 2: Enter credentials
Email: admin@regusa.com
Password: Password123!

# Step 3: Verify redirect
# Auto-redirects to /platform-admin/dashboard

# Expected behavior:
# - Login form displays with clean UI
# - Credentials accepted
# - Redirects to dashboard after login
# - Session cookie set (platform_admin_token)
```

### Test 4b: Platform Admin Dashboard - Teams Tab
**Purpose:** Test global tenant/team management

```bash
# Prerequisites: Login to platform admin (Test 4a)

# Step 1: Click Teams tab on dashboard
https://custom.cmssportswear.us/platform-admin/dashboard

# Expected UI:
# - Summary cards: Total Teams, Active, Suspended
# - List of all teams with columns: Name, Slug, Status, Created Date
# - "+ Create New Team" button
# - Search and filter options

# Step 2: View team details
# - Each team shows: ID, name, slug, status, admin email, created date
# - Click team to view more details

# Expected behavior:
# - All teams from database display
# - Status indicators show team state
# - Create button opens modal for new team
```

### Test 4c: Platform Admin Dashboard - Orders Tab
**Purpose:** Test global order management across all teams

```bash
# Prerequisites: Login to platform admin (Test 4a)

# Step 1: Click Orders tab
# Expected UI:
# - Team selector dropdown ("All Teams" default)
# - Status filter dropdown (All/Draft/Submitted/Completed)
# - Search by team member name or order number
# - Order table with: Order #, Team Member, Team, Items, Status, Date
# - "+ Create Order" button

# Step 2: Select a team from dropdown
# - Table filters to show only that team's orders

# Step 3: Create order on behalf of team
# - Click "+ Create Order"
# - Modal opens with fields:
#   * Team (auto-filled with selected team)
#   * Team Member Name
#   * Team Member Email
#   * Items section (expandable)
# - Fill in sample data
# - Click "Create Order"

# Expected behavior:
# - Order created in draft status
# - Success message displayed
# - New order appears in table
# - Order can be edited/viewed
```

### Test 4d: Platform Admin Dashboard - Breakdown Tab
**Purpose:** Test detailed analytics across all orders

```bash
# Prerequisites: Login to platform admin (Test 4a)

# Step 1: Click Breakdown tab
# Expected UI:
# - Team selector dropdown
# - Sub-tabs: Product, Design, Size, Fit, User
# - Summary cards: Total Orders, Total Items, Exchange Rate (CRC/USD)

# Step 2: View Product breakdown
# - Table columns: Product Type, Order Count, Total Quantity, % of Total
# - Shows aggregate data across all orders

# Step 3: View Design breakdown
# - Table columns: Design, Order Count, Total Quantity, % of Total

# Step 4: View Size breakdown
# - Table columns: Size, Order Count, Total Quantity, % of Total

# Step 5: View Fit breakdown
# - Table columns: Fit Option, Order Count, Total Quantity

# Step 6: View User breakdown
# - Table columns: Team Member, Team, Orders, Total Items, % of Total

# Step 7: Select specific team
# - Breakdown updates to show only that team's data

# Expected behavior:
# - All breakdowns load data from database
# - Numbers are accurate and consistent
# - Team filter works on all tabs
# - Exchange rate displays correctly
```

### Test 4e: Platform Admin Dashboard - Per-Person Tab
**Purpose:** Test per-team-member analysis and totals

```bash
# Prerequisites: Login to platform admin (Test 4a)

# Step 1: Click Per-Person tab
# Expected UI:
# - Team selector dropdown
# - Stats cards: Total Team Members, Total Orders, Total Items
# - Search by name or email
# - Table with columns: Name, Email, Team, Orders, Items, Products

# Step 2: View all team members
# - See list of all people who have placed orders
# - View their order count and item totals
# - See products they ordered

# Step 3: Search for specific person
# - Enter name or email in search box
# - Table filters to matching results

# Step 4: Select specific team
# - Team filter limits to that team's members only

# Expected behavior:
# - Accurate totals per team member
# - Search works on name and email
# - Team filter works correctly
# - Product list shows what each person ordered
```

### Test 4f: Platform Admin Dashboard - Pricing Tab
**Purpose:** Test pricing manager integration

```bash
# Prerequisites: Login to platform admin (Test 4a)

# Step 1: Click Pricing tab
# Expected UI:
# - Team selector dropdown
# - Pricing tier list with columns: Product, Quantity Range, Price (USD/CRC)
# - "+ Add Pricing Tier" button

# Step 2: View pricing tiers
# - See all tiers for selected team
# - View quantity breakpoints and corresponding prices

# Step 3: Select different team
# - Pricing tiers update for that team
# - Can see team-specific overrides

# Expected behavior:
# - Pricing data loads correctly
# - Team filter switches pricing context
# - UI shows USD and CRC amountsboard
**Purpose:** Test admin access via single domain
---

### Test 4d: Platform Admin Dashboard - Catalog Tab (NEW)
**Purpose:** Test catalog management with products, designs, and associations

```bash
# Prerequisites: Login to platform admin (Test 4a)

# Step 1: Click Catalog tab
# Expected UI:
# - Tabs: Products, Designs, Associations
# - Each tab manages its own resources

# Step 2: Products tab
# - View all products
# - Add new product
# - Edit product details
# - Delete products

# Step 3: Designs tab
# - View all designs
# - Create new design
# - Manage design assets
# - Delete designs

# Step 4: Associations tab
# - Link products to designs
# - View product-design combinations
# - Manage associations
```

---

### Test 4e: Platform Admin Dashboard - Payments Tab (NEW)
**Purpose:** Test payment management and tracking

```bash
# Prerequisites: Login to platform admin (Test 4a)

# Step 1: Click Payments tab
# Expected UI:
# - Filter buttons: All, Pending, Confirmed, Rejected
# - Payment list showing: User, Order #, Status, Amount, Method

# Step 2: View payment details
# - Click on payment to see full details
# - View payment reference and notes
# - View admin notes section

# Step 3: Manage payments
# - Update payment status
# - Add admin notes
# - Confirm or reject payments
```

---

### Test 4f: Platform Admin Dashboard - Order Details (ENHANCED)
**Purpose:** Test order details viewing and management

```bash
# Prerequisites: Login to platform admin, navigate to Orders tab

# Step 1: Click "View" button on an order
# Expected UI:
# - Modal opens showing order details
# - Order number, status, user, date displayed
# - Full list of items in order
# - Product, quantity, and price for each item

# Step 2: Close modal
# - Click X or click outside modal
# - Returns to orders list
```

---

### Test 5: Platform Admin APIs (Preferred over legacy /api/cmsadmin)

#### Get Platform Admin Orders
```bash
curl -H "Cookie: platform_admin_token=<TOKEN>" \
  https://custom.cmssportswear.us/api/platform-admin/orders

# Expected response:
{
  "orders": [
    {
      "id": "uuid",
      "order_number": "ORDER-123",
      "user_id": "user-id",
      "tenant_id": "tenant-id",
      "status": "submitted",
      "item_count": 5,
      "created_at": "2026-10-01T..."
    }
  ]
}
```

#### Get Platform Admin Breakdown
```bash
curl -H "Cookie: platform_admin_token=<TOKEN>" \
  https://custom.cmssportswear.us/api/platform-admin/breakdown?type=product

# Expected response:
{
  "byProduct": [
    {
      "product_type": "Jersey",
      "orders": 5,
      "items": 12
    }
  ]
}
```

#### Get Platform Admin Per-Person
```bash
curl -H "Cookie: platform_admin_token=<TOKEN>" \
  https://custom.cmssportswear.us/api/platform-admin/per-person

# Expected response:
{
  "stats": [
    {
      "user_id": "user-123",
      "order_count": 2,
      "total_items": 8
    }
  ]
}
```

---

### Test 5b: Legacy Admin API Endpoints (DEPRECATED)

**Note:** The following endpoints remain for backwards compatibility but should not be used for new development.

#### Get Admin Summary (Legacy)
```bash
curl https://custom.cmssportswear.us/api/cmsadmin/summary

# This endpoint is deprecated. Use /api/platform-admin/* instead.
```

#### Get Subdomain Redirects (Legacy)
```bash
curl https://custom.cmssportswear.us/api/cmsadmin/subdomain-redirects

# This endpoint is deprecated.
```

---

### Test 6: Phase 1 - Design Request Submission
**Purpose:** Test complete design request workflow

```bash
# Step 1: Login as team user
https://custom.cmssportswear.us/custom/thinkmtb/login
Email: demo@cmssportswear.us
Password: Demo123!

# Step 2: Navigate to design request step
https://custom.cmssportswear.us/custom/thinkmtb/order/design

# Step 3: Submit design request
- Title: "2026 Team Jerseys"
- Description: "Custom design with team logo and colors"
- Upload files: Select 1-2 image files (PNG/JPG)
- Click "Submit Design Request"

# Expected behavior:
# - Success message displayed
# - Request appears in design requests list
# - Status shows "pending"
# - Files are attached
# - Redirect to request detail view
```

---

### Test 7: Phase 2 - Product Selection
**Purpose:** Test product selection with dynamic pricing

```bash
# Prerequisites: Complete Test 6 first, design must be approved

# Step 1: After design is approved, navigate to products
https://custom.cmssportswear.us/custom/thinkmtb/order/products

# Step 2: Select products
- Choose 1+ products from list (e.g., "Jersey", "Shorts")
- Enter quantity for each product
- Watch prices update in real-time based on quantity
- Verify pricing tiers display correctly

# Step 3: Review order summary
- Check subtotal calculation
- Verify USD and CRC amounts
- Review exchange rate (typically 500 CRC/USD)
- Optional: Add notes to order

# Step 4: Submit order
- Click "Create Order"

# Expected behavior:
# - Success message: "Order created successfully"
# - Order status set to 'draft_products_selected'
# - Automatic redirect to payment page
# - Order ID generated
```

---

### Test 8: Phase 3 - Payment & Order Review
**Purpose:** Test payment request workflow

```bash
# Prerequisites: Complete Test 7 first

# Step 1: On payment review page (automatic redirect from Test 7)
https://custom.cmssportswear.us/custom/thinkmtb/order/payment/[ORDER_ID]

# Step 2: Review order details
- Verify order number displays
- Check all selected items in table
- Confirm quantities and prices
- Verify subtotal = sum of items

# Step 3: Review payment information
- 50% Deposit Due: Shows USD and CRC amounts
- Final Payment: Shows remaining 50%
- Timeline shows 5-step process

# Step 4: Request payment link
- Click "Request Payment Link" button
- Confirm in dialog
- Success message: "Payment request created!"

# Expected behavior:
# - Payment record created with status='requested'
# - Order status changes to 'payment_requested'
# - UI shows payment status pending
# - Admin receives notification (next phase)
# - Page displays FAQ and support info
```

---

### Test 9: End-to-End Workflow (All 3 Phases)
**Purpose:** Test complete customer journey from design to payment

```bash
# Complete flow:
# 1. Login → Test 6 (Design) → Design gets approved (admin action)
# 2. Navigate to products → Test 7 (Products) → Create order
# 3. Auto-redirect → Test 8 (Payment) → Request payment

# API Endpoints tested:
POST /api/designs/requests                    # Submit design
GET  /api/designs/requests                    # List designs
GET  /api/designs/requests/[id]               # Get design details
POST /api/designs/requests/[id]/files         # Upload files
POST /api/designs/requests/[id]/submissions   # Submit to designers
PATCH /api/designs/requests/[id]/submissions/[subId]  # Approve submission

GET  /api/team/products                       # List products
POST /api/team/products/calculate-price       # Calculate pricing
POST /api/orders/create-with-products         # Create order

GET  /api/orders/[id]/payment                 # Get order & payment info
POST /api/orders/[id]/payment                 # Request payment link

# Database tables used:
# - design_requests
# - design_request_files
# - design_submissions
# - design_submission_files
# - design_comments
# - team_products
# - orders
# - order_items
# - order_payments
# - pricing_tiers
# - price_overrides
```

---

## �️ Database Configuration

### Current Setup
- **Type:** SQLite with better-sqlite3
- **Location:** `/opt/thinkmtb-order/data/orders.db`
- **Mode:** WAL (Write-Ahead Logging)
- **Constraints:** Foreign keys enabled

### Migration to PostgreSQL (Optional)
If migrating to PostgreSQL for better concurrent access:

```bash
# On server, install PostgreSQL
ssh cmssportswear "sudo apt-get install postgresql postgresql-contrib"

# Create database and user
ssh cmssportswear "sudo -u postgres psql << EOF
CREATE DATABASE thinkmtb_order;
CREATE USER thinkmtb WITH PASSWORD '[SECURE_PASSWORD]';
ALTER ROLE thinkmtb SET client_encoding TO 'utf8';
ALTER ROLE thinkmtb SET default_transaction_isolation TO 'read committed';
ALTER ROLE thinkmtb SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE thinkmtb_order TO thinkmtb;
EOF"

# Update .env to use PostgreSQL:
# DATABASE_URL=postgresql://thinkmtb:[PASSWORD]@localhost:5432/thinkmtb_order

# Migrate SQLite data to PostgreSQL (requires custom migration script)
# Then deploy and restart application
```

---

## �📊 System Architecture - Unified Domain Structure

### ✨ Single Certificate Consolidation
**Previous system:**
- ❌ Multiple subdomains: thinkmtb.cmssportswear.us, cmsadmin.cmssportswear.us, custom.cmssportswear.us
- ❌ Multiple SSL certificates required
- ❌ Complex DNS management

**New system:**
- ✅ Single domain: custom.cmssportswear.us
- ✅ One SSL certificate (expires 2026-12-22)
- ✅ Path-based routing for all services:
  - `/` - Customer landing
  - `/custom/[teamname]/*` - Team portals
  - `/platform-admin/*` - Admin management

### 🔧 Routing Structure
```
custom.cmssportswear.us/
├── /                          → Customer landing page
├── /custom/[teamname]/
│   ├── /unlock                → Team password gate
│   ├── /login                 → Team user login
│   ├── /register              → User registration
│   ├── /forgot-password       → Password reset request
│   └── /reset-password        → Complete password reset
├── /cmsadmin/                 → REMOVED - use /platform-admin
├── /cmsadmin/api/*            → Legacy APIs (deprecated)
├── /platform-admin/           → Platform admin dashboard
├── /platform-admin/login      → Platform admin login
├── /platform-admin/dashboard  → Main dashboard (7 tabs)
└── /api/platform-admin/*      → Platform admin APIs
```

### 🔐 Security Features
- Single SSL certificate for entire domain
- Team password protection for portals
- Admin login gate
- Session-based access control
- Path-based routing eliminates DNS/cert complexity

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot find team" when accessing team portal
**Cause:** Team password gate not verifying correctly  
**Solution:** 
1. Verify team exists in database
2. Check team password is exact match (case-sensitive)
3. Ensure cookie is set after password verification

### Issue: Admin area not loading
**Cause:** Not authenticated or session expired  
**Solution:** 
1. Navigate to `https://custom.cmssportswear.us/platform-admin/login`
2. Login with `admin@regusa.com` / `Password123!`
3. Check password hasn't been changed

### Issue: SSL certificate warnings
**Cause:** Browser cache or incomplete redirect  
**Solution:** 
1. Use https:// explicitly
2. Clear browser cache
3. Try incognito/private window
4. Certificate covers *.cmssportswear.us and custom.cmssportswear.us

---

## 📝 Testing Credentials Reference

| Component | Email/User | Password | URL | Notes |
|-----------|----------|----------|-----|-------|
| **Platform Admin** | `admin@regusa.com` | `Password123!` | https://custom.cmssportswear.us/platform-admin/login | ⚠️ Global admin - DO NOT CHANGE |
| **Team Admin Portal** | N/A | N/A | https://custom.cmssportswear.us/cmsadmin | ❌ REMOVED - Use Platform Admin |
| **Team Portal (thinkmtb)** | - | `thinkmtb2024` | https://custom.cmssportswear.us/custom/thinkmtb/unlock | Team password gate |
| **Demo User** | `demo@cmssportswear.us` | `Demo123!` | https://custom.cmssportswear.us/custom/thinkmtb/login | Test user in thinkmtb team |
| **Database** | N/A | N/A | PostgreSQL on server | Production database |
| **SSH Server** | root | N/A | `ssh cmssportswear` | SSH key auth only |

---

## 🚀 Deployment Commands

### Check Application Status
```bash
ssh cmssportswear "pm2 status"
```

### View Application Logs
```bash
ssh cmssportswear "pm2 logs thinkmtb-order --lines 50"
```

### Restart Application
```bash
ssh cmssportswear "pm2 restart thinkmtb-order"
```

### Deploy Latest Changes
```bash
ssh cmssportswear "cd /opt/thinkmtb-order && \
git pull origin main && \
npm run build && \
pm2 restart thinkmtb-order"
```

### Check Nginx for Domain
```bash
ssh cmssportswear "sudo cat /etc/nginx/sites-available/custom.cmssportswear.us | head -20"
```

---

## ✅ Deployment Verification Checklist

- [x] Single domain routing configured
- [x] SSL certificate for custom.cmssportswear.us installed
- [x] Path-based routing working (no subdomains required)
- [x] Platform admin portal at /platform-admin
- [x] Platform admin API at /api/platform-admin/*
- [x] Legacy /api/cmsadmin/* endpoints (deprecated but functional)
- [x] Customer landing at /
- [x] Team portals at /custom/[teamname]/*
- [x] Nginx reverse proxy configured
- [x] Application builds successfully
- [x] All routes tested
- [x] Legacy /cmsadmin interface removed (Sept 30, 2026)

---

## �️ Server Access & Setup

### Server Details
- **IP Address:** 74.208.132.71
- **SSH Alias:** `cmssportswear`
- **SSH Config:** Add to `~/.ssh/config`:
  ```
  Host cmssportswear
    HostName 74.208.132.71
    User root
    IdentityFile ~/.ssh/id_rsa
  ```
- **OS:** Ubuntu Linux
- **Domain:** custom.cmssportswear.us
- **SSL Certificate:** Expires 2026-12-22

### Application Locations
- **App Directory:** `/opt/thinkmtb-order`
- **Database Type:** PostgreSQL 14+
- **Database Name:** `thinkmtb_order`
- **DB User:** `thinkmtb`
- **DB Password:** `postgres123` (in ecosystem.config.js)
- **Process Manager:** PM2
- **Reverse Proxy:** Nginx

### Environment Variables (in ecosystem.config.js)
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://thinkmtb:postgres123@localhost:5432/thinkmtb_order
DB_TYPE=postgresql
ADMIN_PASSWORD=Password123!
PLATFORM_ADMIN_EMAIL=admin@regusa.com
PLATFORM_ADMIN_PASSWORD=Password123!
```

### GitHub Repository
- **Repo:** https://github.com/allen506/thinkmtb-order
- **Branch:** main (production)
- **Clone:** `git clone https://github.com/allen506/thinkmtb-order.git`

## 📞 Support & Troubleshooting

**Server Details:**
- **IP:** 74.208.132.71
- **SSH Alias:** `cmssportswear`
- **App Directory:** `/opt/thinkmtb-order`
- **Database:** PostgreSQL at localhost:5432
- **Domain:** custom.cmssportswear.us

**Quick Debug Commands:**
```bash
# SSH to server
ssh cmssportswear

# Check app status
pm2 status

# View application logs (last 50 lines)
pm2 logs thinkmtb-order --lines 50

# Restart application
pm2 restart thinkmtb-order

# Deploy latest from GitHub
cd /opt/thinkmtb-order && git pull origin main && npm run build && pm2 restart thinkmtb-order

# Check if app is listening locally
curl -s http://localhost:3000/

# Check Nginx config
sudo nginx -t

# View Nginx access logs
tail -f /var/log/nginx/custom-cmssportswear-access.log

# View PostgreSQL database
sudo -u postgres psql -d thinkmtb_order -c "SELECT COUNT(*) as total_orders FROM orders;"

# Check PM2 logs for errors
pm2 logs thinkmtb-order --nostream | grep -i error
```

---

## 📋 Test Execution Checklist

### Pre-Testing Setup
- [ ] Application deployed to production (PM2 running)
- [ ] Database initialized with schema migrations (PostgreSQL)
- [ ] Admin credentials verified (admin@regusa.com / Password123!)
- [ ] Platform admin login working at /platform-admin/login
- [ ] Demo user exists (demo@cmssportswear.us / Demo123!)
- [ ] Team password set (thinkmtb2024)
- [ ] Design files available for upload (JPG/PNG images)
- [ ] SSH access configured to cmssportswear
- [ ] GitHub repo cloned locally for development

### Test Execution Order
1. [ ] Test 1: Landing Page
2. [ ] Test 2: Team Portal Access
3. [ ] Test 3: Team Login
4. [ ] Test 4a: Platform Admin Login
5. [ ] Test 4b: Platform Admin - Teams Tab
6. [ ] Test 4c: Platform Admin - Orders Tab
7. [ ] Test 4d: Platform Admin - Catalog Tab (NEW)
8. [ ] Test 4e: Platform Admin - Breakdown Tab
9. [ ] Test 4f: Platform Admin - Per-Person Tab
10. [ ] Test 4g: Platform Admin - Payments Tab (NEW)
11. [ ] Test 4h: Platform Admin - Order Details (ENHANCED)
12. [ ] Test 4i: Platform Admin - Pricing Tab
13. [ ] Test 5: Platform Admin APIs
14. [ ] Test 6: Phase 1 - Design Request
15. [ ] Test 7: Phase 2 - Product Selection
16. [ ] Test 8: Phase 3 - Payment Review
17. [ ] Test 9: End-to-End Workflow

### Post-Testing Verification
- [ ] All API endpoints returning expected responses
- [ ] Database records created successfully
- [ ] No TypeScript/JavaScript errors in console
- [ ] No 500 errors in PM2 logs
- [ ] Page redirects working correctly
- [ ] Session cookies persisting across requests
- [ ] Payment request status changes correctly

---

**Last Updated:** October 1, 2026  
**Status:** 🟢 Platform Admin Dashboard Complete - Phase 1-3 Testing Ready  
**Database:** PostgreSQL 14+ (Production)  
**Latest Feature:** Global Multi-Tenant Admin Dashboard with 5 tabs

