# Accounts and synchronization implementation plan

Status: architecture proposal; storage foundation implemented, identity/encryption/cloud sync not implemented. Prepared 2026-11-12.

## Outcome and scope

An astronaut can keep using Orbit without connectivity, optionally connect a personal account, and synchronize saved check-ins across authorized devices when online. Authentication never substitutes for authorization. The initial shared service supports personal records only, using synthetic data until the implementation and operational controls have been reviewed.

Existing behavior: one unencrypted `orbit-health-v1` localStorage array; no account identity, backend, session, permissions, or upload. Public PWA assets are cached independently. Version 1 backups remain supported. Nothing in this document enables cloud uploads or changes today's app.

## Proposed stack

Retain React, Vite, and the PWA. Use IndexedDB for transactional local records and a durable mutation queue. Add a same-origin backend-for-frontend (BFF) with managed Supabase Auth and PostgreSQL. Use database row-level security (RLS) as defense in depth alongside server authorization.

The BFF owns authentication tokens and exposes an opaque session cookie to the browser. Cookie: Secure, HttpOnly, SameSite=Lax, Path=/, with a __Host- prefix and no Domain attribute. Store a hash of the opaque session identifier server-side; keep provider refresh credentials encrypted server-side. Rotate sessions at sign-in and sensitive changes; impose idle and absolute expirations. Apply CSRF protection and Origin checks to state-changing endpoints, restrict CORS to the app origin, and never put credentials in URLs.

The browser must not store auth tokens in localStorage or embed service-role credentials in Vite environment variables. Requests to Supabase should carry the authenticated user's verified identity so RLS still applies; reserve privileged credentials for narrowly scoped backend administration. A service-role connection bypassing RLS is not an acceptable default for sync.

Why this proposal: managed identity avoids implementing passwords ourselves; PostgreSQL supports transactional versions and change feeds. The BFF keeps long-lived auth tokens out of browser JavaScript. This adds hosting and session-store work compared with a browser-only SDK, which should be included in the estimate. Provider selection is provisional until hosting, cost, and team preferences are settled.

## User flow

1. Start in local-only mode; the existing workflow remains available.
2. Choose Connect account; explain what sync uploads and how devices retain copies.
3. Sign in online with a verified email/password account. Use provider-supported verification, reset, rate limiting, and recovery flows. Require MFA for operational use and future clinician/admin accounts.
4. Review existing local records. Explicitly choose which records to copy into the signed-in account; signing in alone must not upload them.
5. Enable synchronization for that account/device. Show pending counts, last successful synchronization time, and errors.
6. On reconnect, revalidate the session, then exchange changes. Keep local work if authentication expires.
7. On sign-out, stop sync, clear session state and in-memory data, and lock the account partition. Warn about pending changes and offer export before device removal.

Account switching must never display or upload the previous account's records. Do not adopt legacy records automatically for the next person signing in on a shared device. Local-only and account workspaces are distinct in the UI.

## Permissions, release 1

| Actor | Allowed |
| --- | --- |
| Local-only user | Their device-local workspace; no cloud requests |
| Signed-in astronaut | Read/create/update/delete their own check-ins and manage their devices |
| Another signed-in astronaut | No access to that astronaut's records, notes, reports, queue, or exports |
| Support operator | Operational metadata only; no routine health-record access |
| Clinician / mission team | No account-based access in release 1; use reviewed manual reports |

Any later clinical sharing requires an explicit recipient, permission scope, expiry/revocation, and access auditing. Organization membership is not health-data permission. Behavioral notes need a separately considered sharing policy. Offline copies cannot be remotely recalled while disconnected; disclose that limit before introducing sharing.

## Local storage and encryption

Use an `orbit-v2` IndexedDB database with records, outbox, sync state, and migration metadata. All keys include a workspace identifier (local-only or the immutable authenticated user ID), not email. Every query is scoped to the active workspace. IndexedDB is not encrypted merely because it is a database.

Before real sensitive data is allowed on shared devices, implement encrypted account partitions: random workspace key, authenticated encryption for record payloads and outbox payloads, unique random IV per encryption, and an authenticated envelope identifying schema/workspace/record. Wrap the workspace key using a key derived from a separate offline-unlock passphrase with a vetted, reviewed KDF configuration and stored salt. Keep unwrapped keys only in memory; lock on sign-out and after configurable idle time. No raw key or passphrase is persisted or logged. Use established libraries and review key management rather than inventing cryptography.

