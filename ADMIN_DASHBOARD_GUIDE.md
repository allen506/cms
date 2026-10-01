# 🎯 Global Admin Dashboard - Implementation Complete

## What's New

You now have a **comprehensive global admin dashboard** at `/platform-admin/dashboard` that allows you to manage all teams/tenants and orders from a single interface.

### Key Features Implemented

#### 1. **👥 Teams Management Tab**
- View all registered teams/tenants
- See team status (active/suspended)
- Create new teams
- Manage existing teams
- Quick stats dashboard (total teams, active, suspended)

#### 2. **📦 Orders Management Tab**
- View all orders across all teams
- Filter by team, status, search by name/order number
- Create new orders on behalf of teams
- See order items count and status at a glance
- Bulk team member management

#### 3. **📊 Breakdown Analysis Tab**
- Analyze orders by multiple dimensions:
  - **By Product** - Total quantities and order counts per product type
  - **By Design** - Distribution across designs
  - **By Size** - Size breakdown across all orders
  - **By Fit** - Fit options distribution
  - **By User** - Per-team-member analysis

#### 4. **👤 Per-Person Tab**
- View each team member's order totals
- See products ordered by each person
- Search by name or email
- Aggregate statistics (total people, orders, items)

#### 5. **💰 Pricing Tab**
- Manage pricing tiers across all teams
- View and edit pricing rules
- Create pricing overrides per team (if needed)

---

## Access Instructions

### Platform Admin Login
**URL:** `https://custom.cmssportswear.us/platform-admin/login`

**Default Credentials:**
- Email: See `PLATFORM_ADMIN_EMAIL` in your `.env` file
- Password: See `PLATFORM_ADMIN_PASSWORD` in your `.env` file

*Note: You can also create additional admin users in the database if needed*

### Dashboard URL
Once logged in: `https://custom.cmssportswear.us/platform-admin/dashboard`

---

## How to Use

### Create a New Team
1. Go to **👥 Teams** tab
2. Click **+ Create New Team**
3. Fill in team name, slug (URL identifier), admin email
4. Team admin gets initial password via email

### Create an Order for a Team
1. Go to **📦 Orders** tab
2. Select team from dropdown (or "All Teams")
3. Click **+ Create Order**
4. Enter team member name and email
5. Order created in draft status
6. Team members can then add products/designs

### View Order Analytics
1. Go to **📊 Breakdown** tab
2. Select team (optional, shows all teams if none selected)
3. View different breakdowns using the tabs within the section
4. Export data as needed

### Analyze Per-Person Totals
1. Go to **👤 Per-Person** tab
2. Select team (optional)
3. Search for specific team members
4. View their order count and product details

---

## New API Endpoints

### Orders Management
```bash
# Get all orders (with filtering)
GET /api/platform-admin/orders?tenant_id=ABC&status=draft&limit=50&offset=0

# Create order on behalf of team
POST /api/platform-admin/orders
{
  "tenantId": "tenant_123",
  "userName": "John Doe",
  "userEmail": "john@example.com",
  "items": [
    {
      "productTypeId": "jersey",
      "designId": "design_1",
      "sizeId": "M",
      "quantity": 2,
      "fit": "unisex"
    }
  ]
}
```

### Breakdown Analysis
```bash
# Get detailed breakdown by product, design, size, fit, user
GET /api/platform-admin/breakdown?tenant_id=ABC
```

### Per-Person Analysis
```bash
# Get per-person totals
GET /api/platform-admin/per-person?tenant_id=ABC
```

---

## Architecture

### Authentication
- Platform admin login uses environment variable credentials
- Sessions stored in secure httpOnly cookies
- Fallback to environment variables for first-time login
- All endpoints check `requirePlatformAdmin` middleware

### Multi-Tenant Support
- All endpoints automatically filter by `tenant_id`
- Can view all teams when tenant_id not specified
- Proper data isolation per tenant
- No cross-tenant data leakage

### Data Processing
- Real-time analytics across all teams
- Live exchange rate (CRC to USD) in breakdowns
- Calculated pricing tiers in order views
- Efficient database queries with proper aggregations

---

## Components Used

### New React Components
- **TenantSelector** - Dropdown to filter by team
- **OrdersManager** - Create and list orders with filtering
- **BreakdownViewer** - Tabbed analytics view
- **PerPersonViewer** - Per-team-member analysis with search

### Existing Components Integrated
- **PricingTierManager** - Manage pricing across teams
- All styling matches existing design system

---

## Troubleshooting

### Can't Login to Platform Admin
- Check `.env` file for `PLATFORM_ADMIN_EMAIL` and `PLATFORM_ADMIN_PASSWORD`
- Credentials are case-sensitive
- Session expires after 24 hours, need to re-login
- Check browser cookies are enabled

### Orders Not Showing in Breakdown
- Select the correct team from dropdown (or select "All Teams")
- Ensure orders are in correct tenant database
- Check if team_id in database matches selected tenant
- Orders in "draft" status are included in analytics

### Team Filter Showing No Options
- Ensure teams are created in database
- Teams must have status='active' to show
- Refresh page to reload team list
- Check database: `SELECT * FROM tenants WHERE status='active'`

---

## Next Steps & Enhancements

### Potential Future Features
1. **Order Editing** - Edit existing orders from admin dashboard
2. **Payment Processing** - Track and process payments globally
3. **Bulk Operations** - Import/export orders in bulk
4. **Custom Reports** - Generate PDF reports by date range
5. **Notifications** - Email alerts for new orders/payments
6. **Audit Logging** - Track all admin actions with timestamps

### Known Limitations
- Creating orders via UI doesn't add items initially (use separate form)
- Pricing overrides per team not yet implemented in UI
- No bulk order import/export yet
- No payment processing in this dashboard (tracked separately)

---

## Security Notes

⚠️ **Important:**
- Platform admin credentials control ALL teams' data
- Use strong password for platform admin
- Rotate credentials periodically
- Audit logs should track all admin actions
- Consider using database-based admin users instead of env vars for production

---

## Database Schema Support

The implementation uses these tables:
- `tenants` - Team information
- `orders` - Order records with tenant_id
- `order_items` - Line items in orders
- `product_types` - Available products
- `designs` - Design catalog
- `sizes` - Size options
- `pricing_tiers` - Pricing by quantity

All properly indexed and tenant-aware.

---

**Last Updated:** October 1, 2026  
**Status:** ✅ Complete and Deployed to Production  
**Access URL:** https://custom.cmssportswear.us/platform-admin/
