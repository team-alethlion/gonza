# Safe Modification Mandates

## 1. No Blind Overwrites

- **The Rule**: NEVER overwrite a large file without reading the specific lines first.
- **The Protocol**: Use `grep_search` and `read_file` to find the exact context before using `replace`.
- **The Rule**: Avoid `write_file` for large, existing components; prefer `replace` for surgical edits.

## 2. Preserve Staff Work

- **The Instruction**: Be extremely careful not to delete or modify logic that was implemented by the user or other staff members.
- **The Check**: Always check the surrounding context of a change to ensure imports and helper functions aren't being orphaned.

## 3. Modularization without Regression

- When splitting large components (like `SalesForm.tsx`), ensure every piece of logic (Refs, Effects, Handlers) is moved perfectly.
- Verify that prop drilling or context access is maintained so no features (like Barcode Scanning or SMS) are lost during the split.

## 5. No Unsolicited Fixes

- **The Rule**: If a bug or performance flaw is found while working on something else, **REPORT IT, DON'T FIX IT**.
- **The Procedure**: Add an alert section to the bottom of the response. Describe the issue and its location. Request permission to fix it in the next turn.
- **The Rationale**: Prevents \"phantom bugs\" caused by mixing multiple complex changes in a single operation. Keeps the git diff clean and focused.

## 6. Investigation vs. Implementation

**The Rule**: When asked to \"investigate\", \"find out\", or \"research\", DO NOT update any code.

- **The Protocol**: Provide a detailed report of the findings and wait for an explicit directive to implement the fix.
- **The Rationale**: Ensures the user understands the root cause before any changes are made, preventing unintended side-effects.

## 7. Global Impact Awareness

- **The Rule**: ALWAYS check for downstream dependencies before modifying shared files (e.g., `backend/core_app/views.py`, common hooks, or global contexts).
- **The Protocol**: Use `grep_search` or `codebase_investigator` to find all usages of the symbol or file being modified.
- **The Protocol**: If a modification solves the current task but might break other pages or features, you MUST implement a backward-compatible solution (e.g., optional parameters, fallbacks, or versioned logic).
- **The Rationale**: Prevents \"greedy fixes\" where a localized improvement results in systemic regressions.

## 8. Next.js Proxy Pattern (Middleware)

- **The Rule**: NEVER create or use a `middleware.ts` file in this project.
- **The Protocol**: All middleware-level logic (Authentication, Redirects, Proxying) MUST reside in `proxy.ts` (currently located in `frontend/src/proxy.ts`).
- **The Rationale**: Next.js version 16+ in this project uses the `proxy` convention. Reintroducing `middleware.ts` causes build errors and prevents the application from booting correctly.
- **The Asset Protection**: Always ensure the `config.matcher` in `proxy.ts` includes strict exclusions for static assets (`icon.png`, `favicon.ico`, etc.) to prevent redundant authentication checks on images.

## 9. Anti-Deletion Protocol

- **The Rule**: NEVER use `...` or any omission placeholders in the `new_string` or `old_string` of a `replace` call. You must provide the EXACT, literal code.
- **The Rule**: AVOID updating large blocks of code in a single move. If a change spans multiple unrelated functions or sections, split it into sequential, smaller `replace` calls across multiple turns.
- **The Rule**: AVOID bulk updates that refactor many things at once. Keep every change targeted and reasonable to its specific purpose.
- **The Rationale**: Omission placeholders and large-scale replaces are the primary causes of accidental code deletion and syntax errors. Smaller, literal updates are safer and easier to verify.

## 10. Zero-Shortcut Mandate (Structural Protection)

- **The Prohibition**: NEVER perform a "surgical" replace that spans across multiple method boundaries if it requires deleting the structural headers (e.g., `class Name:`, `@action`, `def method_name:`) to be "fast".
- **The Protocol**: If you are adding a new method to a class, you MUST include the existing class header or the preceding method in your `old_string` to anchor the change, but you MUST NOT delete or replace existing structural code.
- **The Protocol**: For large ViewSets or Components, perform additions sequentially. First, read the file to find the end of the previous method, then append the new method.
- **The Mandate**: Speed is secondary to integrity. If a change takes 3 turns instead of 1 to ensure that NO existing code is lost, you MUST take the 3 turns.
- **The Rationale**: Shortcuts that skip structural context frequently lead to "Orphaned Logic" or "Deleted Class Headers", which crashes the entire application. Structural integrity is the project's Tier 1 priority.
