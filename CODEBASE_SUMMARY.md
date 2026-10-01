# ThinkMTB Order System - Codebase Summary

## 1. API ENDPOINTS REFERENCE

### Admin APIs (`/api/admin/*`)
These require admin session authentication via `requireAdminSession()`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/admin/session` | DELETE | Logout admin session |
| `/api/admin/verify-password` | POST | Verify admin password for authentication |
| `/api/admin/change-password` | POST | Change admin password |
| `/api/admin/summary` | GET | Dashboard summary (orders, items, revenue by product) |
| `/api/admin/products` | GET, POST | List/create product types |
| `/api/admin/products/[id]` | GET, PATCH, DELETE | Get/update/delete specific product |
| `/api/admin/designs` | GET, POST | List/create designs |
| `/api/admin/designs/[id]` | GET, PATCH, DELETE | Get/update/delete specific design |
| `/api/admin/product-designs` | GET, POST | Manage product-design associations |
| `/api/admin/product-designs/[id]` | DELETE | Remove product-design association |
| `/api/admin/pricing-tiers` | GET, POST | List/create pricing tiers |
| `/api/admin/pricing-tiers/[id]` | PATCH, DELETE | Update/delete pricing tier |
| `/api/admin/payment-settings` | GET, PATCH | Get/update payment method details (Zelle, Venmo, PayPal) |
| `/api/admin/smtp-settings` | GET, POST | Configure SMTP email settings |
| `/api/admin/test-smtp` | POST | Send test email |
| `/api/admin/admin-emails` | GET, POST | List/add admin notification emails |
| `/api/admin/admin-emails/[id]` | DELETE | Remove admin email |
| `/api/admin/subdomain-redirects` | GET, POST, DELETE | Manage subdomain routing |

### Platform Admin APIs (`/api/platform-admin/*`)
Multi-tenancy management (highest level)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/platform-admin/login` | POST | Login as platform admin |
| `/api/platform-admin/logout` | POST | Logout platform admin |
| `/api/platform-admin/tenants` | GET, POST | List/create tenants |

### Order APIs (`/api/orders/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/orders` | GET, POST | List/create orders |
| `/api/orders/[id]` | GET, PATCH, DELETE | Get/update/delete order |
| `/api/orders/[id]/payment` | GET, POST | Get/add payment to order |
| `/api/orders/items/[itemId]` | GET, PATCH, DELETE | Manage order items |
| `/api/orders/search` | GET | Search orders |
| `/api/orders/status` | GET, POST | Get/update order statuses |
| `/api/orders/team-quantities` | GET | Get total quantities by team |
| `/api/orders/user-totals` | GET | Get totals by user |
| `/api/orders/new-campaign` | POST | Create new campaign |
| `/api/orders/create-with-products` | POST | Create order with product details |

### Payment APIs (`/api/payments/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payments` | GET, POST | List/create payments |
| `/api/payments/[id]` | PATCH, DELETE | Update/delete payment record |

### Design APIs (`/api/designs/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/designs/requests` | GET, POST | List/create design requests |
| `/api/designs/requests/[id]` | GET, PATCH | Get/update design request |
| `/api/designs/requests/[id]/files` | GET, POST | Upload/download design files |
| `/api/designs/requests/[id]/submissions` | GET, POST | Get/create design submissions |
| `/api/designs/requests/[id]/submissions/[submissionId]` | GET, PATCH | Get/update submission |
| `/api/designs/requests/[id]/comments` | GET, POST | Comments on design requests |
| `/api/designs/[id]/image` | GET | Get design image |

### Team/Tenant APIs (`/api/team/*`, `/api/tenant/*`)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/team/products` | GET | Get products available to team with pricing |
| `/api/team/products/calculate-price` | POST | Calculate price for product + quantity |
| `/api/tenant/auth/login` | POST | Team member login |
| `/api/tenant/auth/register` | POST | Team member registration |
| `/api/tenant/verify-password` | POST | Verify team password |
| `/api/tenant/request-password-reset` | POST | Request password reset |

### Utility APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/catalog` | GET | Get product catalog |
| `/api/exchange-rate` | GET | Get live CRC/USD exchange rate |
| `/api/app-settings` | GET, PATCH | System settings (ordering_active, club_name, payment methods) |
| `/api/subdomain/resolve` | GET | Resolve subdomain to tenant |
| `/api/user/profile` | GET, POST | User profile management |
| `/api/archived-campaigns` | GET | List archived campaigns |
| `/api/final-designs` | GET, POST | Final design management |
| `/api/final-designs/[id]` | PATCH, DELETE | Update/delete final design |

---

## 2. DATABASE SCHEMA

### Core Tables

#### **tenants**
Multi-tenant support - each organization is a separate tenant
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
slug TEXT NOT NULL UNIQUE
admin_email TEXT NOT NULL
status TEXT DEFAULT 'active' (active|suspended)
theme_color TEXT
logo_url TEXT
created_at TEXT
```

#### **product_types**
Available products for customization
```sql
id TEXT PRIMARY KEY (e.g., "pro-jersey", "enduro-short", "wind-vest")
name TEXT NOT NULL
description TEXT
category TEXT NOT NULL
example_url TEXT
active INTEGER DEFAULT 1
sort_order INTEGER DEFAULT 0
tenant_id TEXT (FK to tenants)
fit_options TEXT DEFAULT '["unisex"]'
created_at TEXT
```

#### **designs**
Available design/artwork options
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
description TEXT
image_url TEXT
active INTEGER DEFAULT 1
sort_order INTEGER DEFAULT 0
tenant_id TEXT (FK to tenants)
created_at TEXT
```

#### **orders**
Customer orders
```sql
id TEXT PRIMARY KEY
user_name TEXT NOT NULL
status TEXT DEFAULT 'pending' (pending|confirmed|shipped|cancelled)
notes TEXT
order_number TEXT
tenant_id TEXT (FK to tenants)
created_at TEXT
updated_at TEXT
```

#### **order_items**
Individual items within orders
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
order_id TEXT (FK to orders)
product_type_id TEXT (FK to product_types)
design_id TEXT (FK to designs)
size_id TEXT (FK to sizes)
quantity INTEGER
unit_price_crc REAL
unit_price_usd REAL
sleeve_length TEXT (for shirts with sleeve options)
fit TEXT (unisex|women|men)
tenant_id TEXT (FK to tenants)
```

#### **pricing_tiers**
Tiered pricing by quantity
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
product_type_id TEXT (FK to product_types)
min_qty INTEGER
max_qty INTEGER
price_crc REAL (Costa Rican Colón)
price_usd REAL (US Dollar)
tenant_id TEXT (FK to tenants)
```

#### **sizes**
Available sizes
```sql
id TEXT PRIMARY KEY
name TEXT NOT NULL
sort_order INTEGER DEFAULT 0
```

#### **payments**
Payment records for orders
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
order_id TEXT (FK to orders)
user_name TEXT NOT NULL
amount_usd REAL
amount_crc REAL
method TEXT (zelle|venmo|paypal|cash)
reference TEXT
status TEXT DEFAULT 'pending' (pending|confirmed|failed)
admin_notes TEXT
created_at TEXT
updated_at TEXT
```

### Admin/Configuration Tables

#### **pricing_tiers**
Can also store custom per-team pricing via team_id field

#### **price_overrides**
Custom pricing for specific teams
```sql
id INTEGER PRIMARY KEY
product_type_id TEXT (FK to product_types)
team_id TEXT
price_crc REAL
price_usd REAL
expires_at TEXT (NULL = never expires)
tenant_id TEXT (FK to tenants)
```

#### **team_products**
Products available to specific teams (permissioning)
```sql
id INTEGER PRIMARY KEY
product_type_id TEXT (FK to product_types)
team_id TEXT
tenant_id TEXT (FK to tenants)
```

#### **app_settings**
Global system settings
```sql
key TEXT PRIMARY KEY
value TEXT NOT NULL
updated_at TEXT
```

Example keys: `ordering_active`, `admin_password`, `club_name`, `payment_zelle`, `payment_venmo`, `payment_paypal`

#### **admin_emails**
Email addresses that receive order notifications
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
email TEXT NOT NULL
tenant_id TEXT (FK to tenants)
created_at TEXT
UNIQUE(email, tenant_id)
```

#### **smtp_settings**
Email configuration
```sql
id INTEGER PRIMARY KEY (1)
host TEXT NOT NULL
port INTEGER NOT NULL
secure INTEGER DEFAULT 1
username TEXT
password TEXT
from_email TEXT
updated_at TEXT
```

#### **archived_campaigns**
Historical campaign data
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
campaign_name TEXT
campaign_number INTEGER
archived_at TEXT
orders_snapshot TEXT (JSON)
summary_snapshot TEXT (JSON)
total_orders INTEGER
total_items INTEGER
total_revenue_usd REAL
delete_at TEXT
tenant_id TEXT (FK to tenants)
created_at TEXT
```

#### **admin_sessions**
Active admin login sessions
```sql
token TEXT PRIMARY KEY
created_at TEXT
expires_at TEXT
```

#### **subdomain_redirects**
URL routing for subdomains
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
subdomain TEXT NOT NULL UNIQUE
redirect_url TEXT
is_team_portal INTEGER DEFAULT 0
team_password TEXT (for password-protected subdomains)
tenant_id TEXT (FK to tenants)
created_at TEXT
updated_at TEXT
```

### Design Workflow Tables

#### **design_requests**
```sql
id TEXT PRIMARY KEY
tenant_id TEXT (FK to tenants)
requester_name TEXT
description TEXT
status TEXT (pending|in_progress|submitted|approved|rejected)
created_at TEXT
updated_at TEXT
```

#### **design_submissions**
```sql
id TEXT PRIMARY KEY
design_request_id TEXT (FK to design_requests)
designer_id TEXT
submitted_at TEXT
status TEXT (pending_review|approved|rejected)
```

#### **design_comments**
```sql
id TEXT PRIMARY KEY
design_request_id TEXT (FK to design_requests)
user_id TEXT
comment TEXT
created_at TEXT
```

#### **design_request_files**, **design_submission_files**
File storage references for designs

---

## 3. EXISTING ADMIN COMPONENTS

Located in `/src/components/`

### Product/Design Management
- **ProductManager.tsx** - Admin interface for managing product types
- **DesignManager.tsx** - Admin interface for managing designs  
- **ProductDesignAssociations.tsx** - Link products to designs
- **ProductSelector.tsx** - User product selection component
- **DesignSelector.tsx** - User design selection component

### Pricing Management
- **PricingTierManager.tsx** - Create/edit pricing tiers
- **PricingTiersViewer.tsx** - View pricing tiers
- **PricingTable.tsx** - Display pricing to users

### Order Management
- **OrderForm.tsx** - Customer order creation
- **PaymentReviewForm.tsx** - Review order & payment
- **SubmittedPayments.tsx** - View submitted payments
- **PaymentsAdmin.tsx** - Admin payment management

### Design Workflow
- **DesignRequestForm.tsx** - Request new design
- **DesignRequestsList.tsx** - List of design requests
- **DesignRequestDetail.tsx** - View design request details

### Configuration
- **EmailNotificationSettings.tsx** - Setup notification emails
- **SessionWarningModal.tsx** - Session timeout warning

### UI
- **NavBar.tsx** - Navigation
- **MobileNav.tsx** - Mobile navigation
- **PasswordGate.tsx** - Password protection component

---

## 4. DATA FLOW DIAGRAMS

### Order Creation Flow

```
Customer Form (OrderForm.tsx)
    ↓ (POST /api/orders)
Create Order Record
    ↓
Add Order Items (order_items)
    - product_type_id
    - design_id
    - size_id
    - quantity
    ↓
Calculate Unit Pricing
    - Query pricing_tiers by product_type + quantity
    - Get live exchange rate from CRC→USD
    - Store unit_price_crc and unit_price_usd
    ↓
Store in Database
    ↓
Order Status: pending
```

### Pricing Calculation Flow

```
Product + Quantity Input
    ↓
Query pricing_tiers for product_type
    ↓
Find tier: min_qty ≤ requested_qty ≤ max_qty
    ↓
Get price_crc from tier
    ↓
Fetch live exchange rate (GET /api/exchange-rate)
    ↓
Calculate: price_usd = price_crc / exchange_rate
    ↓
Return both CRC and USD prices
```

**Key Logic**: 
- Prices defined in CRC (Colón) in source code (`src/lib/pricing.ts`)
- Pricing is tiered based on **total quantity** of that product across ALL orders
- Exchange rate fetched dynamically (not stored)
- USD is always calculated from CRC + live rate

### Payment Management Flow

```
Payment Recording
    ↓
POST /api/payments with:
    - order_id
    - amount_crc or amount_usd
    - method (zelle|venmo|paypal|cash)
    - reference
    ↓
Store in payments table
    ↓
Send notification email via SMTP
    ↓
Status: pending → admin reviews → confirmed/failed
```

### Team/Tenant Management Flow

```
Tenant Created
    ↓
GET /api/platform-admin/tenants
    ↓
Create tenant_admins for authentication
    ↓
Assign team_products (restrict product access)
    ↓
Can set price_overrides per team
    ↓
Team members login via /api/tenant/auth/login
    ↓
GET /api/team/products → only assigned products
```

### Admin Dashboard Data Flow

```
GET /api/admin/summary
    ↓
Calculate:
    - Total orders count
    - Total items count
    ↓
By Product:
    - Sum quantities for each product_type
    - Find pricing tier
    - Calculate total CRC & USD revenue
    ↓
By Design:
    - Count orders per design
    ↓
Return aggregated dashboard stats
```

---

## 5. KEY ARCHITECTURAL PATTERNS

### Multi-Database Support
- **SQLite**: Development/small deployments (db.ts, db-migrations.ts)
- **PostgreSQL**: Production (db-pg.ts, DATABASE_URL env var)
- Abstraction layer in `route-helpers.ts` handles both

### Route Helpers (`src/lib/route-helpers.ts`)
- `query()` - Multiple results
- `queryOne()` - Single result
- `execute()` - INSERT/UPDATE/DELETE
- `extractContext()` - Get tenant slug from request
- `requireAdminSession()` - Admin auth guard
- `requirePlatformAdmin()` - Platform admin auth guard
- `withTransaction()` - ACID transactions

### Authentication Model
1. **Admin Portal**: Session token in cookies (`admin-session`)
2. **Platform Admin**: Check against master credentials
3. **Team Members**: Email + password login per tenant

### Pricing Model
- Stored in code (`src/lib/pricing.ts`) or database (pricing_tiers table)
- Quantity-based tiers (bulk discounts)
- Dual currency (CRC + USD)
- Can override per team

### Tenant Isolation
- Every table has optional `tenant_id` foreign key
- Queries filtered by `WHERE tenant_id = ?`
- Default tenant: "default" slug

---

## 6. QUICK REFERENCE - Building an Admin Dashboard

To build a comprehensive admin dashboard, leverage:

1. **GET /api/admin/summary** - Main dashboard KPIs
2. **GET /api/orders** - List all orders with filtering
3. **GET /api/orders/[id]** - Order details with items
4. **GET /api/admin/products** - Product management
5. **GET /api/admin/designs** - Design management
6. **GET /api/admin/pricing-tiers** - Pricing rules
7. **GET /api/payments** - Payment history
8. **PATCH /api/orders/[id]** - Update order status
9. **POST /api/admin/admin-emails** - Setup notifications

Reusable components already exist for:
- ProductManager, DesignManager, PricingTierManager
- OrderForm, PaymentsAdmin
- Can be integrated into unified dashboard

---

## 7. DATABASE FEATURE SUMMARY

| Feature | Table | Status |
|---------|-------|--------|
| Multi-tenancy | tenants | ✅ Full support |
| Tiered pricing | pricing_tiers | ✅ Full support |
| Price overrides | price_overrides | ✅ Full support |
| Payment tracking | payments | ✅ Full support |
| Design workflow | design_requests* | ✅ Partial (design workflow tables exist) |
| Campaign archival | archived_campaigns | ✅ Full support |
| Subdomain routing | subdomain_redirects | ✅ Full support |
| Email notifications | admin_emails, smtp_settings | ✅ Full support |
| Order status tracking | orders | ✅ Full support |
| Exchange rates | exchange_rates | ✅ Live fetching |

*Design workflow tables exist but may not be fully integrated into main UI
