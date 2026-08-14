import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import "./performance.css";
import App from "./App.jsx";
import AdminNotificationCenter from "./components/AdminNotificationCenter.jsx";

// YouTube's IFrame API is intentionally NOT loaded here.
// CourseDetails loads it only when a YouTube lesson is actually opened,
// keeping the landing page free from an unnecessary third-party request.

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <AdminNotificationCenter />
    </BrowserRouter>
  </StrictMode>
);
