/* WHAT IT DO? Frontend entrypoint that mounts the React app and route shell for PNYX V3. */

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PublicDataProvider } from "./context/PublicDataContext";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <PublicDataProvider>
        <App />
      </PublicDataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
