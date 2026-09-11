import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LogOut,
  Settings as SettingsIcon,
  User,
  Users,
  ChevronDown,
  Activity,
  FileChartColumn,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "../context";

export function ProfileMenu() {
  const { t } = useTranslation();
  const { user, logout } = useApp();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  if (!user) return null;

  const isCaregiver = user.role === "caregiver";

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <button
        type="button"
        className="profile-menu-trigger"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="User profile menu"
      >
        <span className="avatar profile-avatar-chip">{user.name[0]}</span>
        <div className="profile-trigger-info">
          <span className="profile-trigger-name">{user.name}</span>
          <span className="profile-trigger-role">{t(user.role)}</span>
        </div>
        <ChevronDown size={16} className={"profile-chevron " + (open ? "rotate" : "")} />
      </button>

      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-header">
            <div className="avatar profile-avatar-lg">{user.name[0]}</div>
            <div className="profile-header-text">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
              <span className="badge role-badge">
                <ShieldCheck size={12} />
                {t(user.role)}
              </span>
            </div>
          </div>

          <div className="profile-dropdown-links">
            {isCaregiver ? (
              <>
                <Link
                  to="/caregiver/settings"
                  className="profile-dropdown-item"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <SettingsIcon size={17} />
                  <span>{t("accountSettings")}</span>
                </Link>
                <Link
                  to="/caregiver/family"
                  className="profile-dropdown-item"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <Users size={17} />
                  <span>{t("familyLibrary")}</span>
                </Link>
                <Link
                  to="/caregiver/reports"
                  className="profile-dropdown-item"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <FileChartColumn size={17} />
                  <span>{t("reports")}</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/patient/profile"
                  className="profile-dropdown-item"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <User size={17} />
                  <span>{t("profile")}</span>
                </Link>
                <Link
                  to="/patient/progress"
                  className="profile-dropdown-item"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <Activity size={17} />
                  <span>{t("progress")}</span>
                </Link>
                <Link
                  to="/patient/settings"
                  className="profile-dropdown-item"
                  onClick={() => setOpen(false)}
                  role="menuitem"
                >
                  <SettingsIcon size={17} />
                  <span>{t("settings")}</span>
                </Link>
              </>
            )}
          </div>

          <div className="profile-dropdown-footer">
            <button
              type="button"
              className="profile-logout-btn"
              onClick={handleLogout}
              role="menuitem"
            >
              <LogOut size={17} />
              <span>{t("logout")}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
