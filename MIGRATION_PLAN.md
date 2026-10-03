# SQLite → PostgreSQL Migration Plan

## Overview
Migrate 64 API files from `@/lib/route-helpers` (SQLite) to `@/lib/db-async` (PostgreSQL).

## Key Differences

### Import Changes
```ts
// BEFORE
import { query, queryOne, execute, errorResponse, successResponse, extractContext, requireAuth } from "@/lib/route-helpers";

// AFTER
import { NextResponse } from "next/server";
import { query, queryOne, execute, extractContext, requireAuth } from "@/lib/db-async";
```

### Function Replacements
| Old | New |
|-----|-----|
| `queryOne(sql, params)` | `await query(sql, params)[0]` |
| `query(sql, params)` | `await query(sql, params)` |
| `execute(sql, params)` | `await query(sql, params)` |
| `errorResponse(msg, status)` | `NextResponse.json({error: msg}, {status})` |
| `successResponse(data, status?)` | `NextResponse.json(data, {status})` |

### Placeholder Conversion
- SQLite uses `?` placeholders
- PostgreSQL uses `$1, $2, etc` placeholders
- **GOOD NEWS**: `db-async` automatically converts `?` → `$N` via `convertSqliteToPg()`
- No manual placeholder replacement needed!

## Migration Strategy

### Phase 1: Design Routes (Priority)
These are actively tested, so we can validate the migration:
1. `/api/designs/requests/route.ts`
2. `/api/designs/requests/[id]/files/route.ts`
3. `/api/designs/requests/[id]/submissions/route.ts`
4. `/api/designs/requests/[id]/comments/route.ts`

### Phase 2: Other Routes
Remaining 60 files in order of dependency:
- Admin routes
- Order routes
- Payment routes
- User routes
- Team routes
- Platform admin routes
- Other routes

## Status
- **Total files**: 64
- **Phase 1 (Design routes)**: 4 files
- **Phase 2 (Other routes)**: 60 files
