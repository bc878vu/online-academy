# Online Academy Payments

The commerce layer supports paid courses, server-side price validation, discount codes, order creation, and a PayFast checkout adapter.

## Vercel environment variables

Set these as **server-side** Vercel environment variables. Never put merchant secrets in `VITE_*` variables or client code.

```text
FIREBASE_PROJECT_ID=online-academy-c7d72
FIREBASE_CLIENT_EMAIL=<service-account-client-email>
FIREBASE_PRIVATE_KEY=<service-account-private-key>
FIREBASE_WEB_API_KEY=<firebase-web-api-key>

SITE_URL=https://online-academy-plum.vercel.app

PAYFAST_MERCHANT_ID=<merchant-id>
PAYFAST_SECURED_KEY=<secured-key>
PAYFAST_MERCHANT_NAME=Online Academy
PAYFAST_TOKEN_URL=<PayFast token endpoint supplied for your merchant environment>
PAYFAST_CHECKOUT_URL=<PayFast web-checkout endpoint supplied for your merchant environment>
```

## Important

1. Use PayFast sandbox credentials/endpoints for testing first.
2. Keep `PAYFAST_SECURED_KEY` server-only.
3. The checkout API reads the course price from Firestore and recalculates coupons server-side; the browser is not trusted for the payable amount.
4. A payment browser redirect is **not** treated as proof of payment. The callback is stored as `callback_received`; course access should only be granted after verified gateway confirmation or explicit admin reconciliation.
5. Configure the PayFast callback URL as:

```text
https://online-academy-plum.vercel.app/api/payfast-callback
```

PayFast's current developer documentation states that merchant credentials are required for API transactions and supports web checkout/redirection and multiple payment methods. Use the exact endpoint/parameters supplied in your merchant account's integration documentation before enabling live payments.
