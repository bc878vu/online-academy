import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import App from "./App.jsx";

// Keep YouTube's IFrame API on a single, correctly initialized instance.
// The API's origin parameter is required for secure postMessage handling.
if (typeof window !== "undefined") {
  const installYouTubeOriginPatch = () => {
    if (!window.YT?.Player || window.__onlineAcademyYouTubePatched) {
      return;
    }

    const OriginalPlayer = window.YT.Player;
    const origin = window.location.origin;

    const PatchedPlayer = function (element, options = {}) {
      const nextOptions = {
        ...options,
        playerVars: {
          ...(options.playerVars || {}),
          enablejsapi: 1,
          origin,
        },
      };

      return new OriginalPlayer(element, nextOptions);
    };

    PatchedPlayer.prototype = OriginalPlayer.prototype;
    window.YT.Player = PatchedPlayer;
    window.__onlineAcademyYouTubePatched = true;
  };

  const previousReady = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    try {
      if (typeof previousReady === "function") {
        previousReady();
      }
    } finally {
      installYouTubeOriginPatch();
    }
  };

  if (!window.YT?.Player) {
    const existing = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]'
    );

    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
  } else {
    installYouTubeOriginPatch();
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
