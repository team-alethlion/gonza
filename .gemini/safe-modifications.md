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
- **The Rationale**: Prevents "greedy fixes" where a localized improvement results in systemic regressions.
