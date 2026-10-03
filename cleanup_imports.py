#!/usr/bin/env python3
"""
Final cleanup: remove unused errorResponse/successResponse imports and fix remaining calls
"""

import re
from pathlib import Path

def cleanup_file(file_path: str) -> tuple[bool, str]:
    """Clean up a file"""
    
    full_path = Path(file_path)
    if not full_path.exists():
        return False, f"File not found"
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            original = f.read()
        
        content = original
        changes = 0
        
        # 1. Remove unused errorResponse and successResponse from imports
        # Pattern: imports with errorResponse, successResponse, withTransaction
        content = re.sub(r',\s*errorResponse', '', content)
        content = re.sub(r',\s*successResponse', '', content)
        content = re.sub(r',\s*withTransaction', '', content)
        
        # Clean up trailing spaces after comma removal
        content = re.sub(r',\s*\}', '}', content)
        content = re.sub(r'\{\s*,', '{', content)
        
        # 2. Fix remaining return successResponse(...); calls
        # Pattern: return successResponse(...)
        pattern = r'return\s+successResponse\(\s*([^)]+)\s*\);'
        def fix_success(m):
            nonlocal changes
            arg = m.group(1).strip()
            changes += 1
            return f'return NextResponse.json({arg});'
        content = re.sub(pattern, fix_success, content)
        
        # 3. Fix remaining return errorResponse(...); calls  
        # Pattern: return errorResponse(...)
        pattern = r'return\s+errorResponse\(\s*([^)]+)\s*\);'
        def fix_error(m):
            nonlocal changes
            arg = m.group(1).strip()
            changes += 1
            # Try to parse the two arguments
            # This is a simplified approach - handles most common cases
            if ',' in arg:
                parts = [p.strip() for p in arg.rsplit(',', 1)]
                if len(parts) == 2:
                    msg = parts[0]
                    status = parts[1]
                    return f'return NextResponse.json({{ error: {msg} }}, {{ status: {status} }});'
            return f'return NextResponse.json({{ error: {arg} }});'
        content = re.sub(pattern, fix_error, content)
        
        if content != original:
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, f"✓ Cleaned up ({changes} fixes)"
        else:
            return True, f"✓ OK"
    
    except Exception as e:
        return False, f"✗ Error: {str(e)}"

def main():
    print("🧹 Final cleanup pass")
    print("=" * 60)
    
    # Get all db-async files
    result = os.popen('grep -r "@/lib/db-async" src --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq').read()
    files = [f.strip() for f in result.strip().split('\n') if f.strip()]
    
    print(f"Cleaning {len(files)} files\n")
    
    for file_path in files:
        success, message = cleanup_file(file_path)
        if success:
            print(f"{message} - {file_path}")

if __name__ == "__main__":
    import os
    main()
