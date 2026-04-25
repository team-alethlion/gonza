# Sentinel Access System: Multi-Branch & Manager Logic

## 1. Objective
Enable Agency Admins to assign managers to specific branches with full permissions for their assigned branch and "Viewer-Only" access to others (via PIN).

## 2. Core Architecture

### Tier 1: Backend Foundations
- **User Extension**: Link users to a `primary_branch`.
- **Role Protection**: Protect 'admin' and 'manager' roles from deletion.
- **Invitation Logic**: Handle email-based manager invitations and verification.
- **Access Middleware**: Intercept requests to enforce `READ_ONLY` mode when a manager accesses a non-primary branch.

### Tier 2: Security & Roles
- **Auto-Provisioning**: Automatically create a 'manager' role with full permissions if it doesn't exist in an agency.
- **PIN Verification**: Specialized module to verify branch-switch PINs for non-admin users.

### Tier 3: Frontend Scoping
- **Guest Mode Detection**: Global UI state to hide mutation buttons (Save/Delete/Edit) when in "Viewer Mode".
- **Secure Switcher**: Manager-specific flow for branch switching requiring PIN.

## 3. Implementation Modules (New Files)
- `backend/users/logic/invitations.py`: Handles creation and verification of branch invites.
- `backend/users/logic/roles.py`: Logic for role protection and auto-provisioning.
- `backend/core_app/logic/access_control.py`: Centralized permission/guest-mode checkers.

## 4. Safety Constraints
- **Isolation**: New logic must reside in the `logic/` subdirectories.
- **Zero-Shortcut**: No bulk overwrites of ViewSets.
- **Side-Effect Audit**: Every model change must be preceded by a search for dependent serializers and views.
