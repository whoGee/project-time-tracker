# Security Audit Notes for Next Release

Date: 2026-03-06

## Scope
- Client-side React/Vite app
- Local persistence via IndexedDB (`idb`)
- Backup export/import (JSON, CSV)

## High-level assessment
- No backend/API, so no central user-data breach vector from this codebase.
- User data is stored locally per browser origin/profile in IndexedDB.
- Public repository does not expose user IndexedDB contents.
- Primary risks are local-device compromise, unsafe imports, and spreadsheet CSV injection.

## Findings

### 1) Medium: Import validation is too weak (integrity/DoS risk)
- `src/routes/SettingsPage.tsx` only validates that `projects` and `sessions` are arrays.
- `src/lib/db.ts` `importAllData(...)` writes imported records without field-level validation or size limits.
- Impact:
  - Malformed data can corrupt local app data.
  - Very large files can freeze UI or strain IndexedDB transactions.

### 2) Medium: CSV formula injection risk
- `src/lib/export.ts` escapes commas/quotes/newlines but does not neutralize leading `=`, `+`, `-`, `@`.
- If project names/ids begin with formula characters, exported CSV opened in Excel/Sheets may evaluate formulas.

### 3) Low-Medium: Missing CSP/security headers
- `index.html` has no CSP.
- Current app has no obvious XSS sink, but CSP is recommended as defense-in-depth.

### 4) Low: Local data is plaintext in browser storage
- IndexedDB data is not encrypted at rest.
- Acceptable for many offline apps, but users with sensitive data should be informed.

### 5) Low: Server-side protections not applicable
- No server means no auth/ACL/rate-limit layer.
- This reduces some risks but shifts trust to browser/device security.

## External user data exposure clarification
- External users cannot directly access each other’s data through this app under normal browser security.
- Data isolation is by origin and browser profile.
- Cross-user exposure would require:
  - user manually sharing exported files, or
  - compromised device/browser/extension, or
  - future XSS on the deployed origin.

## Dependency check
- `npm audit --omit=dev` run on 2026-03-06: `found 0 vulnerabilities`.

## Recommended improvements (priority order)
1. Add strict runtime schema validation for backup import:
   - Validate all fields/types/ranges.
   - Enforce max file size and max record count.
   - Fail with actionable error messages.
2. Harden CSV export:
   - Prefix cells starting with `=`, `+`, `-`, `@` with `'`.
3. Add CSP and security headers for deployed app:
   - `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`.
   - Add `Referrer-Policy`, `X-Content-Type-Options`, and `Permissions-Policy` where supported.
4. Optional: encrypted backup export/import:
   - Password-based encryption (Web Crypto, AES-GCM) for portable backups.
5. Add security regression checks in CI:
   - Dependency audit.
   - Input-validation tests for import parser.
   - Static checks preventing dangerous sinks.

## Relevant files referenced
- `src/routes/SettingsPage.tsx`
- `src/lib/db.ts`
- `src/lib/export.ts`
- `src/context/TrackerContext.tsx`
- `index.html`
- `package.json`
