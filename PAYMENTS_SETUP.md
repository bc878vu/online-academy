# Online Academy Payments

The commerce layer supports paid courses, server-side price validation, discount codes, order creation, a PayFast hosted-checkout adapter, and optional manual JazzCash/Easypaisa/bank-transfer verification.

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

### Optional direct/manual payment methods

These enable the separate manual payment choices shown at checkout. The student submits a transaction/reference number and the admin approves or rejects it from **Finance & Billing → Manual payment queue**.

```text
JAZZCASH_ACCOUNT_NAME=Your Business Name
JAZZCASH_ACCOUNT_NUMBER=03XXXXXXXXX

EASYPAISA_ACCOUNT_NAME=Your Business Name
EASYPAISA_ACCOUNT_NUMBER=03XXXXXXXXX

BANK_NAME=Your Bank
BANK_ACCOUNT_NAME=Your Business Name
BANK_ACCOUNT_NUMBER=XXXXXXXXXXXX
BANK_IBAN=PK00XXXXXXXXXXXX
```

Do not commit real wallet, bank, or merchant credentials to GitHub. Replace the example values only in Vercel environment variables.

## 2. Payment methods available to learners

- **PayFast Checkout** — recommended automatic gateway flow.
- **JazzCash** — optional direct/manual verification flow.
- **Easypaisa** — optional direct/manual verification flow.
- **Bank Transfer** — optional direct/manual verification flow.

PayFast's hosted checkout can itself present bank accounts, cards, mobile wallets and supported Raast options, so one PayFast checkout can already provide multiple digital payment choices. urlPayFast payment methodshttps://gopayfast.com/products/

## 3. PayFast credentials

PayFast requires a merchant account and provides a `MERCHANT_ID` and `SECURED_KEY`. Keep both server-side. Do not commit the real values to GitHub.

For initial testing, use PayFast's sandbox/UAT credentials and endpoints. The hosted-checkout token request is bound to the same basket/order ID, transaction amount, and currency that are posted to checkout.

### Optional PayFast endpoint overrides

```text
PAYFAST_TOKEN_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_CHECKOUT_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction
```

For production, use the exact endpoint supplied for your merchant environment if PayFast provides a different endpoint.

## 4. Callback URL

Configure the PayFast backend notification/checkout URL as:

```text
https://online-academy-plum.vercel.app/api/payfast-callback
```

The application stores the gateway callback for reconciliation. A browser redirect by itself is **not** treated as proof of payment.

## 5. Manual payment verification

For JazzCash, Easypaisa and bank transfer, the learner first creates an order, transfers the exact payable amount, and submits the transaction/reference number. The order becomes `manual_pending`.

Admin then opens:

**Admin → More → Finance & Billing → Manual Payment Queue**

The admin can **Approve** or **Reject** the transaction. Only an approved manual payment changes the order to `paid`, records the verification in finance logs, and unlocks the paid course.

## 6. Security rules for payment

The checkout API does not trust a price sent by the browser. It loads the course from Firestore and calculates the final amount server-side. Payment start also verifies that the authenticated Firebase user owns the order.

Course access must only be granted after a verified successful gateway result or an explicit admin reconciliation. Do not change this to client-side-only payment confirmation.

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
3. If direct/manual methods are required, add their Vercel account variables too.
4. Redeploy after changing environment variables.
5. Create a paid course and an order as an authenticated student.
6. Test PayFast and confirm the hosted checkout opens.
7. Test a manual method and confirm the order appears in the admin manual-payment queue.
8. Approve the manual test transaction and confirm course access unlocks.
9. Confirm PayFast orders are marked `paid` only after the verified callback/result.
10. Before production activation, replace all public contact placeholders with verified business details.
