#!/usr/bin/env python3
"""
Fix remaining errorResponse and successResponse calls
"""

import re
import os
from pathlib import Path

def fix_file(file_path: str) -> tuple[bool, str]:
    """Fix remaining response calls in a file"""
    
    full_path = Path(file_path)
    if not full_path.exists():
        return False, f"File not found: {file_path}"
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            original = f.read()
        
        content = original
        error_count = 0
        success_count = 0
        
        # Pattern 1: errorResponse with string literal and status code
        # errorResponse("message", 401)
        pattern1 = r'return\s+errorResponse\(\s*(["\'](?:[^"\'\\]|\\.)*?["\'])\s*,\s*(\d{3})\s*\)'
        def replace1(m):
            nonlocal error_count
            msg = m.group(1)
            status = m.group(2)
            error_count += 1
            return f'return NextResponse.json({{ error: {msg} }}, {{ status: {status} }})'
        content = re.sub(pattern1, replace1, content)
        
        # Pattern 2: errorResponse with variable and status code
        # errorResponse(authError.error, 401)
        pattern2 = r'return\s+errorResponse\(\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*,\s*(\d{3})\s*\)'
        def replace2(m):
            nonlocal error_count
            var = m.group(1)
            status = m.group(2)
            error_count += 1
            return f'return NextResponse.json({{ error: {var} }}, {{ status: {status} }})'
        content = re.sub(pattern2, replace2, content)
        
        # Pattern 3: return errorResponse(...) without return (in if statements)
        # errorResponse("message", 401) at line start
        pattern3 = r'^\s+errorResponse\(\s*(["\'](?:[^"\'\\]|\\.)*?["\'])\s*,\s*(\d{3})\s*\)$'
        def replace3(m):
            nonlocal error_count
            msg = m.group(1)
            status = m.group(2)
            error_count += 1
            return f'      return NextResponse.json({{ error: {msg} }}, {{ status: {status} }})'
        content = re.sub(pattern3, replace3, content, flags=re.MULTILINE)
        
        # Pattern 4: successResponse with object and status
        # successResponse({...}, 201)
        pattern4 = r'return\s+successResponse\(\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})\s*,\s*(\d{3})\s*\)'
        def replace4(m):
            nonlocal success_count
            obj = m.group(1)
            status = m.group(2)
            success_count += 1
            return f'return NextResponse.json({obj}, {{ status: {status} }})'
        content = re.sub(pattern4, replace4, content)
        
        # Pattern 5: successResponse with object, no status
        # successResponse({...})
        pattern5 = r'return\s+successResponse\(\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})\s*\)'
        def replace5(m):
            nonlocal success_count
            obj = m.group(1)
            success_count += 1
            return f'return NextResponse.json({obj})'
        content = re.sub(pattern5, replace5, content)
        
        if content != original:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, f"✓ Fixed {error_count} errorResponse, {success_count} successResponse: {file_path}"
        else:
            return True, f"✓ No changes needed: {file_path}"
    
    except Exception as e:
        return False, f"✗ Error in {file_path}: {str(e)}"

def main():
    print("🔧 Fixing remaining response calls")
    print("=" * 60)
    
    # Get all migrated files
    result = os.popen('grep -r "@/lib/db-async" src/app --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq').read()
    files = [f.strip() for f in result.strip().split('\n') if f.strip()]
    
    print(f"Found {len(files)} files using db-async\n")
    
    fixed_count = 0
    error_count = 0
    
    for file_path in files:
        success, message = fix_file(file_path)
        if "✓" in message:
            print(message)
            fixed_count += 1
        else:
            print(message)
            error_count += 1
    
    print()
    print("=" * 60)
    print(f"✓ Fixed: {fixed_count}")
    print(f"✗ Errors: {error_count}")

if __name__ == "__main__":
    main()
