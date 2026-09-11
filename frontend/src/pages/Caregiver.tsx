import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  Brain,
  CalendarDays,
  Pill,
  Bell,
  Plus,
  ArrowRight,
  Check,
  Trash2,
  Pencil,
  Users,
  Download,
  HeartHandshake,
  Clock,
  ShieldCheck,
  Activity,
  AlertCircle,
  LogOut,
} from "lucide-react";
import { useApp, Photo } from "../context";
import { patientService } from "../services/patientService";
import {
  PageHeader,
  RecallCard,
  StatCard,
  SectionHeader,
  StatusBadge,
  PrimaryButton,
  SecondaryButton,
  Modal,
  EmptyState,
} from "../components/ui";
import { FamilyMemberCard } from "../components/FamilyMemberCard";
import { Progress } from "./Patient";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export function Dashboard() {
  const { t } = useTranslation();
  const { data, logout } = useApp();

  const rt = (data?.routines || []).filter((r: any) => r.status !== "not_scheduled");
  const md = (data?.medications || []).filter((m: any) => m.status !== "not_scheduled");

  const routine = rt.length
    ? Math.round(
        (100 * rt.filter((r: any) => r.status === "completed").length) /
          rt.length,
      )
    : 0;

  const med = md.length
    ? Math.round(
        (100 * md.filter((m: any) => m.status === "taken").length) / md.length,
      )
    : 0;

  const unreadAlerts = (data?.alerts || []).filter((a: any) => !a.read).length;

  return (
    <>
      <PageHeader
        title={t("caregiverDashboardTitle")}
        subtitle={`${t("caregiverDashboardSubtitle").replace("they are", (data?.patient?.name || "Asha Ji") + " is")}`}
      >
        <Link className="button primary" to="/caregiver/routine">
          <Plus size={18} />
          {t("addReminder")}
        </Link>
        <SecondaryButton onClick={logout} className="signout-btn">
          <LogOut size={16} />
          {t("logout")}
        </SecondaryButton>
      </PageHeader>

      <div className="care-banner">
        <span className="avatar avatar-md">{data?.patient?.name?.[0] || "A"}</span>
        <div className="care-banner-info">
          <strong>{data?.patient?.name || "Asha Ji"}</strong>
          <p>{t("connectedFamilyMember")}</p>
        </div>
        <span className="badge care-circle-badge">
          <ShieldCheck size={14} />
          {t("careCircleConnected")}
        </span>
      </div>

      <div className="care-stats">
        <StatCard
          icon={CalendarDays}
          label={t("routineCompletion")}
          value={routine + "%"}
          tone="sage"
        />
        <StatCard
          icon={Pill}
          label={t("medicationAdherence")}
          value={med + "%"}
          tone="amber"
        />
        <StatCard
          icon={Brain}
          label={t("score")}
          value={(data?.progress?.memory_score || 82) + "%"}
          tone="blue"
        />
        <StatCard
          icon={Bell}
          label={t("pendingAlerts")}
          value={unreadAlerts}
          tone="rose"
        />
      </div>

      <div className="two-column">
        <RecallCard className="care-chart-card">
          <SectionHeader
            title={t("memoryPerformance")}
            to="/caregiver/progress"
          />
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.progress?.weekly || []}>
                <CartesianGrid vertical={false} stroke="#e5eae7" strokeDasharray="3 3" />
                <XAxis dataKey="day" tickLine={false} />
                <YAxis domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #d6e3d7",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="accuracy"
                  name={t("accuracy") + " %"}
                  stroke="#3f817a"
                  strokeWidth={3}
                  dot={{ fill: "#3f817a", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </RecallCard>

        <RecallCard className="care-alerts-card">
          <SectionHeader
            title={t("needsAttention")}
            to="/caregiver/alerts"
          />
          <div className="mini-alerts-container">
            {data.alerts
              .filter((a: any) => !a.read)
              .slice(0, 3)
              .map((a: any) => (
                <div className={"mini-alert " + a.severity} key={a.id}>
                  <AlertCircle size={20} className="mini-alert-icon" />
                  <div className="mini-alert-content">
                    <h3>{a.title}</h3>
                    <p>{a.message}</p>
                    <small>{new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                  </div>
                </div>
              ))}
            {!data.alerts.some((a: any) => !a.read) && (
              <EmptyState text={t("allCaughtUp")} />
            )}
          </div>
        </RecallCard>
      </div>

      <SectionHeader title={t("tasks")} to="/caregiver/routine" />

      <RecallCard className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("activity")}</th>
                <th>{t("time")}</th>
                <th>{t("status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.routines.slice(0, 6).map((r: any) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.title}</strong>
                    {r.description && <small>{r.description}</small>}
                  </td>
                  <td>
                    <div className="table-time-cell">
                      <Clock size={14} className="text-muted" />
                      <span>{r.scheduled_time}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
              {!data.routines.length && (
                <tr>
                  <td colSpan={3} className="text-center py-6">
                    {t("noTasks")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </RecallCard>

      <div className="care-note">
        <HeartHandshake size={28} className="text-teal" />
        <p>
          {t("careNoteConnection")}{" "}
          <Link to="/caregiver/family" className="text-link">
            {t("addFamilyMemory")}
          </Link>
        </p>
      </div>
    </>
  );
}

function EditForm({
  kind,
  item,
  onClose,
}: {
  kind: string;
  item: any;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { pid, refresh, setToast } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit } = useForm({
    defaultValues: item || {
      scheduled_time: "09:00",
      repeat_rule: "daily",
      category: "Custom",
      priority: "normal",
      grace_period_minutes: 30,
    },
  });

  const isFamily = kind === "family";
  const isMed = kind === "medications";

  const fields = isFamily
    ? [
        ["name", t("profile") + " Name"],
        ["relation", "Relationship"],
        ["memory_note", t("memoryNotes")],
        ["important_facts", t("importantFacts")],
      ]
    : isMed
      ? [
          ["medicine_name", "Medicine name"],
          ["dosage", "Dosage"],
          ["instructions", "Instructions"],
        ]
      : [
          ["title", "Task name"],
          ["description", "Description"],
        ];

  async function submit(values: any) {
    setBusy(true);
    setError("");
    try {
      const payload = Object.fromEntries(
        [
          ...fields.map((f) => f[0]),
          ...(!isFamily ? ["scheduled_time", "repeat_rule"] : []),
          ...(isMed
            ? ["grace_period_minutes"]
            : !isFamily
              ? ["category", "priority"]
              : []),
        ].map((k) => [
          k,
          k === "grace_period_minutes" ? Number(values[k]) : values[k] || "",
        ]),
      );
      if (isFamily) {
        if (item) await patientService.updateFamilyMember(item.id, payload);
        else await patientService.addFamilyMember(payload);
      } else if (isMed) {
        if (item) await patientService.updateMedication(item.id, payload);
        else await patientService.addMedication(payload);
      } else {
        if (item) await patientService.updateRoutine(item.id, payload);
        else await patientService.addRoutine(payload);
      }
      await refresh();
      setToast(t("saved"));
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={
        (item ? "Edit " : "Add ") +
        (isFamily
          ? t("familyMembers")
          : isMed
            ? "Medicine Reminder"
            : "Routine Task")
      }
      onClose={onClose}
    >
      <form onSubmit={handleSubmit(submit)}>
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              maxLength={
                key.includes("note") ||
                key.includes("facts") ||
                key === "description" ||
                key === "instructions"
                  ? 1000
                  : 150
              }
              {...register(key, {
                required: [
                  "name",
                  "relation",
                  "medicine_name",
                  "dosage",
                  "title",
                ].includes(key),
              })}
            />
          </label>
        ))}

        {!isFamily && (
          <div className="form-grid">
            <label>
              {t("time")}
              <input
                type="time"
                {...register("scheduled_time", { required: true })}
              />
            </label>
            <label>
              Repeat
              <select {...register("repeat_rule")}>
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays</option>
                <option value="once">Today only</option>
              </select>
            </label>
          </div>
        )}

        {isMed && (
          <label>
            Grace period (minutes)
            <input
              type="number"
              min="1"
              max="180"
              {...register("grace_period_minutes", { required: true })}
            />
          </label>
        )}

        {!isFamily && !isMed && (
          <div className="form-grid">
            <label>
              Category
              <select {...register("category")}>
                {[
                  "Medicine",
                  "Breakfast",
                  "Lunch",
                  "Dinner",
                  "Hydration",
                  "Walking",
                  "Exercise",
                  "Appointment",
                  "Personal Care",
                  "Custom",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select {...register("priority")}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="button-row space-top">
          <PrimaryButton disabled={busy}>{t("save")}</PrimaryButton>
          <SecondaryButton type="button" onClick={onClose}>
            {t("cancel")}
          </SecondaryButton>
        </div>
      </form>
    </Modal>
  );
}

export function Manage({
  kind,
}: {
  kind: "routine" | "medications" | "family";
}) {
  const { t } = useTranslation();
  const { data, refresh, setToast } = useApp();
  const [edit, setEdit] = useState<any>(undefined);
  const [remove, setRemove] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const rows =
    kind === "routine"
      ? data.routines
      : kind === "medications"
        ? data.medications
        : data.family;

  const title =
    kind === "routine"
      ? t("manageTitleRoutine")
      : kind === "medications"
        ? t("manageTitleMeds")
        : t("manageTitleFamily");

  async function deleteItem() {
    setBusy(true);
    try {
      if (kind === "family") await patientService.deleteFamilyMember(remove.id);
      else if (kind === "medications") await patientService.deleteMedication(remove.id);
      else await patientService.deleteRoutine(remove.id);
      setRemove(null);
      await refresh();
      setToast("Item removed. Historical records are retained.");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function upload(person: any, file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await patientService.uploadFamilyPhoto(person.id, reader.result as string);
          await refresh();
          setToast("Photo saved.");
        } catch (err) {
          setToast((err as Error).message);
        } finally {
          setBusy(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (e) {
      setToast((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        subtitle={`Manage ${data.patient.name}’s ${kind === "family" ? t("manageFamiliarFaces") : t("manageDailySupport")}.`}
      >
        <PrimaryButton onClick={() => setEdit(null)}>
          <Plus size={18} />
          {kind === "family"
            ? t("addFamilyMember")
            : kind === "routine"
              ? t("addTask")
              : t("addMedicine")}
        </PrimaryButton>
      </PageHeader>

      {kind === "family" ? (
        <div className="family-responsive-grid">
          {rows.map((p: any) => (
            <FamilyMemberCard
              key={p.id}
              person={p}
              isCaregiver={true}
              onEdit={(person) => setEdit(person)}
              onDelete={(person) => setRemove(person)}
              onUpload={upload}
              busy={busy}
            />
          ))}
        </div>
      ) : (
        <RecallCard className="table-card">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{kind === "routine" ? t("activity") : t("medications")}</th>
                  <th>{t("time")}</th>
                  <th>Repeat</th>
                  <th>{t("status")}</th>
                  <th>{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title || r.medicine_name}</strong>
                      <small>{r.description || r.dosage}</small>
                    </td>
                    <td>{r.scheduled_time}</td>
                    <td>{r.repeat_rule}</td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <div className="button-row">
                        <button
                          aria-label={"Edit " + (r.title || r.medicine_name)}
                          className="icon-button"
                          onClick={() => setEdit(r)}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          aria-label={"Delete " + (r.title || r.medicine_name)}
                          className="icon-button danger"
                          onClick={() => setRemove(r)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RecallCard>
      )}

      {!rows.length && <EmptyState text={t("empty")} />}

      {edit !== undefined && (
        <EditForm
          key={edit?.id || "new"}
          kind={kind}
          item={edit}
          onClose={() => setEdit(undefined)}
        />
      )}

      {remove && (
        <Modal title="Remove this item?" onClose={() => setRemove(null)}>
          <p>
            {remove.title || remove.medicine_name || remove.name} will no longer
            appear in the active list.
          </p>
          <div className="button-row">
            <PrimaryButton disabled={busy} onClick={deleteItem}>
              Remove
            </PrimaryButton>
            <SecondaryButton onClick={() => setRemove(null)}>
              {t("cancel")}
            </SecondaryButton>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Alerts() {
  const { t } = useTranslation();
  const { data, refresh, setToast } = useApp();
  const [filter, setFilter] = useState("unread");

  async function read(id: number) {
    try {
      await patientService.markAlertRead(id);
      await refresh();
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  const rows = data.alerts.filter(
    (a: any) =>
      filter === "all" ||
      (filter === "unread" && !a.read) ||
      (filter === "critical" && a.severity === "critical") ||
      (filter === "read" && a.read),
  );

  return (
    <>
      <PageHeader
        title={t("careAlerts")}
        subtitle={t("careAlertsSubtitle")}
      />

      <div className="tabs">
        {[
          { key: "unread", label: t("unread") },
          { key: "all", label: t("allAlerts") },
          { key: "critical", label: t("critical") },
          { key: "read", label: t("acknowledged") },
        ].map((f) => (
          <button
            key={f.key}
            className={filter === f.key ? "active" : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="alert-list">
        {rows.map((a: any) => (
          <RecallCard key={a.id} className={"alert-card " + a.severity}>
            <Bell size={24} className="alert-card-icon" />
            <div className="alert-card-body">
              <span className={"badge " + (a.severity === "critical" ? "missed" : "pending")}>
                {t(a.severity) || a.severity}
              </span>
              <h2>{a.title}</h2>
              <p>{a.message}</p>
              <small>{new Date(a.created_at).toLocaleString()}</small>
            </div>
            {!a.read ? (
              <SecondaryButton onClick={() => read(a.id)}>
                <Check size={18} />
                {t("acknowledge")}
              </SecondaryButton>
            ) : (
              <span className="badge completed">{t("acknowledged")}</span>
            )}
          </RecallCard>
        ))}
      </div>

      {!rows.length && <EmptyState text={t("allCaughtUp")} />}
    </>
  );
}

export function Reports() {
  const { t } = useTranslation();
  const { data } = useApp();

  function download() {
    const rows = [
      [
        "Date",
        "Memory accuracy (%)",
        "Game sessions",
        "Response time (s)",
        "Routine adherence (%)",
        "Medication adherence (%)",
      ],
      ...((data?.progress?.weekly || []).map((d: any) => [
        d.date || "",
        d.accuracy ?? d.score ?? "",
        d.sessions ?? 1,
        d.response_time ?? "",
        d.routine ?? d.routine_done ?? 0,
        d.medication ?? d.meds_taken ?? 0,
      ])),
    ];
    const blob = new Blob([rows.map((r) => r.join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RecallX-${data.patient.name.replace(/\s+/g, "_")}-progress.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader
        title={t("weeklyReport")}
        subtitle={`${t("weeklyReportSubtitle")}`}
      >
        <PrimaryButton onClick={download}>
          <Download size={18} />
          {t("downloadCSV")}
        </PrimaryButton>
      </PageHeader>
      <Progress caregiver />
    </>
  );
}
