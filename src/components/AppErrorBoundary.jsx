import { Component } from "react";
import { RefreshCw, ShieldAlert } from "lucide-react";

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error("Online Academy runtime error:", error);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <ShieldAlert size={28} aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-950">Something went wrong</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            The page hit a temporary error. Your account and saved data are not changed by this screen.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20"
          >
            <RefreshCw size={17} aria-hidden="true" />
            Reload Online Academy
          </button>
        </section>
      </main>
    );
  }
}
