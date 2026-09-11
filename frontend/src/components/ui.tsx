import { ReactNode, useEffect, useRef } from "react";
import { Brain, ArrowRight, Check, LoaderCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
export function Brand() {
  return (
    <Link to="/" className="brand">
      <Brain size={38} strokeWidth={1.6} />
      <span>
        Recall<span className="brand-x">X</span>
      </span>
    </Link>
  );
}
export function RecallCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={"card " + className}>{children}</div>;
}
export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} className={"button primary " + (props.className || "")}>
      {children}
    </button>
  );
}
export function SecondaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={"button secondary " + (props.className || "")}
    >
      {children}
    </button>
  );
}
export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={"badge " + status}>
      {["completed", "taken", "done"].includes(status) && <Check size={14} />}{" "}
      {t(status === "completed" ? "done" : status)}
    </span>
  );
}
export function ProgressRing({
  value,
  label,
}: {
  value: number;
  label?: string;
}) {
  return (
    <div className="ring-wrap">
      <div
        className="ring"
        style={{
          background: `conic-gradient(var(--teal) ${value}%, var(--sage-light) 0)`,
        }}
      >
        <div>
          <strong>{value}%</strong>
          {label && <span>{label}</span>}
        </div>
      </div>
    </div>
  );
}
export function SectionHeader({
  title,
  to,
  children,
}: {
  title: string;
  to?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {to && (
        <Link className="text-link" to={to}>
          {t("viewAll")} <ArrowRight size={16} />
        </Link>
      )}
      {children}
    </div>
  );
}
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
export function EmptyState({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="empty">
      <Brain size={38} />
      <p>{text || t("empty")}</p>
    </div>
  );
}
export function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" />
      <p>{t("loading")}</p>
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { t } = useTranslation();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    const close = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    d?.addEventListener("cancel", close);
    return () => {
      d?.removeEventListener("cancel", close);
      d?.close();
    };
  }, []);
  return (
    <dialog ref={ref} className="modal">
      <header>
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label={t("close")}
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      {children}
    </dialog>
  );
}
export const StatCard = ({
  icon: Icon,
  label,
  value,
  tone = "sage",
}: {
  icon: any;
  label: string;
  value: ReactNode;
  tone?: string;
}) => (
  <RecallCard className="stat">
    <span className={"icon-tile " + tone}>
      <Icon size={23} />
    </span>
    <div>
      <strong>{value}</strong>
      <p>{label}</p>
    </div>
  </RecallCard>
);
