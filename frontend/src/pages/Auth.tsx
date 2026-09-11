import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Brain,
  HeartHandshake,
  ArrowRight,
  ShieldCheck,
  Globe,
  Sun,
  Lock,
  Mail,
  MoreHorizontal,
} from "lucide-react";
import { Brand, PrimaryButton, SecondaryButton } from "../components/ui";
import { LanguageSelector } from "../components/LanguageSelector";
import { authService } from "../services/api";
import { useApp } from "../context";
import { applyLanguageDirection } from "../locales";

export default function Auth() {
  const { t, i18n } = useTranslation();
  const { login, setSettings, settings } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { register, handleSubmit } = useForm<{
    email: string;
    password: string;
  }>();

  async function enter(
    role?: string,
    values?: { email: string; password: string },
  ) {
    setBusy(true);
    setError("");
    try {
      const result = role
        ? await authService.demo(role)
        : await authService.login(values!.email, values!.password);
      await login(result);
      navigate("/" + result.user.role);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const handleQuickLang = (code: string) => {
    i18n.changeLanguage(code);
    applyLanguageDirection(code);
    setSettings({ ...settings, language: code });
    localStorage.setItem("recallx-language", code);
  };

  const quickLangs = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिन्दी" },
    { code: "bn", name: "বাংলা" },
    { code: "mr", name: "मराठी" },
    { code: "ur", name: "اردو" },
    { code: "ta", name: "தமிழ்" },
    { code: "te", name: "తెలుగు" },
  ];

  return (
    <div className="auth-page">
      <header className="auth-header">
        <Brand />
        <div className="auth-header-right">
          <LanguageSelector />
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-story">
          <span className="eyebrow">
            <Sun size={16} /> {t("brandSubtitle").toUpperCase()}
          </span>
          <h1>{t("welcome")}</h1>
          <p>{t("intro")}</p>

          <div className="auth-art">
            <div className="brain-circle">
              <Brain size={110} strokeWidth={1.2} />
            </div>
            <div className="floating-label">
              <HeartHandshake size={22} className="text-teal" />
              <span>{t("careCircle")}</span>
            </div>
          </div>

          <p className="auth-note">{t("smallSteps")}</p>
        </div>

        <section className="auth-card">
          <div className="auth-card-eyebrow">RECALLX PLATFORM</div>
          <h2>{t("chooseLanguage")}</h2>

          <div className="auth-language-selector-section">
            <div className="language-options-chips">
              {quickLangs.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  className={
                    "lang-chip-btn " +
                    (i18n.language === lang.code ? "selected" : "")
                  }
                  onClick={() => handleQuickLang(lang.code)}
                >
                  {lang.name}
                </button>
              ))}
              <LanguageSelector variant="select" className="inline-lang-select" />
            </div>
          </div>

          <div className="divider" />

          <div className="auth-actions">
            <PrimaryButton
              disabled={busy}
              onClick={() => enter("patient")}
              className="auth-demo-btn"
            >
              <Brain size={20} />
              <span>{t("patientDemo")}</span>
              <ArrowRight size={18} className="ms-auto" />
            </PrimaryButton>

            <SecondaryButton
              disabled={busy}
              onClick={() => enter("caregiver")}
              className="auth-demo-btn"
            >
              <HeartHandshake size={20} />
              <span>{t("caregiverDemo")}</span>
              <ArrowRight size={18} className="ms-auto" />
            </SecondaryButton>
          </div>

          <p className="muted demo-note">{t("sample")}</p>

          <button
            type="button"
            className="text-link auth-signin-toggle"
            onClick={() => setShowForm(!showForm)}
          >
            {t("signIn")} {showForm ? "−" : "+"}
          </button>

          {showForm && (
            <form onSubmit={handleSubmit((v) => enter(undefined, v))} className="auth-form">
              <label>
                <div className="form-label-with-icon">
                  <Mail size={15} />
                  <span>{t("email")}</span>
                </div>
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  {...register("email", { required: true })}
                />
              </label>

              <label>
                <div className="form-label-with-icon">
                  <Lock size={15} />
                  <span>{t("password")}</span>
                </div>
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  {...register("password", { required: true })}
                />
              </label>

              <PrimaryButton disabled={busy} className="w-full">
                {t("signIn")}
              </PrimaryButton>
            </form>
          )}

          {error && (
            <p role="alert" className="error auth-error-alert">
              {error}
            </p>
          )}

          <div className="auth-foot">
            <ShieldCheck size={18} className="text-teal" />
            <span>{t("notMedical")}</span>
          </div>
        </section>
      </main>

      <footer className="auth-footer">
        <div>RecallX <span>{t("brandSubtitle")}</span></div>
        <div className="footer-tagline">{t("tagline")}</div>
      </footer>
    </div>
  );
}
