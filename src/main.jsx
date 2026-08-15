import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import "./performance.css";
import "./modern-upgrades.css";
import App from "./App.jsx";
import AdminNotificationCenter from "./components/AdminNotificationCenter.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import GlobalProfessionalUX from "./components/GlobalProfessionalUX.jsx";
import UserEngagementHub from "./components/UserEngagementHub.jsx";

// YouTube's IFrame API is intentionally NOT loaded here.
// CourseDetails loads it only when a YouTube lesson is actually opened,
// keeping the landing page free from an unnecessary third-party request.

// Register a lightweight network-first service worker for app-shell resilience.
// API/sitemap routes are intentionally excluded so dynamic data is never cached by it.
if ("serviceWorker" in navigator && window.location.protocol === "https:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Service-worker support is progressive; the application works normally without it.
    });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <App />
        <GlobalProfessionalUX />
        <AdminNotificationCenter />
        <UserEngagementHub />
      </AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>
);
