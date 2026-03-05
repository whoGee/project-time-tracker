import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./print.css";
import { TrackerProvider } from "./context/TrackerContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrackerProvider>
      <HashRouter>
        <App />
      </HashRouter>
    </TrackerProvider>
  </React.StrictMode>
);
