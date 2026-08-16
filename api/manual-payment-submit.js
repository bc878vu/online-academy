import { firestoreGet, firestoreQuery, firestoreSet, verifyFirebaseIdToken } from "./_firebase.js";

const ADMIN_EMAIL = "admin@onlineacademy.com";
const SUCCESS_CODES = new Set(["00", "000", "0"]);
function json(res, status, body) { res.statusCode = status; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(body)); }
function env(name, fallback = "") { return String(process.env[name] || fallback).trim(); }
function isAdmin(user) { return String(user?.email || "").trim().toLowerCase() === ADMIN_EMAIL; }
function clientIp(req) { return String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "0.0.0.0").split(",")[0].trim() || "0.0.0.0"; }
function successCode(code) { return SUCCESS_CODES.has(String(code || "").trim()); }
function money(value) { return `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-PK")}`; }
async function requireAdmin(req) { const header = String(req.headers.authorization || ""); const token = header.startsWith("Bearer ") ? header.slice(7).trim() : ""; if (!token) throw Object.assign(new Error("Authentication required"), { status: 401 }); const user = await verifyFirebaseIdToken(token); if (!isAdmin(user)) throw Object.assign(new Error("Admin access required"), { status: 403 }); return user; }

async function gatewayToken(order) {
  const merchantId = env("PAYFAST_MERCHANT_ID"), securedKey = env("PAYFAST_SECURED_KEY");
  if (!merchantId || !securedKey) throw new Error("Payment gateway is not configured.");
  const tokenUrl = env("PAYFAST_TOKEN_URL", "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken");
  const response = await fetch(tokenUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Online-Academy-Payments/1.1" }, body: new URLSearchParams({ MERCHANT_ID: merchantId, SECURED_KEY: securedKey, BASKET_ID: String(order?.orderId || "ADMIN-CHECK"), TXNAMT: Number(order?.finalAmount || 1).toFixed(2), CURRENCY_CODE: "PKR" }) });
  const raw = await response.text(); if (!response.ok) throw new Error(`PayFast authentication failed (${response.status}).`); let data = {}; try { data = JSON.parse(raw); } catch {}
  const token = data.ACCESS_TOKEN || data.access_token || data.token; if (!token) throw new Error("PayFast did not return an access token."); return token;
}

async function gatewayStatus(order) {
  const token = await gatewayToken(order), orderId = String(order.orderId || "").trim();
  if (!orderId) throw new Error("Order is missing its basket ID.");
  const orderDate = new Date(order.createdAt || Date.now()).toISOString().slice(0, 10), tokenUrl = env("PAYFAST_TOKEN_URL", "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken"), baseUrl = env("PAYFAST_STATUS_BASE_URL", tokenUrl.replace(/\/GetAccessToken\/?$/i, ""));
  // Always verify by the merchant basket/order ID. Never trust a transaction ID
  // supplied by a browser when determining whether this order was paid.
  const url = `${baseUrl}/transaction/basket_id/${encodeURIComponent(orderId)}?order_date=${encodeURIComponent(orderDate)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Online-Academy-Payments/1.1" } });
  const raw = await response.text(); let data = {}; try { data = JSON.parse(raw); } catch {}
  if (!response.ok) throw new Error(`PayFast status check failed (${response.status}).`); return data;
}

function extractGateway(data = {}) { return { code: String(data.status_code ?? data.STATUS_CODE ?? data.code ?? data.CODE ?? data.err_code ?? data.ERR_CODE ?? "").trim(), transactionId: String(data.transaction_id ?? data.TRANSACTION_ID ?? data.transactionId ?? "").trim(), basketId: String(data.basket_id ?? data.BASKET_ID ?? "").trim(), amount: Number(data.transaction_amount ?? data.TRANSACTION_AMOUNT ?? data.merchant_amount ?? data.MERCHANT_AMOUNT ?? data.TXNAMT ?? data.txnamt ?? 0), message: String(data.status_msg ?? data.STATUS_MSG ?? data.message ?? data.MESSAGE ?? "").trim() }; }
function providerMessage(gateway) { const messages = { "00":"Payment processed successfully.", "000":"Payment processed successfully.", "001":"Payment is still pending.", "002":"Payment timed out.", "97":"Insufficient balance in the customer's account/wallet.", "106":"Transaction limit exceeded.", "3":"Customer account is inactive.", "13":"Invalid payment amount.", "14":"Payment details are incorrect or inactive.", "55":"Invalid OTP/PIN.", "75":"Maximum PIN retries exceeded." }; return messages[gateway.code] || gateway.message || "Gateway did not approve the payment."; }

async function verifyOrder(order) {
  if (order.status === "refunded") return { status: "refunded", verified: false, message: "This order has already been refunded." };
  if (order.status === "paid" && order.paymentVerified === true) return { status: "paid", verified: true, message: "Payment is already verified." };
  const gateway = extractGateway(await gatewayStatus(order));
  const expected = Number(order.finalAmount || 0);
  const basketMatches = !gateway.basketId || gateway.basketId === String(order.orderId || "");
  const providerAmountPresent = gateway.amount > 0;
  const amountMatches = providerAmountPresent ? Math.abs(gateway.amount - expected) < 0.01 : true;
  const verified = successCode(gateway.code) && basketMatches && amountMatches;
  const now = new Date();
  let status = verified ? "paid" : gateway.code === "001" ? "payment_started" : "payment_failed";
  if (["paid", "refunded"].includes(String(order.status || ""))) status = order.status;

  await firestoreSet(`orders/${order.orderId}`, { ...order, provider: "payfast", providerBasketId: order.orderId, providerTransactionId: gateway.transactionId || order.providerTransactionId || "", providerStatusCode: gateway.code, providerStatusMessage: providerMessage(gateway), providerStatus: verified ? "verified" : gateway.code === "001" ? "pending" : "failed", transactionAmount: providerAmountPresent ? gateway.amount : (verified ? expected : (order.transactionAmount || null)), paymentVerified: verified || order.paymentVerified === true, paymentVerification: { gatewayChecked: true, basketMatched: basketMatches, amountChecked: providerAmountPresent, amountMatches, statusCode: gateway.code, checkedAt: now, checkedBy: ADMIN_EMAIL }, status, paidAt: verified ? (order.paidAt || now) : order.paidAt || null, updatedAt: now });
  await firestoreSet(`adminNotifications/payment-${order.orderId}-admin-${Date.now()}`, { type:"payment", event:verified?"gateway_payment_verified":gateway.code==="001"?"gateway_payment_pending":"gateway_payment_failed", title:verified?"Payment received & verified":gateway.code==="97"?"Payment failed — insufficient balance":"Payment verification result", message:`${providerMessage(gateway)} ${order.courseTitle || "Course"} — ${money(expected)}.`, orderId:order.orderId, userId:order.userId || "", customerEmail:order.customerEmail || "", courseId:order.courseId || "", courseTitle:order.courseTitle || "Course", amount:expected, transactionAmount:providerAmountPresent ? gateway.amount : null, paymentMethod:"payfast", providerStatusCode:gateway.code, providerStatusMessage:providerMessage(gateway), read:false, createdAt:now });
  return { status, verified, code:gateway.code, message:providerMessage(gateway), transactionId:gateway.transactionId || order.providerTransactionId || "" };
}

async function refundOrder(order, reason, req) {
  if (order.status !== "paid" || order.paymentVerified !== true) throw Object.assign(new Error("Only a verified paid order can be refunded."), { status: 400 });
  if (order.refundedAt || order.status === "refunded") throw Object.assign(new Error("This order has already been refunded."), { status: 409 });
  const transactionId = String(order.providerTransactionId || order.transactionId || "").trim(), amount = Number(order.finalAmount || 0);
  if (!transactionId) throw Object.assign(new Error("PayFast transaction ID is missing; refund cannot be initiated."), { status:400 });
  if (!Number.isFinite(amount) || amount <= 0) throw Object.assign(new Error("Invalid refund amount."), { status:400 });
  const token = await gatewayToken(order), tokenUrl = env("PAYFAST_TOKEN_URL", "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken"), baseUrl = env("PAYFAST_STATUS_BASE_URL", tokenUrl.replace(/\/GetAccessToken\/?$/i, ""));
  const response = await fetch(`${baseUrl}/transaction/refund/${encodeURIComponent(transactionId)}`, { method:"POST", headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/x-www-form-urlencoded","User-Agent":"Online-Academy-Payments/1.1"}, body:new URLSearchParams({txnamt:amount.toFixed(2),refund_reason:String(reason||"Refund").slice(0,200),customer_ip:clientIp(req)}) });
  const raw = await response.text(); let data = {}; try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0,500) }; }
  const code=String(data.code??data.CODE??data.status_code??data.STATUS_CODE??"").trim(), responseMessage=String(data.message??data.MESSAGE??data.status_msg??data.STATUS_MSG??"").trim();
  if(!response.ok || !successCode(code)) throw Object.assign(new Error(responseMessage || `PayFast refund failed (${response.status}).`), {status:400,providerCode:code});
  const now=new Date();
  await firestoreSet(`orders/${order.orderId}`, {...order,status:"refunded",paymentVerified:false,refundedAt:now,refundAmount:amount,refundReason:String(reason||"Refund").slice(0,200),refundProviderCode:code,refundProviderMessage:responseMessage||"Refund initiated successfully.",refundedBy:ADMIN_EMAIL,updatedAt:now});
  await firestoreSet(`adminNotifications/refund-${order.orderId}-${Date.now()}`, {type:"payment",event:"refund_initiated",title:"Payment refund initiated",message:`${order.courseTitle||"Course"} — ${money(amount)} refund initiated.`,orderId:order.orderId,userId:order.userId||"",customerEmail:order.customerEmail||"",amount,read:false,createdAt:now});
  await firestoreSet(`financeLogs/refund-${order.orderId}-${Date.now()}`, {action:"Payment refund initiated",details:`${order.orderId} — ${transactionId} — ${String(reason||"Refund")}`,amount:-amount,createdAt:now,actor:ADMIN_EMAIL});
  return {status:"refunded",amount,code,message:responseMessage||"Refund initiated successfully."};
}

async function listData() { const [orders,expenses,bills,services,logs]=await Promise.all([firestoreQuery("orders").catch(()=>[]),firestoreQuery("financeExpenses").catch(()=>[]),firestoreQuery("financeBills").catch(()=>[]),firestoreQuery("customServices").catch(()=>[]),firestoreQuery("financeLogs").catch(()=>[])]); const clean=(rows)=>rows.map(row=>({id:row.name?.split("/").pop()||"",...(row.fields||{})})); return {orders:clean(orders).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)),expenses:clean(expenses),bills:clean(bills),services:clean(services),logs:clean(logs).sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,100)}; }
export default async function handler(req,res){ try { await requireAdmin(req); if(req.method==="GET") return json(res,200,{ok:true,...(await listData())}); if(req.method!=="POST") return json(res,405,{error:"Method Not Allowed"}); const action=String(req.body?.action||"").trim(); if(!["verify","refund"].includes(action)) return json(res,400,{error:"Unknown payment action"}); const orderId=String(req.body?.orderId||"").trim(); if(!orderId) return json(res,400,{error:"Order ID is required"}); const orderDoc=await firestoreGet(`orders/${orderId}`); if(!orderDoc) return json(res,404,{error:"Order not found"}); const order=orderDoc.fields; const result=action==="verify"?await verifyOrder(order):await refundOrder(order,req.body?.reason,req); return json(res,200,{ok:true,orderId,...result}); } catch(error) { console.error("Admin finance error:",error?.message||error); return json(res,Number(error?.status)||500,{error:error?.message||"Unable to process finance request"}); } }
