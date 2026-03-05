import { NavLink, Route, Routes } from "react-router-dom";
import TrackerPage from "./routes/TrackerPage";
import DailySummaryPage from "./routes/DailySummaryPage";
import IntervalReportPage from "./routes/IntervalReportPage";
import SettingsPage from "./routes/SettingsPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header no-print">
        <div className="brand">
          <div className="brand-title">Project Time Tracker</div>
          <div className="brand-subtitle">single-active, timestamp-based tracking</div>
        </div>

        <nav className="nav-list">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Tracker
          </NavLink>
          <NavLink
            to="/daily"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Daily
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Interval Report
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            Settings
          </NavLink>
        </nav>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<TrackerPage />} />
          <Route path="/daily" element={<DailySummaryPage />} />
          <Route path="/report" element={<IntervalReportPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
