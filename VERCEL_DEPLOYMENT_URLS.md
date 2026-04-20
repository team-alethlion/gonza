# Vercel Deployment URLs

These are the constructed production URLs based on your Vercel domain: **gonza-pi.vercel.app**.
Use these values to update your environment variables in the Vercel Dashboard.

## App URLs
| Variable | Value |
| :--- | :--- |
| **NEXT_PUBLIC_WEBSITE_URL** | `https://gonza-pi.vercel.app` |
| **NEXT_PUBLIC_AUTH_URL** | `https://gonza-pi.vercel.app` |
| **NEXT_PUBLIC_CLIENT_URL** | `https://gonza-pi.vercel.app` |
| **NEXT_PUBLIC_ADMIN_URL** | `https://gonza-pi.vercel.app/_/admin` |
| **NEXT_PUBLIC_DJANGO_API_URL** | `https://gonza-pi.vercel.app/_/api` |

## Payment Callbacks
| Variable | Value |
| :--- | :--- |
| **PESAPAL_CALLBACK_URL** | `https://gonza-pi.vercel.app/api/payments/pesapal/callback` |

## Service Prefixes (Reference)
*   **Frontend:** `https://gonza-pi.vercel.app/`
*   **Backend (API & Admin):** `https://gonza-pi.vercel.app/_/`

---
**Note:** When adding these to Vercel, make sure `DEBUG` is set to `False`.
