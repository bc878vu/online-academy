# Vercel deployment

The `main` branch is connected to the Online Academy Vercel project.

Payment hardening keeps the project below the Vercel Hobby 12-serverless-function limit. Paid checkout uses PayFast hosted checkout, server-side verification, persistent user/course entitlement, transaction history and admin refund controls.

Deployment verification: the final hardening commit is intentionally merged through a fresh main-branch commit so the connected Vercel production deployment receives the latest payment code.
