# Test Designer Account Setup

## Quick Setup

To create a test designer account, you have two options:

### Option 1: Run the Script (Recommended)
```bash
cd /opt/thinkmtb-order
npm run ts-node src/scripts/create-test-designer.ts
```

This will:
- Create a test designer account if it doesn't exist
- Print the login credentials
- Assign it to the first tenant in the database

### Option 2: Manual SQL (if script doesn't work)
```sql
-- First, get your tenant ID (replace 'nct' with your team slug if different)
SELECT id FROM tenants WHERE slug = 'nct' LIMIT 1;

-- Then insert the designer (replace {TENANT_ID} with the ID from above)
INSERT INTO designer_accounts (
  id, tenant_id, email, password_hash, full_name, company_name, permissions, active
) VALUES (
  'designer-test-001',
  '{TENANT_ID}',
  'designer@test.com',
  '$2b$10$YOUR_BCRYPT_HASH_HERE',  -- See password hash below
  'Test Designer',
  'Test Design Studio',
  '["view_requests","submit_designs","view_approvals"]',
  1
);
```

## Test Designer Credentials

After setup, use these credentials to login at: **https://custom.cmssportswear.us/designer/login**

```
Email:    designer@test.com
Password: TestDesigner123!
```

## Testing Workflow

1. **Login as Designer**
   - Go to `/designer/login`
   - Enter: designer@test.com / TestDesigner123!
   - Should see dashboard

2. **View Design Requests**
   - Dashboard will show pending requests from teams
   - Click "View" to see full request details

3. **Submit a Design Proposal**
   - Click "Submit Proposal" on a request
   - Upload design files
   - Add design notes/version info
   - Submit

4. **Track Submissions**
   - Go to `/designer/submissions`
   - See all your submitted proposals and their status

## Password Hash Generation

If you need to generate your own password hash:
```javascript
const bcrypt = require('bcryptjs');
const password = 'YourPassword123!';
const hash = bcrypt.hashSync(password, 10);
console.log(hash);
```

## Resetting Test Account

To reset the test account:
```sql
DELETE FROM designer_accounts WHERE email = 'designer@test.com';
```

Then run the setup script again.
