# Online Academy Payments

The commerce layer uses a real PayFast hosted checkout for paid courses. Prices are calculated server-side, the customer's payment is processed by the gateway, the gateway transaction is checked again server-side, and course access is granted only after a verified successful payment.

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

# Optional production endpoint override if PayFast supplies a different base.
PAYFAST_TOKEN_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_CHECKOUT_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction
PAYFAST_STATUS_BASE_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction
```

Do not commit real merchant credentials to GitHub. Replace example values only in Vercel environment variables.

## 2. Real payment flow

Paid-course checkout now exposes **PayFast Secure Checkout** only. The learner is redirected to the hosted PayFast payment page, where the actual bank/card/wallet transaction is processed. PayFast documents support for bank accounts, debit cards and wallets, and its error codes include `97` for insufficient balance. urlPayFast API documentationhttps://gopayfast.com/docs/

The application does not accept a typed transaction/reference number as proof of payment. Fake/manual references are blocked.

## 3. PayFast credentials

PayFast requires a merchant account and provides a `MERCHANT_ID` and `SECURED_KEY`. Keep both server-side. Do not commit the real values to GitHub.

For initial testing, use PayFast's sandbox/UAT credentials and endpoints. For production, use the exact endpoints supplied for your merchant environment.

## 4. Callback and server-side verification

Configure the PayFast backend notification/checkout URL as:

```text
https://online-academy-plum.vercel.app/api/payfast-callback
```

The callback is not trusted by itself. The server queries PayFast's transaction-status API using the merchant credentials and verifies the gateway status and exact order amount before setting the order to `paid`.

The browser also calls `/api/payfast-verify` while returning from checkout. This is a second server-side check and does not trust the browser's success/failure redirect.

## 5. Admin payment handling

Every gateway payment result creates an `adminNotifications` payment alert for the admin notification center. The admin can see:

- Payment received & verified
- Payment pending
- Payment verification failed
- Payment failed — insufficient balance
- Gateway status code and provider message
- Order, course, amount and customer email

Verified gateway payments are automatically recorded as paid and unlock the course. Failed or insufficient-balance payments remain locked.

## 6. Security rules for payment

The checkout API does not trust a price sent by the browser. It loads the course from Firestore and calculates the final amount server-side. Payment start verifies that the authenticated Firebase user owns the order.

The payment verifier checks the gateway transaction status and the exact payable amount. A browser redirect, typed reference number, or client-side status cannot unlock a paid course.

Course access is granted only when the server records the order as `paid` after gateway verification.

## 7. PayFast website compliance checklist

Before requesting merchant activation, make sure the public website visibly contains:

- Privacy Policy
- Terms & Conditions
- Refund & Cancellation Policy
- Service & Delivery Policy
- Clear description of the digital services/courses being sold
- At least 7–8 clearly described course/service offerings or categories
- Local office/business address
- Customer support/contact number
- Support email address

The Online Academy `/terms` page contains the Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, Service & Delivery Policy, and course/service categories.

**Action required before PayFast review:** replace the contact placeholders on the page (`ADD SUPPORT EMAIL`, `ADD BUSINESS CONTACT NUMBER`, `ADD LOCAL OFFICE ADDRESS`) with the real business contact details. Do not publish invented contact information.

## 8. Important Firebase key note

`FIREBASE_WEB_API_KEY` is a client Firebase configuration value and is not a replacement for the service-account private key. `FIREBASE_PRIVATE_KEY` and `PAYFAST_SECURED_KEY` are secrets and must never be committed to the repository.

If a real private key or PayFast secured key has ever been exposed publicly, revoke/regenerate it before production use.

## 9. Test checklist

1. Deploy the latest commit to Vercel.
2. Add PayFast sandbox `MERCHANT_ID` and `SECURED_KEY` to Vercel server environment variables.
3. Add `PAYFAST_STATUS_BASE_URL` if your merchant environment uses a different status API base.
4. Redeploy after changing environment variables.
5. Create a paid course and an order as an authenticated student.
6. Test the hosted PayFast checkout with a valid sandbox payment.
7. Test an insufficient-balance/declined sandbox response if available from your PayFast test environment.
8. Confirm the admin notification appears with the gateway status and amount.
9. Confirm only a verified successful gateway result changes the order to `paid` and unlocks the course.
10. Before production activation, replace all public contact placeholders with verified business details.
