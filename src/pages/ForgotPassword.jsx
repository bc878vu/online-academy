import { Link } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";

function ForgotPassword() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-md items-center justify-center">
        <div className="w-full rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600">
            <ArrowLeft size={17} />
            Back to Login
          </Link>
          <div className="mt-8">
            <h1 className="text-3xl font-bold text-slate-900">Forgot Password?</h1>
            <p className="mt-3 leading-6 text-slate-600">Enter your email address and we'll send you a password reset link.</p>
          </div>
          <form className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" placeholder="you@example.com" className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>
            </div>
            <button type="submit" className="w-full rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700">Send Reset Link</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">Remember your password? <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">Login</Link></p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
