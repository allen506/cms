#!/usr/bin/env python3
"""
Automated migration script from @/lib/route-helpers (SQLite) to @/lib/db-async (PostgreSQL)
"""

import re
import os
from pathlib import Path

# Files already migrated manually
ALREADY_MIGRATED = {
    "src/app/api/designs/requests/route.ts",
    "src/app/api/designs/requests/[id]/files/route.ts",
    "src/app/api/designs/requests/[id]/submissions/route.ts",
    "src/app/api/designs/requests/[id]/comments/route.ts",
}

# All files that need migration
FILES_TO_MIGRATE = [
    "src/app/api/admin/admin-emails/[id]/route.ts",
    "src/app/api/admin/admin-emails/route.ts",
    "src/app/api/admin/change-password/route.ts",
    "src/app/api/admin/designs/[id]/route.ts",
    "src/app/api/admin/designs/route.ts",
    "src/app/api/admin/payment-settings/route.ts",
    "src/app/api/admin/pricing-tiers/[id]/route.ts",
    "src/app/api/admin/pricing-tiers/route.ts",
    "src/app/api/admin/product-designs/[id]/route.ts",
    "src/app/api/admin/product-designs/route.ts",
    "src/app/api/admin/products/[id]/route.ts",
    "src/app/api/admin/products/route.ts",
    "src/app/api/admin/session/route.ts",
    "src/app/api/admin/smtp-settings/route.ts",
    "src/app/api/admin/subdomain-redirects/route.ts",
    "src/app/api/admin/summary/route.ts",
    "src/app/api/admin/test-smtp/route.ts",
    "src/app/api/admin/verify-password/route.ts",
    "src/app/api/app-settings/route.ts",
    "src/app/api/archived-campaigns/route.ts",
    "src/app/api/catalog/route.ts",
    "src/app/api/designs/[id]/image/route.ts",
    "src/app/api/final-designs/[id]/route.ts",
    "src/app/api/final-designs/route.ts",
    "src/app/api/orders/[id]/payment/route.ts",
    "src/app/api/orders/[id]/route.ts",
    "src/app/api/orders/create-with-products/route.ts",
    "src/app/api/orders/items/[itemId]/route.ts",
    "src/app/api/orders/new-campaign/route.ts",
    "src/app/api/orders/route.ts",
    "src/app/api/orders/search/route.ts",
    "src/app/api/orders/status/route.ts",
    "src/app/api/orders/team-quantities/route.ts",
    "src/app/api/orders/user-totals/route.ts",
    "src/app/api/payments/[id]/route.ts",
    "src/app/api/payments/route.ts",
    "src/app/api/platform-admin/breakdown/route.ts",
    "src/app/api/platform-admin/login/route.ts",
    "src/app/api/platform-admin/orders/route.ts",
    "src/app/api/platform-admin/per-person/route.ts",
    "src/app/api/platform-admin/pricing-tiers/route.ts",
    "src/app/api/platform-admin/products/route.ts",
    "src/app/api/platform-admin/team-captains/route.ts",
    "src/app/api/platform-admin/team-members/route.ts",
    "src/app/api/platform-admin/tenants/[id]/password/route.ts",
    "src/app/api/platform-admin/tenants/[id]/route.ts",
    "src/app/api/platform-admin/tenants/route.ts",
    "src/app/api/team/products/calculate-price/route.ts",
    "src/app/api/team/products/route.ts",
    "src/app/api/tenant/auth/login/route.ts",
    "src/app/api/tenant/auth/register/route.ts",
    "src/app/api/tenant/request-password-reset/route.ts",
    "src/app/api/tenant/user/profile/route.ts",
    "src/app/api/tenant/user/set-captain/route.ts",
    "src/app/api/tenant/verify-password/route.ts",
    "src/app/api/user/profile/route.ts",
    "src/app/api/user/reset-pin/route.ts",
    "src/app/custom/[teamname]/order/page.tsx",
    "src/app/custom/[teamname]/order/products/page.tsx",
    "src/app/custom/[teamname]/page.tsx",
]

