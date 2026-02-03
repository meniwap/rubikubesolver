import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, type ReactNode } from "react";
import { PlayPage } from "./pages/PlayPage";
import { LearnPage } from "./pages/LearnPage";
import { EnterCubePage } from "./pages/EnterCubePage";
import { SettingsPage } from "./pages/SettingsPage";
import { useGameStore } from "./state/gameStore";

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <Main />
      <BottomNav />
    </div>
  );
}

function Main() {
  const location = useLocation();
  const setMode = useGameStore((s) => s.setMode);

  useEffect(() => {
    if (location.pathname.startsWith("/learn")) setMode("learn");
    else setMode("play");
  }, [location.pathname, setMode]);

  return (
    <div className="flex-1 overflow-auto">
      <Routes>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route path="/play" element={<PlayPage />} />
        <Route path="/learn" element={<LearnPage />} />
        <Route path="/scan" element={<EnterCubePage />} />
        <Route path="/enter" element={<Navigate to="/scan" replace />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/play" replace />} />
      </Routes>
    </div>
  );
}

function BottomNav() {
  return (
    <nav className="glass-card-dark border-t border-white/10 safe-area-bottom">
      <div className="mx-auto flex w-full max-w-lg items-center justify-around px-2 py-2">
        <NavItem to="/play" label="משחק" icon={<PlayIcon />} />
        <NavItem to="/learn" label="לימוד" icon={<LearnIcon />} />
        <NavItem to="/scan" label="סריקה" icon={<ScanIcon />} />
        <NavItem to="/settings" label="הגדרות" icon={<SettingsIcon />} />
      </div>
    </nav>
  );
}

function NavItem(props: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        `group relative flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-white shadow-lg"
            : "text-white/60 hover:bg-white/5 hover:text-white/80"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
            {props.icon}
          </span>
          <span className={`text-[11px] font-medium ${isActive ? "text-white" : ""}`}>
            {props.label}
          </span>
          {isActive && (
            <span className="absolute -bottom-0.5 h-0.5 w-8 rounded-full bg-gradient-to-r from-purple-400 to-blue-400" />
          )}
        </>
      )}
    </NavLink>
  );
}

// Icons as SVG components
function PlayIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" opacity="0.2" />
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function LearnIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" fill="currentColor" opacity="0.2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
