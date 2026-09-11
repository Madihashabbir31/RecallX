import {
  Routes,
  Route,
  Navigate,
  Outlet,
  NavLink,
  Link,
  useParams,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Home as HomeIcon,
  Brain,
  CalendarDays,
  Mic,
  User,
  Users,
  Pill,
  Activity,
  Bell,
  FileChartColumn,
  Settings as SettingsIcon,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { useApp } from "./context";
import {
  Brand,
  LoadingState,
  SecondaryButton,
  EmptyState,
} from "./components/ui";
import { LanguageSelector } from "./components/LanguageSelector";
import { ProfileMenu } from "./components/ProfileMenu";
import Auth from "./pages/Auth";
import {
  Home,
  GamesHub,
  Routine,
  Medications,
  Family,
  Progress,
  Voice,
  Settings,
  Profile,
} from "./pages/Patient";
import Game from "./pages/Game";
import { Dashboard, Manage, Alerts, Reports } from "./pages/Caregiver";
import { WebTools } from "./components/WebTools";
import { syncQueue } from "./services/api";

const patientNav = [
  ["", "home", HomeIcon],
  ["games", "games", Brain],
  ["routine", "routine", CalendarDays],
  ["voice", "voice", Mic],
  ["profile", "profile", User],
] as const;

const careNav = [
  ["", "overview", HomeIcon],
  ["routine", "dailyRoutine", CalendarDays],
  ["medications", "medications", Pill],
  ["progress", "cognitiveProgress", Activity],
  ["alerts", "alerts", Bell],
  ["family", "familyLibrary", Users],
  ["reports", "reports", FileChartColumn],
  ["settings", "settings", SettingsIcon],
] as const;

function Layout({ role }: { role: "patient" | "caregiver" }) {
  const { t } = useTranslation();
  const {
    user,
    data,
    loading,
    error,
    refresh,
    online,
    pending,
    setToast,
  } = useApp();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={"/" + user.role} replace />;

  const caregiver = role === "caregiver";

  return (
    <div className={"app-shell " + (caregiver ? "caregiver" : "patient")}>
      <aside className="sidebar">
        <div className="sidebar-top-fixed">
          <Brand />
          <div className="sidebar-subtitle">
            {caregiver ? t("careCircle").toUpperCase() : t("rememberReconnect")}
          </div>
        </div>

        <div className="sidebar-scroll-area">
          <nav aria-label="Main navigation" className="sidebar-main-nav">
            {(caregiver ? careNav : patientNav).map(([path, key, Icon]) => (
              <NavLink
                end={!path}
                key={path}
                to={`/${role}${path ? "/" + path : ""}`}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <Icon size={20} className="nav-icon" />
                <span className="nav-label">{t(key)}</span>
                {path === "alerts" &&
                  !!data?.alerts?.filter((a: any) => !a.read).length && (
                    <b className="nav-alert-badge">
                      {data.alerts.filter((a: any) => !a.read).length}
                    </b>
                  )}
              </NavLink>
            ))}
          </nav>

          {!caregiver && (
            <nav className="secondary-nav" aria-label="Additional patient navigation">
              <NavLink to="/patient/family">
                <Users size={19} className="nav-icon" />
                <span className="nav-label">{t("family")}</span>
              </NavLink>
              <NavLink to="/patient/medications">
                <Pill size={19} className="nav-icon" />
                <span className="nav-label">{t("medications")}</span>
              </NavLink>
              <NavLink to="/patient/progress">
                <Activity size={19} className="nav-icon" />
                <span className="nav-label">{t("progress")}</span>
              </NavLink>
              <NavLink to="/patient/settings">
                <SettingsIcon size={19} className="nav-icon" />
                <span className="nav-label">{t("settings")}</span>
              </NavLink>
            </nav>
          )}
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <span className="topbar-title">
              {caregiver ? t("caregiverSpace") : t("gentle")}
            </span>
          </div>

          <div className="topbar-right">
            {user.demo_mode && (
              <span className="demo-label">{t("sample")}</span>
            )}
            <LanguageSelector />
            <ProfileMenu />
          </div>
        </header>

        {(!online || pending > 0) && (
          <div className="offline-banner">
            <WifiOff size={18} />
            <span>
              {!online ? t("offline") : `${pending} activities waiting to sync.`}
            </span>
            {online && pending > 0 && (
              <button
                type="button"
                onClick={() =>
                  syncQueue(user.id)
                    .then(refresh)
                    .catch((e: any) => setToast(e.message))
                }
              >
                <RefreshCw size={16} />
                {t("sync")}
              </button>
            )}
          </div>
        )}

        <main id="main-content" className="content">
          {loading && !data ? (
            <LoadingState />
          ) : error && !data ? (
            <div className="error-state">
              <p role="alert">{error}</p>
              <SecondaryButton onClick={refresh}>{t("retry")}</SecondaryButton>
            </div>
          ) : data ? (
            <Outlet />
          ) : (
            <EmptyState text="No linked patient. Contact your account administrator." />
          )}
        </main>

        <footer className="app-footer">
          <div>
            Recall<strong>X</strong> <span>{t("brandSubtitle")}</span>
          </div>
          <div className="footer-tagline">{t("tagline")}</div>
        </footer>
      </div>

      {/* Mobile bottom nav for patient */}
      {!caregiver && (
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {patientNav.map(([path, key, Icon]) => (
            <NavLink
              end={!path}
              key={path}
              to={"/patient" + (path ? "/" + path : "")}
            >
              <Icon size={20} />
              <span>{t(key)}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

function GameRedirect() {
  const { type } = useParams();
  return <Navigate to={`/patient/games/${type || ""}`} replace />;
}

export default function App() {
  const { user } = useApp();
  const { t } = useTranslation();

  return (
    <>
      <WebTools />
      <a className="skip-link" href="#main-content">
        {t("skipToContent")}
      </a>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={user ? "/" + user.role : "/login"} replace />}
        />
        <Route
          path="/login"
          element={user ? <Navigate to={"/" + user.role} replace /> : <Auth />}
        />
        <Route path="/games" element={<Navigate to="/patient/games" replace />} />
        <Route path="/games/:type" element={<GameRedirect />} />
        <Route path="/patient" element={<Layout role="patient" />}>
          <Route index element={<Home />} />
          <Route path="games" element={<GamesHub />} />
          <Route path="games/:type" element={<Game />} />
          <Route path="routine" element={<Routine />} />
          <Route path="medications" element={<Medications />} />
          <Route path="family" element={<Family />} />
          <Route path="progress" element={<Progress />} />
          <Route path="voice" element={<Voice />} />
          <Route path="profile" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="accessibility" element={<Settings />} />
        </Route>
        <Route path="/caregiver" element={<Layout role="caregiver" />}>
          <Route index element={<Dashboard />} />
          <Route path="routine" element={<Manage kind="routine" />} />
          <Route path="medications" element={<Manage kind="medications" />} />
          <Route path="family" element={<Manage kind="family" />} />
          <Route path="progress" element={<Progress caregiver />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route
          path="*"
          element={
            <div className="empty">
              <h1>{t("unknown")}</h1>
              <Link to="/" className="button primary">
                {t("goHome")}
              </Link>
            </div>
          }
        />
      </Routes>
    </>
  );
}
