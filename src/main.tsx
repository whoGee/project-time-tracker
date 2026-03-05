import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./print.css";
import { TrackerProvider } from "./context/TrackerContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TrackerProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </TrackerProvider>
  </React.StrictMode>
);