Offline unlock is a local-device function, not a server login. It does not grant cloud authority. On first access on a new device, online sign-in is required. Credential revocation cannot remotely erase or deny already downloaded data while a device remains offline; configure a maximum offline-unlock lease for operational deployments. If the lease expires, retain encrypted queued records but require online reauthentication before unlocking.

If an offline passphrase is lost, unsynced encrypted data may be unrecoverable. Synced records can be downloaded again after account recovery and device re-enrollment. Provide export and recovery instructions before enabling encryption. Do not present the server-held plaintext database as end-to-end encryption: this proposal uses TLS, provider/server encryption at rest, and separate local encryption. True end-to-end encryption would require a different key distribution and recovery design.

## Proposed data model

| Entity | Important fields and constraints |
| --- | --- |
| profiles | user_id referencing auth user, display label; no client-editable security roles |
| check_ins | record_id, owner_id, measured_at UTC, existing measurement fields, context, notes, schema_version, server_version, server_updated_at, deleted_at |
| devices | device_id, owner_id, label, enrolled_at, revoked_at, last_seen_at; device ID is identification, not authentication |
| mutation_receipts | owner_id + mutation_id unique, request hash, canonical response; supports safe retries |
| change_log | per-owner monotonic sequence, record_id, operation, canonical version; append in the same transaction as each mutation |
| sessions | hashed session ID, owner, expiry, revocation and server-encrypted provider credentials |
| security_events | actor, action, record/device identifier, server time, outcome; no readings or note contents |

Use `(owner_id, record_id)` as the record key. Owner comes from the verified server session; a caller cannot assign another owner's records. RLS SELECT/INSERT/UPDATE/DELETE policies and grants must explicitly restrict access to the authenticated owner. Membership and user-editable metadata must not grant elevated roles.

Server validation mirrors measurement types, ranges, precision, paired pressure values, note limits and timestamp rules. Validate batches, pagination and payload sizes independently of the browser. Distinguish measured time from server commit time; never use device clocks to order synchronization. Preserve record IDs during import/migration; namespace them by owner and handle pre-existing collisions explicitly.

## Sync protocol and conflict handling

Local changes write the record and outbox mutation atomically in one IndexedDB transaction. A mutation contains mutation_id, record_id, device_id, base_version, operation, and payload. Save returns locally even without connectivity; UI distinguishes Saved on device from Synced. Coalesce or serialize mutations for one record so each acknowledgement establishes the next base_version.

Suggested endpoints:

- GET /api/session: verified account and current session status; no secrets.
- POST /api/sync/push: bounded mutations; per-item accepted/conflict/rejected result.
- GET /api/sync/pull?cursor=...: paginated changes, tombstones, and an opaque owner-bound continuation cursor.
- POST /api/logout and device management endpoints: session/device revocation.

Sync sequence:

1. Confirm the active workspace, unlocked state, session, and device authorization.
2. Push pending mutations in per-record order with stable mutation IDs.
3. In a server transaction, check authorization, idempotency receipt and base_version, then commit a new version, change-log event and receipt. Reusing a mutation ID with a different payload is rejected.
4. An accepted mutation returns the canonical server version. Update local state and remove that mutation atomically. Never overwrite a newer local edit with an acknowledgement for an older edit.
5. A stale base_version returns a conflict with both versions; retain the pending local version. Never silently select the newest timestamp.
6. Pull changes after the last cursor. Apply each page and advance its cursor in one local transaction. Pending local edits are preserved as conflicts rather than overwritten.
7. Retry temporary network errors with bounded exponential backoff/jitter. On 401, pause for sign-in; on denied/revoked access, stop automatic retries and show a recovery/export action. Browser online events trigger attempts but are not proof of server reachability.

Conflicts show both values, notes, measured times and contexts. The user may keep the server version, submit their local version against the returned current server_version, or preserve the local version as a new check-in after confirming it represents a separate measurement. A new race produces another conflict instead of forced overwrite.

Deletes synchronize as versioned tombstones, including edit-versus-delete conflicts. Pulling a delete cannot discard an unacknowledged local edit. Retain tombstones/change history under an explicit policy; if a device cursor is older than retention, require full reconciliation before it may push changes, preserving pending edits for review so old records cannot be silently resurrected. Account erasure and record deletion have different retention/backup rules and need user-visible policies.

