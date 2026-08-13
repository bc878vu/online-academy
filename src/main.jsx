import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

// Preload the YouTube IFrame API with the current site origin.
// This prevents the API from creating a player without the correct
// postMessage target origin when CourseDetails mounts.
if (typeof window !== "undefined") {
  const youtubeOrigin = window.location.origin;
  const existing = document.querySelector(
    'script[data-online-academy-youtube-api="true"]'
  );

  if (!existing && !window.YT?.Player) {
    const script = document.createElement("script");
    script.src = `https://www.youtube.com/iframe_api?origin=${encodeURIComponent(youtubeOrigin)}`;
    script.async = true;
    script.dataset.onlineAcademyYoutubeApi = "true";
    document.head.appendChild(script);
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
