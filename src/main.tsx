import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initTheme } from "./utils/theme";
import AppErrorBoundary from "./components/AppErrorBoundary";

document.documentElement.classList.add("js");
try {
  initTheme();
} catch (error) {
  console.error("Theme initialization failed:", error);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