Use a single sync coordinator per workspace across tabs (Web Locks where supported with an IndexedDB lease fallback). Use IndexedDB transactions for correctness and BroadcastChannel only for notifications. Every queue entry carries its original owner/workspace; reauthentication as another account cannot reassign it.

## Legacy migration

- Read and validate the existing localStorage array; offer a version 1 backup first.
- Copy records to the local-only IndexedDB workspace in a transaction, verifying counts and IDs. Record an idempotent migration marker only after commit.
- Keep the original array until successful verification and explicit cleanup; a failed or interrupted migration leaves the original readable.
- After sign-in, preview records selected for upload. Copy to the account workspace with stable IDs and collision review. Do not change their ownership in place.
- A fresh account starts empty unless the user selects migration/import. Imported files never trust an embedded owner, token, sync cursor or permissions.
- Export remains available offline. Plaintext report/JSON exports are explicitly identified; encrypted local storage does not encrypt a downloaded file.

## Operational controls before sensitive-data use

HTTPS everywhere; secure response headers and a tested CSP; dependency updates and reproducible lockfiles; request limits and rate limits for auth/sync; server-side authorization for every operation; verified account recovery; session/device revocation; encrypted backups with restoration drills; documented retention and erasure; environment separation; secret management and rotation; no health data in analytics, error telemetry or logs.

Serve auth, session, and sync responses with Cache-Control: no-store. Keep the service worker restricted to public app-shell assets; it must not cache private API responses, credentials, reports, or authenticated HTML. Sign-out locks local data and does not erase the public offline shell. Cloud synchronization does not make this prototype medically validated or mission certified.

## Delivery milestones and acceptance gates

1. **Storage boundary and migration:** introduce repository methods for list/save/delete and tests; move from localStorage to workspace-scoped IndexedDB plus outbox. Keep sync off. Verify interrupted migration, quota errors, account partition isolation and legacy backup compatibility.
2. **Local protection:** implement key lifecycle and unlock/lock workflow with reviewed crypto; verify no plaintext account payloads or keys remain in persistent storage. Test lost-passphrase and pending-data export behavior.
3. **Identity and backend:** configure a development provider, BFF, sessions, DB migrations and deny-by-default RLS. Test anonymous denial, user A versus B for every operation, owner spoofing, session expiry, CSRF, reset flows and revoked devices. Use synthetic records only.
4. **Two-device synchronization:** implement protocol, status UI and conflict review. Verify offline create/edit/delete, duplicate retries, concurrent edits, delete conflicts, server failures, cursor expiration, clock differences, multiple tabs and switching accounts during a request.
5. **Release review:** exercise recovery, backup restore, retention and account deletion; verify logs contain no health payloads; perform browser/device and security review before any operational/sensitive-data rollout. Clinician sharing remains a later release.

First coding slice: milestone 1, with the existing UI unchanged and no provider credentials required. Then provision a synthetic-data backend for milestone 3 while completing milestone 2. Do not claim encrypted storage or synchronized accounts until their acceptance gates pass.

## Decisions to confirm before provisioning

- Managed Supabase development project plus same-origin BFF hosting, or a provider required by the team?
- Personal records only for the first release (recommended), or a formally specified clinical sharing requirement?
- Shared versus personal devices, acceptable offline-unlock duration, and recovery expectations?
- Deployment region, data retention, operating budget, and responsible service administrator?

No cloud project, paid service, external transmission, new dependency, or runtime security claim is created by this plan.

## Sources

- [Supabase Auth](https://supabase.com/docs/guides/auth): managed authentication and RLS integration.
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security): database authorization and policy testing.
- [Supabase users](https://supabase.com/docs/guides/auth/users): privileged secret keys must remain server-side.
- [OWASP HTML5 security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html): browser-storage risks and session identifiers.
- [OWASP session management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html): session and cookie security guidance.

## Storage foundation implementation status

Implemented: async IndexedDB repository, local-only workspace, transactional legacy migration with retained source, record/outbox atomic writes, revision conflict checks, deletion tombstones, transactional imports, cross-tab refresh, and UI startup/write error handling. Tests use fake-indexeddb to cover rollback, restart and workspace isolation. The outbox is a local-only journal with no transport, acknowledgement, or cloud ownership adoption. Local encryption, user identity, backend authorization and actual synchronization remain future milestones. Legacy backup cleanup and journal compaction require explicit retention design.
