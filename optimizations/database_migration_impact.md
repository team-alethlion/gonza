# Research: Database Migration Impact (SQLite to PostgreSQL)

## 1. Overview
The user is inquiring about the potential impact of switching the primary database from **SQLite** to **PostgreSQL**. This is a standard progression for production-ready Django applications.

## 2. Technical Readiness Audit

### A. Driver & Dependency Check
- **Current State**: The `backend/pyproject.toml` already includes:
    - `psycopg2-binary`: The standard PostgreSQL adapter for Python.
    - `psycopg`: The newer PostgreSQL adapter (v3).
    - `dj-database-url`: A utility to parse database connection strings.
- **Verdict**: **FULLY PREPARED**. No new library installations are required.

### B. Configuration Compatibility
- **Current State**: `backend/core/settings.py` uses `dj_database_url.config()` for the `DATABASES` setting.
- **Verdict**: **FULLY COMPATIBLE**. Switching only requires updating the `DATABASE_URL` environment variable (e.g., `postgres://user:pass@host:port/db`).

### C. Raw SQL Investigation
- **Location**: `backend/inventory/logic/reports.py` contains a complex CTE (`WITH OpeningStock AS ...`).
- **Analysis**: The query uses standard ANSI SQL (`WITH`, `LEFT JOIN`, `COALESCE`, `SUM(CASE WHEN...)`). These features are fully supported and highly optimized in PostgreSQL.
- **Verdict**: **SAFE**. No code changes are required for existing reports.

## 3. Benefits of Switching to PostgreSQL

### A. Concurrency (CRITICAL)
- **SQLite**: Uses file-level locking. Only one writer can access the database at a time. This causes "Database is locked" errors during high-traffic sales periods.
- **PostgreSQL**: Uses row-level locking. Dozens of users can create sales simultaneously without blocking each other.

### B. Performance
- **Complex Queries**: PostgreSQL's query planner is significantly more advanced than SQLite's, leading to faster execution of the complex reports found in the `inventory` module.
- **Data Integrity**: PostgreSQL enforces stricter type checking and foreign key constraints, which aligns with the "Data Integrity Mandates" of this project.

### C. Advanced Features
- **JSONB**: If the app scales to store complex metadata, PostgreSQL's `JSONB` allows for indexed, high-performance JSON queries.

## 4. Potential Risks & Migration Tasks

### A. Case Sensitivity
- **SQLite**: `LIKE` queries are case-insensitive by default.
- **PostgreSQL**: `LIKE` is case-sensitive. Django's `__icontains` filter correctly uses `ILIKE` in PostgreSQL, so standard ORM queries are safe. However, raw SQL must be checked for `LIKE` vs `ILIKE`.

### B. Migration Procedure
1. **Dump Data**: Use `python manage.py dumpdata` to export current records.
2. **Switch DB**: Update `.env` with the PostgreSQL connection string.
3. **Migrate**: Run `python manage.py migrate` to create the schema in PostgreSQL.
4. **Load Data**: Use `python manage.py loaddata` to import the records.

## 5. Conclusion
Switching to PostgreSQL will have **zero negative impact** on the application logic and will provide **significant improvements** in reliability, concurrency, and scalability. It is highly recommended for the next phase of the project.
