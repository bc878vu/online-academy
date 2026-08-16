import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Download,
  MessageSquareText,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  Settings2,
  Smartphone,
  Trash2,
  Video,
  WalletCards,
} from "lucide-react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const DEFAULT_SERVICES = [
  { id: "jazzcash-easypaisa", name: "JazzCash / Easypaisa Auto Integration", description: "Automatic payment collection and payment-status integration.", price: 15000, icon: Smartphone },
  { id: "zoom-live-classes", name: "Zoom Live Classes", description: "Live class scheduling, meeting links and course integration.", price: 10000, icon: Video },
  { id: "sms-alerts", name: "SMS Alerts", description: "Enrollment, payment, class and result notification setup.", price: 7500, icon: MessageSquareText },
];

function money(value) {
  return `Rs. ${Math.round(Number(value || 0)).toLocaleString("en-PK")}`;
}

function asDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value) {
  const date = asDate(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

function inRange(value, from, to) {
  const key = dateKey(value);
  if (!key) return false;
  return (!from || key >= from) && (!to || key <= to);
}

function downloadCsv(filename, rows) {
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function AdminFinance() {
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [logs, setLogs] = useState([]);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expenseForm, setExpenseForm] = useState({ category: "Hosting", description: "", amount: "", date: dateKey(new Date()) });
  const [billForm, setBillForm] = useState({ customerName: "", customerEmail: "", service: DEFAULT_SERVICES[0].name, amount: DEFAULT_SERVICES[0].price, status: "paid", date: dateKey(new Date()) });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orderSnap, expenseSnap, billSnap, logSnap, serviceSnap] = await Promise.all([
        getDocs(collection(db, "orders")),
        getDocs(collection(db, "financeExpenses")),
        getDocs(collection(db, "financeBills")),
        getDocs(collection(db, "financeLogs")),
        getDocs(collection(db, "customServices")),
      ]);
      setOrders(orderSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setExpenses(expenseSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setBills(billSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      setLogs(logSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      const stored = serviceSnap.docs.reduce((acc, item) => ({ ...acc, [item.id]: { id: item.id, ...item.data() } }), {});
      setServices(DEFAULT_SERVICES.map((item) => ({ ...item, ...(stored[item.id] || {}) })));
    } catch (error) {
      console.error("Finance load error:", error);
      setMessage("Unable to load finance data. Make sure you are signed in as admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredOrders = useMemo(() => orders.filter((item) => inRange(item.paidAt || item.createdAt, from, to)), [orders, from, to]);
  const filteredBills = useMemo(() => bills.filter((item) => inRange(item.date || item.createdAt, from, to)), [bills, from, to]);
  const filteredExpenses = useMemo(() => expenses.filter((item) => inRange(item.date || item.createdAt, from, to)), [expenses, from, to]);

  const paidCourseRevenue = useMemo(() => filteredOrders.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.finalAmount || 0), 0), [filteredOrders]);
  const paidServiceRevenue = useMemo(() => filteredBills.filter((item) => item.status === "paid").reduce((sum, item) => sum + Number(item.amount || 0), 0), [filteredBills]);
  const totalRevenue = paidCourseRevenue + paidServiceRevenue;
  const totalExpenses = useMemo(() => filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0), [filteredExpenses]);
  const profit = totalRevenue - totalExpenses;
  const pendingOrders = filteredOrders.filter((item) => item.status !== "paid").reduce((sum, item) => sum + Number(item.finalAmount || 0), 0);
  const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  const log = async (action, details, amount = 0) => {
    await addDoc(collection(db, "financeLogs"), { action, details, amount: Number(amount || 0), createdAt: serverTimestamp() });
  };

  const addExpense = async (event) => {
    event.preventDefault();
    const amount = Number(expenseForm.amount || 0);
    if (!expenseForm.description.trim() || amount <= 0) return setMessage("Enter an expense description and a valid amount.");
    setSaving(true); setMessage("");
    try {
      await addDoc(collection(db, "financeExpenses"), { ...expenseForm, amount, createdAt: serverTimestamp() });
      await log("Expense added", `${expenseForm.category}: ${expenseForm.description}`, amount);
      setExpenseForm({ category: "Hosting", description: "", amount: "", date: dateKey(new Date()) });
      setMessage("Expense saved and profit recalculated automatically.");
      await load();
    } catch (error) { console.error(error); setMessage("Unable to save expense."); } finally { setSaving(false); }
  };

  const addBill = async (event) => {
    event.preventDefault();
    const amount = Number(billForm.amount || 0);
    if (!billForm.customerName.trim() || amount <= 0) return setMessage("Enter customer name and a valid bill amount.");
    setSaving(true); setMessage("");
    try {
      const ref = await addDoc(collection(db, "financeBills"), { ...billForm, amount, createdAt: serverTimestamp() });
      await log("Service bill created", `${billForm.customerName} — ${billForm.service}`, billForm.status === "paid" ? amount : 0);
      setBillForm({ ...billForm, customerName: "", customerEmail: "", amount: "", date: dateKey(new Date()) });
      setMessage(`Bill ${ref.id} saved. Paid bills are included in revenue automatically.`);
      await load();
    } catch (error) { console.error(error); setMessage("Unable to save service bill."); } finally { setSaving(false); }
  };

  const removeExpense = async (item) => {
    if (!window.confirm(`Delete expense ${item.description}?`)) return;
    try { await deleteDoc(doc(db, "financeExpenses", item.id)); await log("Expense deleted", item.description, -Number(item.amount || 0)); await load(); } catch (error) { console.error(error); setMessage("Unable to delete expense."); }
  };

  const saveService = async (service) => {
    try {
      await setDoc(doc(db, "customServices", service.id), { name: service.name, description: service.description, price: Math.max(0, Number(service.price || 0)), active: service.active !== false, updatedAt: serverTimestamp() }, { merge: true });
      await log("Custom service pricing updated", `${service.name}: ${money(service.price)}`);
      setMessage(`${service.name} settings saved.`);
      await load();
    } catch (error) { console.error(error); setMessage("Unable to save service settings."); }
  };

  const reportRows = [
    ["Date", "Type", "Reference", "Customer / Description", "Status", "Amount (PKR)"],
    ...filteredOrders.map((item) => [dateKey(item.paidAt || item.createdAt), "Course Sale", item.orderId || item.id, item.courseTitle || item.customerEmail || "Course", item.status || "pending", Number(item.finalAmount || 0)]),
    ...filteredBills.map((item) => [dateKey(item.date || item.createdAt), "Custom Service", item.id, `${item.customerName}${item.customerEmail ? ` (${item.customerEmail})` : ""}`, item.status || "pending", Number(item.amount || 0)]),
    ...filteredExpenses.map((item) => [dateKey(item.date || item.createdAt), "Expense", item.id, `${item.category}: ${item.description}`, "paid", -Number(item.amount || 0)]),
  ];

  return (
    <main className="min-h-[calc(100vh-72px)] bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-sm font-black uppercase tracking-wider text-blue-600">Admin Finance</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">Billing, Logs & Profit</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">All paid course orders, custom-service bills and expenses are collected here. Revenue, expenses, profit and margin are calculated automatically.</p></div>
          <button onClick={load} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm"><RefreshCw size={17} /> Refresh</button>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
          <label className="text-xs font-black uppercase tracking-wider text-slate-500">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-800" /></label>
          <label className="text-xs font-black uppercase tracking-wider text-slate-500">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-800" /></label>
          <button onClick={() => { setFrom(""); setTo(""); }} className="self-end rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-black text-slate-700">Show All History</button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Course Revenue", paidCourseRevenue, CreditCard, "text-blue-700 bg-blue-50"],
            ["Service Revenue", paidServiceRevenue, WalletCards, "text-violet-700 bg-violet-50"],
            ["Total Revenue", totalRevenue, ArrowUpRight, "text-emerald-700 bg-emerald-50"],
            ["Total Expenses", totalExpenses, ArrowDownRight, "text-amber-700 bg-amber-50"],
            ["Net Profit", profit, Banknote, profit >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"],
          ].map(([label, value, Icon, style]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style}`}><Icon size={19} /></div><p className="mt-4 text-xs font-black uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{money(value)}</p></article>)}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Profit Margin</p><p className={`mt-1 text-xl font-black ${profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>{margin.toFixed(1)}%</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Pending Orders</p><p className="mt-1 text-xl font-black text-amber-700">{money(pendingOrders)}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-400">Calculation</p><p className="mt-1 text-sm font-black text-slate-800">Revenue − Expenses = Profit</p><p className="text-xs text-slate-500">{money(totalRevenue)} − {money(totalExpenses)} = {money(profit)}</p></div>
        </div>

        {message && <div className="mt-5 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm font-bold text-blue-800"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{message}</div>}

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-blue-600">Custom Features</p><h2 className="mt-1 text-xl font-black text-slate-950">Extra services & client charges</h2><p className="mt-1 text-sm text-slate-500">These are configurable implementation charges. Actual JazzCash/Easypaisa, Zoom or SMS provider credentials can be connected later.</p></div></div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {services.map((service) => { const Icon = service.icon || Settings2; return <article key={service.id} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm"><Icon size={19} /></div><div className="min-w-0 flex-1"><h3 className="text-sm font-black text-slate-900">{service.name}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{service.description}</p></div></div><div className="mt-4 grid gap-3"><label className="text-xs font-black text-slate-600">Extra Charge (PKR)<input type="number" min="0" value={service.price} onChange={(e) => setServices((items) => items.map((x) => x.id === service.id ? { ...x, price: e.target.value } : x))} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black" /></label><label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={service.active !== false} onChange={(e) => setServices((items) => items.map((x) => x.id === service.id ? { ...x, active: e.target.checked } : x))} /> Available for sale</label><button onClick={() => saveService(service)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-black text-white"><Save size={15} /> Save Service</button></div></article>; })}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><ArrowDownRight size={19} /></div><div><h2 className="font-black text-slate-950">Add Expense</h2><p className="text-xs text-slate-500">Hosting, domain, ads, staff, SMS provider, Zoom, maintenance, etc.</p></div></div><form onSubmit={addExpense} className="mt-5 grid gap-3"><select value={expenseForm.category} onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option>Hosting</option><option>Domain</option><option>Advertising</option><option>Staff</option><option>SMS Provider</option><option>Zoom</option><option>Development</option><option>Other</option></select><input value={expenseForm.description} onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })} placeholder="Expense description" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold" /><div className="grid gap-3 sm:grid-cols-2"><input type="number" min="0" value={expenseForm.amount} onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })} placeholder="Amount PKR" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold" /><input type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold" /></div><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Plus size={17} /> Add Expense</button></form></section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-2.5 text-violet-700"><ReceiptText size={19} /></div><div><h2 className="font-black text-slate-950">Add Client Service Bill</h2><p className="text-xs text-slate-500">Record extra integration charges; paid bills become service revenue.</p></div></div><form onSubmit={addBill} className="mt-5 grid gap-3"><input value={billForm.customerName} onChange={(e) => setBillForm({ ...billForm, customerName: e.target.value })} placeholder="Client / customer name" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold" /><input value={billForm.customerEmail} onChange={(e) => setBillForm({ ...billForm, customerEmail: e.target.value })} placeholder="Email (optional)" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold" /><select value={billForm.service} onChange={(e) => { const service = services.find((x) => x.name === e.target.value); setBillForm({ ...billForm, service: e.target.value, amount: service?.price || billForm.amount }); }} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold">{services.filter((item) => item.active !== false).map((item) => <option key={item.id}>{item.name}</option>)}</select><div className="grid gap-3 sm:grid-cols-3"><input type="number" min="0" value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} placeholder="Amount" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold" /><select value={billForm.status} onChange={(e) => setBillForm({ ...billForm, status: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold"><option value="paid">Paid</option><option value="pending">Pending</option></select><input type="date" value={billForm.date} onChange={(e) => setBillForm({ ...billForm, date: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold" /></div><button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"><Plus size={17} /> Add Service Bill</button></form></section>
        </div>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-black text-slate-950">Billing & Transaction Report</h2><p className="text-sm text-slate-500">Courses, custom services and expenses in one exportable report.</p></div><button onClick={() => downloadCsv(`online-academy-finance-${dateKey(new Date())}.csv`, reportRows)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700"><Download size={16} /> Export CSV</button></div>
          {loading ? <div className="py-12 text-center"><RefreshCw className="mx-auto animate-spin text-blue-600" /></div> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">{reportRows[0].map((head) => <th key={head} className="px-3 py-3 font-black">{head}</th>)}</tr></thead><tbody>{reportRows.slice(1).sort((a, b) => String(b[0]).localeCompare(String(a[0]))).slice(0, 100).map((row, index) => <tr key={`${row[2]}-${index}`} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold">{row[0]}</td><td className="px-3 py-3 font-bold">{row[1]}</td><td className="px-3 py-3 text-xs text-slate-500">{row[2]}</td><td className="px-3 py-3">{row[3]}</td><td className="px-3 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black">{row[4]}</span></td><td className={`px-3 py-3 font-black ${Number(row[5]) >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(row[5])}</td></tr>)}</tbody></table></div>}
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><Activity className="text-blue-600" /><div><h2 className="font-black text-slate-950">Expense Log</h2><p className="text-xs text-slate-500">Recent business costs affecting profit.</p></div></div><div className="mt-4 space-y-2">{filteredExpenses.slice().sort((a,b) => dateKey(b.date || b.createdAt).localeCompare(dateKey(a.date || a.createdAt))).slice(0, 20).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-800">{item.description}</p><p className="text-xs text-slate-400">{item.category} · {dateKey(item.date || item.createdAt)}</p></div><strong className="text-sm text-red-700">−{money(item.amount)}</strong><button onClick={() => removeExpense(item)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete expense"><Trash2 size={15} /></button></div>)}{filteredExpenses.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No expenses in this period.</p>}</div></section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center gap-3"><Activity className="text-violet-600" /><div><h2 className="font-black text-slate-950">Activity Logs</h2><p className="text-xs text-slate-500">Finance actions and billing changes.</p></div></div><div className="mt-4 space-y-2">{logs.slice().sort((a,b) => { const da = asDate(a.createdAt)?.getTime() || 0; const db = asDate(b.createdAt)?.getTime() || 0; return db - da; }).slice(0, 25).map((item) => <div key={item.id} className="rounded-xl bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><p className="text-sm font-black text-slate-800">{item.action}</p><span className="text-xs font-bold text-slate-400">{dateKey(item.createdAt)}</span></div><p className="mt-1 text-xs text-slate-500">{item.details}</p>{Number(item.amount) !== 0 && <p className={`mt-1 text-xs font-black ${Number(item.amount) > 0 ? "text-emerald-700" : "text-red-700"}`}>{money(item.amount)}</p>}</div>)}{logs.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No activity yet.</p>}</div></section>
        </div>

        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm leading-6 text-blue-900"><strong>How profit works:</strong> Paid course orders + paid custom-service bills = total revenue. Hosting, domain, advertising, staff, provider and other saved expenses are deducted automatically. The resulting amount is your current net profit for the selected date range.</div>
      </div>
    </main>
  );
}
