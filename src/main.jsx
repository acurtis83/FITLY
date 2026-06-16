import "./storage.js"; // must run first: installs window.storage before the app hydrates
import "./index.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./Fitly.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
