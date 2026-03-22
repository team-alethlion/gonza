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
- **The Rationale**: Prevents "phantom bugs" caused by mixing multiple complex changes in a single operation. Keeps the git diff clean and focused.


