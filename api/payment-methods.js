function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=60");
  res.end(JSON.stringify(body));
}

const value = (name, fallback = "") => String(process.env[name] || fallback).trim();

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method Not Allowed" });

  return json(res, 200, {
    methods: [
      { id: "payfast", name: "PayFast Checkout", type: "gateway", description: "Cards, bank accounts, mobile wallets and supported Raast options through PayFast.", enabled: value("PAYFAST_MERCHANT_ID") !== "" },
      { id: "jazzcash", name: "JazzCash", type: "manual", description: "Pay directly to the configured JazzCash account and submit the transaction ID.", enabled: value("JAZZCASH_ACCOUNT_NUMBER") !== "", accountName: value("JAZZCASH_ACCOUNT_NAME"), accountNumber: value("JAZZCASH_ACCOUNT_NUMBER") },
      { id: "easypaisa", name: "Easypaisa", type: "manual", description: "Pay directly to the configured Easypaisa account and submit the transaction ID.", enabled: value("EASYPAISA_ACCOUNT_NUMBER") !== "", accountName: value("EASYPAISA_ACCOUNT_NAME"), accountNumber: value("EASYPAISA_ACCOUNT_NUMBER") },
      { id: "bank_transfer", name: "Bank Transfer", type: "manual", description: "Transfer the payable amount to the configured bank account and submit the transaction reference.", enabled: value("BANK_ACCOUNT_NUMBER") !== "", accountName: value("BANK_ACCOUNT_NAME"), accountNumber: value("BANK_ACCOUNT_NUMBER"), bankName: value("BANK_NAME"), iban: value("BANK_IBAN") },
    ],
  });
}
