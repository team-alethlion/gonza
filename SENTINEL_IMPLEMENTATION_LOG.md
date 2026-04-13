# Sentinel System Implementation Log

## Status: INITIATED
**Date**: April 13, 2026

---

## 📅 Log: [2026-04-13]

### 🔍 Phase 1: Research & Setup
- [X] Created `SENTINEL_ACCESS_PLAN.md`.
- [ ] Research: Map all `User` and `Role` dependencies in `serializers.py` and `views.py`.
- [ ] Research: Verify if `EmailVerification` model can be reused for Branch invitations.

### 🏗️ Phase 2: Logic Modules (COMPLETED)
- [X] `backend/users/logic/roles.py`: Auto-provisioning and protection.
- [X] `backend/users/logic/invitations.py`: Verification and creation flow.
- [X] `backend/core_app/logic/access_control.py`: Guest mode detection.

### 🗄️ Phase 3: Database Models (COMPLETED)
- [X] Add `primary_branch` to `User` model.
- [X] Add `is_system_role` to `Role` model.
- [X] Create `BranchInvitation` model.
- [X] Generate and apply migrations.

### 🔌 Phase 4: Integration (COMPLETED)
- [X] `backend/core_app/logic/branches.py`: Updated to protect 'admin' and auto-provision 'manager'.
- [X] `backend/users/serializers.py`: Exposed `primary_branch` and added `BranchInvitationSerializer`.
- [X] `backend/users/views.py`: 
    - [X] Hardened `RoleViewSet.destroy` to protect system roles.
    - [X] Added `invite_manager` and `verify_invitation` endpoints to `UserViewSet`.
- [X] `backend/core/settings.py`: Registered `SentinelAccessMiddleware` for global protection.

### 🛡️ Final Security Audit [2026-04-13]
- **User Data**: Verified. `admin@gonza.com` (Superadmin) has bypass access. `gajelad554@lxbeta.com` correctly tied to `primary_branch`.
- **Role Protection**: Verified. Deletion of 'admin' roles is now blocked at the ViewSet level.
- **Middleware Extraction**: Identified that relying on URL params is a potential bypass if `branchId` is missing from the URL. 
- **Recommendation**: Update `djangoFetch` to include `X-Branch-Id` header automatically from the URL params or session context.

### 🖥️ Phase 5: Frontend UI (Next)
- [ ] Business Management: Add "Invite Manager" dialog.
- [ ] Business Management: Display assigned managers per branch.
- [ ] Global UI: Implement "Viewer Mode" guards (hide mutation buttons).
- [ ] Auth: Handle manager onboarding via invitation code.

### 🛡️ Side-Effect Audit (Updated)
- *Primary Branch addition*: Migration must include a script to set `primary_branch = branch` for all existing users whose role is not 'admin' or 'superadmin'.
- *System Role flag*: The `initialize_branch` and `verify_signup` logic should be updated to set `is_system_role=True` for 'admin' and 'manager' roles.
- *Invitation Model*: Need to ensure `unique_together = ('email', 'branch')` for pending invitations to prevent spam.
