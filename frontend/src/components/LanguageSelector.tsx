import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Search, X, Check } from "lucide-react";
import { LANGUAGES, applyLanguageDirection } from "../locales";
import { useApp } from "../context";

export function LanguageSelector({
  variant = "button",
  className = "",
}: {
  variant?: "button" | "select" | "inline";
  className?: string;
}) {
  const { i18n, t } = useTranslation();
  const { settings, setSettings, saveSettings } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentLang = useMemo(() => {
    return (
      LANGUAGES.find((l) => l.code === i18n.language) ||
      LANGUAGES.find((l) => l.code === "en")!
    );
  }, [i18n.language]);

  const filteredLanguages = useMemo(() => {
    if (!search.trim()) return LANGUAGES;
    const q = search.toLowerCase();
    return LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.native.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q),
    );
  }, [search]);

  const handleSelect = (code: string) => {
    i18n.changeLanguage(code);
    applyLanguageDirection(code);
    const nextSettings = { ...settings, language: code };
    setSettings(nextSettings);
    if (saveSettings) {
      saveSettings(nextSettings);
    } else {
      localStorage.setItem("recallx-language", code);
    }
    setIsOpen(false);
    setSearch("");
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (variant === "select") {
    return (
      <div className={"language-selector-wrap " + className}>
        <button
          type="button"
          className="lang-pill-btn"
          onClick={() => setIsOpen(true)}
          aria-label={t("chooseLanguage")}
        >
          <Globe size={18} />
          <span className="lang-native-text">{currentLang.native}</span>
          <span className="lang-code-text">({currentLang.name})</span>
        </button>
        {isOpen && (
          <LanguageModal
            currentCode={i18n.language}
            search={search}
            setSearch={setSearch}
            filteredLanguages={filteredLanguages}
            onSelect={handleSelect}
            onClose={() => setIsOpen(false)}
            inputRef={inputRef}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={"lang-pill-btn " + className}
        onClick={() => setIsOpen(true)}
        title={t("chooseLanguage")}
        aria-label={t("chooseLanguage")}
      >
        <Globe size={18} />
        <span>{currentLang.native}</span>
      </button>

      {isOpen && (
        <LanguageModal
          currentCode={i18n.language}
          search={search}
          setSearch={setSearch}
          filteredLanguages={filteredLanguages}
          onSelect={handleSelect}
          onClose={() => setIsOpen(false)}
          inputRef={inputRef}
        />
      )}
    </>
  );
}

function LanguageModal({
  currentCode,
  search,
  setSearch,
  filteredLanguages,
  onSelect,
  onClose,
  inputRef,
}: {
  currentCode: string;
  search: string;
  setSearch: (s: string) => void;
  filteredLanguages: typeof LANGUAGES;
  onSelect: (code: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation();

  return (
    <div className="lang-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="lang-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lang-modal-header">
          <div className="lang-modal-title">
            <Globe size={22} className="text-teal" />
            <div>
              <h3>{t("chooseLanguage")}</h3>
              <p>{t("searchLanguage")}</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label={t("close")}
          >
            <X size={20} />
          </button>
        </header>

        <div className="lang-search-box">
          <Search size={18} />
          <input
            ref={inputRef}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchLanguage")}
            aria-label={t("searchLanguage")}
          />
          {search && (
            <button
              type="button"
              className="lang-clear-btn"
              onClick={() => setSearch("")}
              aria-label="Clear"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="lang-list-scroll">
          <div className="lang-grid">
            {filteredLanguages.map((lang) => {
              const active = lang.code === currentCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  className={"lang-card-option " + (active ? "selected" : "")}
                  onClick={() => onSelect(lang.code)}
                >
                  <div className="lang-card-content">
                    <span className="lang-card-native">{lang.native}</span>
                    <span className="lang-card-en">{lang.name}</span>
                  </div>
                  {active && <Check size={18} className="lang-check-icon" />}
                  {lang.rtl && <span className="lang-rtl-badge">RTL</span>}
                </button>
              );
            })}
          </div>
          {filteredLanguages.length === 0 && (
            <div className="lang-no-results">
              <p>No matching languages found for "{search}"</p>
            </div>
          )}
        </div>

        <footer className="lang-modal-footer">
          <span>22 Scheduled Indian Languages + English supported</span>
          <button type="button" className="button secondary text-sm" onClick={onClose}>
            {t("close")}
          </button>
        </footer>
      </div>
    </div>
  );
}
