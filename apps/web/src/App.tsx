import { NavLink, Route, Routes } from "react-router-dom";
import WebApp from "@twa-dev/sdk";
import { useEffect, useMemo, useState } from "react";
import DiagnosticsDrawer from "./components/DiagnosticsDrawer";
import Home from "./pages/Home";
import User from "./pages/User";
import Admin from "./pages/Admin";
import Orgs from "./pages/Orgs";
import GetEligible from "./pages/GetEligible";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/user", label: "User" },
  { to: "/admin", label: "Admin" },
  { to: "/orgs", label: "Orgs" },
  { to: "/get-eligible", label: "Get Eligible" },
];

export default function App() {
  const [webAppReady, setWebAppReady] = useState(false);

  useEffect(() => {
    WebApp.ready();
    setWebAppReady(true);
  }, []);

  const diagnostics = useMemo(
    () => ({
      ready: webAppReady,
      version: WebApp.version,
      platform: WebApp.platform,
      colorScheme: WebApp.colorScheme,
      initData: WebApp.initData,
      initDataUnsafe: WebApp.initDataUnsafe,
      viewportHeight: WebApp.viewportHeight,
      viewportStableHeight: WebApp.viewportStableHeight,
    }),
    [webAppReady]
  );

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Gater Robot</p>
          <h1>Mini App Shell</h1>
        </div>
        <nav className="nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "nav-link nav-link-active" : "nav-link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/user" element={<User />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/orgs" element={<Orgs />} />
          <Route path="/get-eligible" element={<GetEligible />} />
        </Routes>
      </main>

      <DiagnosticsDrawer diagnostics={diagnostics} />
    </div>
  );
}
