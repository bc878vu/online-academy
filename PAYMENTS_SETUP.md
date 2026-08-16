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

# Use the exact production endpoints supplied for your PayFast merchant account.
PAYFAST_TOKEN_URL=<production-token-endpoint>
PAYFAST_CHECKOUT_URL=<production-hosted-checkout-endpoint>
PAYFAST_STATUS_BASE_URL=<production-transaction-api-base>
```

Do not commit real merchant credentials to GitHub. Replace example values only in Vercel environment variables.

## 2. Real payment flow

Paid-course checkout exposes **PayFast Secure Checkout** only. The learner is redirected to the hosted PayFast payment page, where the actual bank/card/wallet transaction is processed. PayFast documents support for bank accounts, debit cards and wallets, including JazzCash and Easypaisa through its partner network. urlPayFast API documentationhttps://gopayfast.com/docs/

The application does not accept a typed transaction/reference number as proof of payment. Fake/manual references are blocked.

## 3. One-time purchase entitlement

Before creating a new payment order, the server checks for an existing verified paid order for the same Firebase user and course. If one exists, checkout immediately returns the learner to the course instead of charging again.

The course gate also checks the stored paid order. A successful purchase therefore remains unlocked on future visits. If the order is genuinely refunded, its status changes to `refunded` and access is locked again.

## 4. Callback and server-side verification

Configure the PayFast backend notification/checkout URL as:

```text
https://online-academy-plum.vercel.app/api/payfast-callback
```

The callback is not trusted by itself. The server queries PayFast's transaction-status API using the merchant credentials and verifies the gateway status and exact order amount before setting the order to `paid`.

The payment-result page polls the server-stored Firestore order for up to 90 seconds, so a delayed gateway callback can unlock the course without requiring the learner to repeatedly refresh the page.

## 5. Admin payment handling

Every gateway payment result creates an `adminNotifications` payment alert for the admin notification center. The finance screen also reads the complete `orders` history and supports server-side verification and real PayFast refunds.

Admin records include:

- Customer email and Firebase user ID
- Course and order ID
- Original, discount and final amount
- Payment status and gateway status code
- Provider transaction ID
- Payment verification timestamp
- Refund status, amount, reason and provider response

Verified gateway payments are automatically recorded as paid and unlock the course. Failed or insufficient-balance payments remain locked.

## 6. Real money settlement and SMS

The website does **not** move money directly between two ordinary SIM numbers. The actual debit and settlement are handled by PayFast and its acquiring/payment partners. PayFast states that customer payments are settled to the merchant according to the merchant's onboarding settlement mode; its standard settlement cycle is currently listed as T+2/T+3 working days. urlPayFast merchant FAQshttps://gopayfast.com/faqs/

The customer's bank/wallet may send the customer an OTP or transaction notification. A separate SMS to the academy SIM is not something the website can guarantee by itself; if the academy requires its own SMS alert, an SMS provider or a merchant-side notification service must be configured separately.

## 7. Security rules for payment

The checkout API does not trust a price sent by the browser. It loads the course from Firestore and calculates the final amount server-side. Payment start verifies that the authenticated Firebase user owns the order.

The callback queries the gateway and checks both the success code and the exact payable amount before changing the order to `paid`. A browser redirect, typed reference number, or client-side status cannot unlock a paid course.

Merchant secrets remain server-side. Never place `PAYFAST_SECURED_KEY` or the Firebase service-account private key in client code or `VITE_*` variables.

## 8. Vercel Hobby function limit

The project is intentionally kept at or below Vercel Hobby's 12-serverless-function deployment limit. Redundant serverless routes must not be added without consolidating them first.

## 9. PayFast website compliance checklist

Before requesting merchant activation, make sure the public website visibly contains:

- Privacy Policy
- Terms & Conditions
- Refund & Cancellation Policy
- Service & Delivery Policy
- Clear description of the digital services/courses being sold
- Clearly described course/service offerings
- Local office/business address
- Customer support/contact number
- Support email address

The Online Academy `/terms` page contains the Terms & Conditions, Privacy Policy, Refund & Cancellation Policy, Service & Delivery Policy, and course/service categories.

**Action required before PayFast review:** replace the contact placeholders on the page (`ADD SUPPORT EMAIL`, `ADD BUSINESS CONTACT NUMBER`, `ADD LOCAL OFFICE ADDRESS`) with the real business contact details. Do not publish invented contact information.

## 10. Important Firebase key note

`FIREBASE_WEB_API_KEY` is a client Firebase configuration value and is not a replacement for the service-account private key. `FIREBASE_PRIVATE_KEY` and `PAYFAST_SECURED_KEY` are secrets and must never be committed to the repository.

If a real private key or PayFast secured key has ever been exposed publicly, revoke/regenerate it before production use.

## 11. Test checklist

1. Deploy the latest commit to Vercel.
2. Add PayFast production or sandbox `MERCHANT_ID` and `SECURED_KEY` to Vercel server environment variables.
3. Add the exact PayFast token, checkout and transaction-status endpoints supplied for that merchant environment.
4. Redeploy after changing environment variables.
5. Create a paid course and an order as an authenticated student.
6. Test the hosted PayFast checkout with a valid sandbox payment.
7. Test an insufficient-balance/declined sandbox response if available from your PayFast test environment.
8. Confirm the admin notification appears with the gateway status and amount.
9. Confirm only a verified successful gateway result changes the order to `paid` and unlocks the course.
10. Re-open the same course from the same user account and confirm it remains unlocked without another charge.
11. Test an admin refund and confirm the order becomes `refunded` and the paid-course gate locks again.
12. Before production activation, replace all public contact placeholders with verified business details.
