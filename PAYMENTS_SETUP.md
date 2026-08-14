# Online Academy Payments

The commerce layer supports paid courses, server-side price validation, discount codes, order creation, and a PayFast hosted-checkout adapter.

## 1. Vercel environment variables

Add these in **Vercel → Project → Settings → Environment Variables**. Use them only on the server. Never put merchant secrets in `VITE_*` variables or client-side code.

```text
FIREBASE_PROJECT_ID=online-academy-c7d72
FIREBASE_CLIENT_EMAIL=<service-account-client-email>
FIREBASE_PRIVATE_KEY=<service-account-private-key-with-\\n-or-multiline-format>
FIREBASE_WEB_API_KEY=<firebase-web-api-key>

SITE_URL=https://online-academy-plum.vercel.app

PAYFAST_MERCHANT_ID=<your-payfast-merchant-id>
PAYFAST_SECURED_KEY=<your-payfast-secured-key>
PAYFAST_MERCHANT_NAME=Online Academy
```

### Optional PayFast endpoint overrides

The code already defaults to the PayFast UAT/sandbox hosted-checkout endpoints, so these two variables are **optional for sandbox testing**:

```text
PAYFAST_TOKEN_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_CHECKOUT_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction
```

For production, use the exact endpoint supplied for your merchant environment if PayFast provides a different endpoint.

## 2. PayFast credentials

PayFast requires a merchant account and provides a `MERCHANT_ID` and `SECURED_KEY`. Keep both server-side. Do not commit the real values to GitHub.

For initial testing, use PayFast's sandbox/UAT credentials and endpoints. PayFast's hosted checkout token request is bound to the same basket/order ID, transaction amount, and currency that are posted to checkout.

## 3. Callback URL

Configure the PayFast backend notification/checkout URL as:

```text
https://online-academy-plum.vercel.app/api/payfast-callback
```

The application stores the gateway callback for reconciliation. A browser redirect by itself is **not** treated as proof of payment.

## 4. Security rules for payment

The checkout API does not trust a price sent by the browser. It loads the order from Firestore and sends the server-calculated `finalAmount` to PayFast. The payment start endpoint also verifies that the authenticated Firebase user owns the order.

Course access must only be granted after a verified successful gateway result or an explicit admin reconciliation. Do not change this to client-side-only payment confirmation.

## 5. Important Firebase key note

`FIREBASE_WEB_API_KEY` is a client Firebase configuration value and is not a replacement for the service-account private key. `FIREBASE_PRIVATE_KEY` and `PAYFAST_SECURED_KEY` are secrets and must never be committed to the repository.

If a real private key or PayFast secured key has ever been exposed publicly, revoke/regenerate it before production use.

## 6. Test checklist

1. Deploy the latest commit to Vercel.
2. Add PayFast sandbox `MERCHANT_ID` and `SECURED_KEY` to Vercel server environment variables.
3. Redeploy after changing environment variables.
4. Create a paid course and an order as an authenticated student.
5. Start checkout and confirm the PayFast UAT page opens.
6. Complete a sandbox transaction.
7. Confirm the callback reaches `/api/payfast-callback`.
8. Confirm the order is not marked `paid` merely because the browser returned to the success URL.
9. Verify the final paid state only after the gateway result has been validated.
