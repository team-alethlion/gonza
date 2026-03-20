# Vercel Deployment & Cron Setup Requirements

This document outlines the mandatory steps to activate the background services (subscription monitoring, expiry notifications, and activity cleanup) implemented in the application.

## 1. Environment Variable Setup

To secure the background jobs, you must add a secret key to your Vercel project.

1.  **Generate a Secret:** Create a long, random string (e.g., using a password generator).
2.  **Add to Vercel:**
    *   Go to your **Vercel Dashboard**.
    *   Select your project (**gonza-final**).
    *   Navigate to **Settings** -> **Environment Variables**.
    *   Add a new variable:
        *   **Key:** `CRON_SECRET`
        *   **Value:** `[Your Generated Secret]`
    *   Ensure it is available in the **Production** environment.

## 2. Cron Job Scheduling

The background jobs are defined in `vercel.json` and will be automatically recognized by Vercel upon your next deployment.

### Configured Jobs:
*   **Subscription Monitor:** Daily at 00:00 UTC (`/api/cron/subscription-monitor`)
*   **Expiry Notifier:** Daily at 00:00 UTC (`/api/cron/expiry-notifier`)
*   **Activity Cleanup:** Every 6 hours (`/api/cron/activity-cleanup`)
*   **Orphaned Cleanup:** Every Sunday at 00:00 UTC (`/api/cron/orphaned-account-cleanup`)

## 3. Database Migration

Since we updated the Prisma schema to include the `lastSeen` field and `onDelete: Cascade` rules, you must push these changes to your database.

Before or during deployment, run:
```bash
npx prisma db push
```
*Note: If you are using migrations, use `npx prisma migrate dev` instead.*

## 4. Troubleshooting / Manual Triggering

If you need to verify that a service is working without waiting for the scheduled time, you can trigger it manually using `curl` or Postman:

**Header:** `Authorization: Bearer [Your CRON_SECRET]`
**Method:** `GET`
**URL:** `https://your-deployment-url.com/api/cron/[service-name]`

---
*Created on: February 28, 2026*
