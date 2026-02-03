import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
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
    <nav className="border-t border-white/10 bg-black/20">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-around px-4 py-3 text-sm">
        <NavItem to="/play" label="Play" />
        <NavItem to="/learn" label="Learn" />
        <NavItem to="/scan" label="Scan" />
        <NavItem to="/settings" label="Settings" />
      </div>
    </nav>
  );
}

function NavItem(props: { to: string; label: string }) {
  return (
    <NavLink
      to={props.to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 font-semibold ${isActive ? "bg-white/15" : "bg-white/5 hover:bg-white/10"}`
      }
    >
      {props.label}
    </NavLink>
  );
}