def migrate_file(file_path: str) -> tuple[bool, str]:
    """Migrate a single file. Returns (success, message)"""
    
    full_path = Path(file_path)
    if not full_path.exists():
        return False, f"File not found: {file_path}"
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if already uses db-async
        if "@/lib/db-async" in content:
            return True, f"✓ Already migrated: {file_path}"
        
        if "@/lib/route-helpers" not in content:
            return True, f"✓ No route-helpers import: {file_path}"
        
        # STEP 1: Update imports
        # Pattern for route-helpers import
        import_pattern = r'import\s*\{\s*(.*?)\s*\}\s*from\s*["\']@/lib/route-helpers["\'];?'
        
        def replace_imports(match):
            imports_str = match.group(1)
            imports = [x.strip() for x in imports_str.split(',')]
            
            # Filter out response helpers (we'll add NextResponse directly)
            filtered = [x for x in imports if x not in ['errorResponse', 'successResponse', 'withTransaction']]
            
            # Build new import statement
            new_imports = ', '.join(filtered)
            has_next_response = "NextResponse" in content.split('\n')[0:20]  # Check first 20 lines
            
            result = f'import {{ {new_imports} }}'
            result += ' from "@/lib/db-async";'
            return result
        
        # Replace the import statement
        content = re.sub(import_pattern, replace_imports, content, count=1, flags=re.DOTALL)
        
        # STEP 2: Add NextResponse import if not present
        if "NextResponse" not in content and "{" in content:
            # Add to existing Next.js import or create new one
            next_import_pattern = r'import\s*\{\s*NextRequest\s*(?:,\s*NextResponse)?\s*\}\s*from\s*["\']next/server["\'];?'
            
            if re.search(next_import_pattern, content):
                # NextRequest exists, add NextResponse
                content = re.sub(
                    r'(import\s*\{\s*NextRequest)(\s*\})',
                    r'\1, NextResponse\2',
                    content,
                    count=1
                )
            else:
                # Create new import if needed
                lines = content.split('\n')
                # Find the first import line
                for i, line in enumerate(lines):
                    if line.startswith('import'):
                        if 'next/server' not in line:
                            lines.insert(i, 'import { NextResponse } from "next/server";')
                        break
                content = '\n'.join(lines)
        
        # STEP 3: Replace errorResponse(msg, status) with NextResponse.json({error: msg}, {status})
        # Pattern: errorResponse("message", status)
        error_response_pattern = r'errorResponse\(\s*(["\'].*?["\']|`.*?`)\s*,\s*(\d+)\s*\)'
        
        def replace_error_response(match):
            msg = match.group(1)
            status = match.group(2)
            return f'NextResponse.json({{ error: {msg} }}, {{ status: {status} }})'
        
        content = re.sub(error_response_pattern, replace_error_response, content)
        
        # Handle errorResponse with variables
        error_var_pattern = r'errorResponse\(\s*(\w+)\s*,\s*(\d+)\s*\)'
        content = re.sub(error_var_pattern, r'NextResponse.json({ error: \1 }, { status: \2 })', content)
        
        # STEP 4: Replace successResponse(data, status?) with NextResponse.json(data, {status?})
        # Pattern: successResponse({...}, 201)
        success_response_pattern = r'successResponse\(\s*(\{[^}]*\})\s*,\s*(\d+)\s*\)'
        content = re.sub(success_response_pattern, r'NextResponse.json(\1, { status: \2 })', content)
        
        # Pattern: successResponse({...}) without status
        success_response_simple = r'successResponse\(\s*(\{[^}]*(?:\{[^}]*\})*[^}]*\})\s*\)'
        content = re.sub(success_response_simple, r'NextResponse.json(\1)', content)
        
        # STEP 5: queryOne, query, and execute already work with db-async (same interface)
        # No changes needed for those - they work identically!
        
        # Write back the file
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True, f"✓ Migrated: {file_path}"
    
    except Exception as e:
        return False, f"✗ Error migrating {file_path}: {str(e)}"

def main():
    print("🚀 SQLite → PostgreSQL Migration Script")
    print("=" * 60)
    print(f"Total files to migrate: {len(FILES_TO_MIGRATE)}")
    print(f"Already migrated: {len(ALREADY_MIGRATED)}")
    print()
    
    success_count = 0
    error_count = 0
    
    for file_path in FILES_TO_MIGRATE:
        if file_path in ALREADY_MIGRATED:
            print(f"⊘ Skipping already migrated: {file_path}")
            continue
        
        success, message = migrate_file(file_path)
        print(message)
        
        if success:
            success_count += 1
        else:
            error_count += 1
    
    print()
    print("=" * 60)
    print(f"✓ Successfully migrated: {success_count}")
    print(f"✗ Errors: {error_count}")
    print(f"⊘ Skipped (already migrated): {len(ALREADY_MIGRATED)}")

if __name__ == "__main__":
    main()
