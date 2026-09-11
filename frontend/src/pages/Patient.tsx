import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Brain,
  Sun,
  ArrowRight,
  CalendarDays,
  Pill,
  Flame,
  Mic,
  Users,
  Heart,
  Check,
  Clock,
  Footprints,
  Coffee,
  Droplets,
  User,
  Volume2,
  Square,
  Settings as SettingsIcon,
  LogOut,
  Activity,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { useApp, Photo } from "../context";
import {
  RecallCard,
  PrimaryButton,
  SecondaryButton,
  ProgressRing,
  PageHeader,
  SectionHeader,
  StatusBadge,
  EmptyState,
  StatCard,
} from "../components/ui";
import { patientService } from "../services/patientService";
import { storageService } from "../services/storageService";
import { gameService } from "../services/gameService";
import { write } from "../services/offline";
import { speak, listen } from "../services/voice";
import { FamilyMemberCard } from "../components/FamilyMemberCard";
import { LanguageSelector } from "../components/LanguageSelector";
import { LANGUAGES } from "../locales";
import { defaultProgress } from "../data/demoData";
export const gameMeta = [
  {
    id: "memory",
    key: "memory",
    desc: "memoryDesc",
    icon: Brain,
    tone: "sage",
  },
  { id: "object", key: "object", desc: "objectDesc", icon: Sun, tone: "amber" },
  {
    id: "sequence",
    key: "sequence",
    desc: "sequenceDesc",
    icon: Activity,
    tone: "blue",
  },
  {
    id: "family",
    key: "familyGame",
    desc: "familyDesc",
    icon: Users,
    tone: "rose",
  },
];
const taskIcon = (category: string) =>
  ({
    Walking: Footprints,
    Hydration: Droplets,
    Breakfast: Coffee,
    Medicine: Pill,
    "Personal Care": User,
  })[category] || CalendarDays;
export function RoutineCard({ item }: { item: any }) {
  const { t } = useTranslation();
  const { perform, user, data, setData, pid } = useApp();
  const [busy, setBusy] = useState(false);
  const Icon = taskIcon(item.category);
  async function complete() {
    setBusy(true);
    try {
      await perform(
        `/routine/${item.id}/status`,
        { status: "completed", date: item.date, event_id: crypto.randomUUID() },
        () => {
          const d = {
            ...data,
            routines: data.routines.map((x: any) =>
              x.id === item.id ? { ...x, status: "completed" } : x,
            ),
          };
          setData(d);
          write(`snapshot:${user.id}:${pid}`, d);
        },
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="routine-row">
      <span
        className={
          "icon-tile " + (item.category === "Walking" ? "amber" : "sage")
        }
      >
        <Icon size={26} />
      </span>
      <div className="row-text">
        <h3>{item.title}</h3>
        <p>
          <Clock size={14} />
          {item.scheduled_time} <span>·</span>{" "}
          <StatusBadge status={item.status} />
        </p>
      </div>
      {item.status !== "completed" && item.status !== "not_scheduled" && (
        <button
          disabled={busy}
          className="round-check"
          aria-label={t("complete") + ": " + item.title}
          onClick={complete}
        >
          <Check size={23} />
        </button>
      )}
      {item.status === "completed" && <Check className="done-icon" />}
    </div>
  );
}
export function MedicationCard({ item }: { item: any }) {
  const { t } = useTranslation();
  const { perform, user, data, setData, pid } = useApp();
  const [busy, setBusy] = useState(false);
  async function update(status: string) {
    setBusy(true);
    try {
      await perform(
        `/medications/${item.id}/status`,
        { status, date: item.date, event_id: crypto.randomUUID() },
        () => {
          const d = {
            ...data,
            medications: data.medications.map((x: any) =>
              x.id === item.id ? { ...x, status } : x,
            ),
          };
          setData(d);
          write(`snapshot:${user.id}:${pid}`, d);
        },
      );
    } catch {
    } finally {
      setBusy(false);
    }
  }
  return (
    <RecallCard className="med-card">
      <div className="med-top">
        <span className="icon-tile amber">
          <Pill size={27} />
        </span>
        <StatusBadge status={item.status} />
      </div>
      <h2>{item.medicine_name}</h2>
      <p className="med-dose">
        {item.dosage} <span>·</span> {item.scheduled_time}
      </p>
      <p>{item.instructions}</p>
      {item.status === "snoozed" && <p>{t("snoozeNote")}</p>}
      {!["taken", "not_scheduled"].includes(item.status) && (
        <div className="button-row">
          <PrimaryButton disabled={busy} onClick={() => update("taken")}>
            <Check size={18} />
            {t("take")}
          </PrimaryButton>
          {item.status === "pending" && (
            <SecondaryButton disabled={busy} onClick={() => update("snoozed")}>
              {t("later")}
            </SecondaryButton>
          )}
        </div>
      )}
    </RecallCard>
  );
}
export function Home() {
  const { t } = useTranslation();
  const { data } = useApp();
  const hour = new Date().getHours();
  const rt = (data?.routines || []).filter((r: any) => r.status !== "not_scheduled");
  const completed = rt.filter((r: any) => r.status === "completed").length;
  const med = (data?.medications || []).find((m: any) =>
    ["pending", "snoozed", "missed"].includes(m.status),
  );
  const recommendation = [...gameMeta].sort((a, b) => {
    const all = data?.progress?.recent || [];
    return (
      all.filter((s: any) => s.game_type === a.id).length -
      all.filter((s: any) => s.game_type === b.id).length
    );
  })[0];
  return (
    <>
      <PageHeader
        title={`${t(hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening")}, ${data?.patient?.name || "Asha Ji"}`}
        subtitle={t("smallSteps")}
      >
        <div className="date-chip">
          <Sun size={20} />
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </div>
      </PageHeader>
      <div className="home-grid">
        <section className="hero-activity">
          <div>
            <span className="eyebrow">{t("todayActivity")}</span>
            <h2>{t(recommendation.key)}</h2>
            <p>{t(recommendation.desc)}</p>
            <Link
              className="button primary"
              to={"/patient/games/" + recommendation.id}
            >
              {t("start")}
              <ArrowRight size={20} />
            </Link>
            <span className="hero-meta">
              {t(data?.progress?.recommendations?.[recommendation.id]?.next_level || "easy")}{" "}
              <span>·</span> 3–5 {t("minutes")}
            </span>
          </div>
          <div className="hero-brain">
            <recommendation.icon size={95} strokeWidth={1} />
          </div>
        </section>
        <RecallCard className="today-progress">
          <div>
            <span className="eyebrow">{t("yourDay")}</span>
            <h3>
              {completed} / {rt.length}
            </h3>
            <p>{t("routineDone")}</p>
            <Link to="/patient/routine" className="text-link">
              {t("viewAll")}
              <ArrowRight size={17} />
            </Link>
          </div>
          <ProgressRing
            value={rt.length ? Math.round((100 * completed) / rt.length) : 0}
          />
        </RecallCard>
      </div>
      <div className="stats-grid">
        <StatCard
          icon={Brain}
          label={t("score")}
          value={data.progress.memory_score + "%"}
        />
        <StatCard
          icon={Flame}
          label={t("streak")}
          value={data.progress.streak}
          tone="amber"
        />
        <StatCard
          icon={Heart}
          label={t("recent")}
          value={data.progress.total_sessions}
          tone="rose"
        />
      </div>
      <div className="two-column">
        <section>
          <SectionHeader title={t("tasks")} to="/patient/routine" />
          <RecallCard className="routine-list">
            {rt.slice(0, 4).map((r: any) => (
              <RoutineCard key={r.id} item={r} />
            ))}
            {!rt.length && <EmptyState />}
          </RecallCard>
        </section>
        <section>
          <SectionHeader title={t("nextMedicine")} to="/patient/medications" />
          {med ? (
            <MedicationCard item={med} />
          ) : (
            <RecallCard>
              <EmptyState text={t("noMedicine")} />
            </RecallCard>
          )}
        </section>
      </div>
      <SectionHeader title={t("quickActions")} />
      <div className="quick-grid">
        {[
          { to: "games", icon: Brain, text: "games", tone: "sage" },
          { to: "voice", icon: Mic, text: "voice", tone: "blue" },
          { to: "family", icon: Users, text: "family", tone: "rose" },
          { to: "progress", icon: Activity, text: "progress", tone: "amber" },
        ].map((x) => (
          <Link className="quick-card" key={x.to} to={"/patient/" + x.to}>
            <span className={"icon-tile " + x.tone}>
              <x.icon />
            </span>
            <strong>{t(x.text)}</strong>
            <ArrowRight size={18} />
          </Link>
        ))}
      </div>
      <p className="gentle-note">{t("gentle")}</p>
    </>
  );
}
export function GamesHub() {
  const { t } = useTranslation();
  const { data } = useApp();
  const progress = data?.progress || defaultProgress;
  const gameProgress = gameService.getGameProgress();

  return (
    <>
      <PageHeader title={t("games")} subtitle={t("gamesSubtitle")} />
      <div className="game-hub">
        {gameMeta.map((g) => {
          const nextLevel =
            progress?.recommendations?.[g.id]?.next_level || "easy";
          const highScore = gameProgress?.highScores?.[g.id];
          return (
            <Link
              className={"game-card " + g.tone}
              key={g.id}
              to={"/patient/games/" + g.id}
            >
              <span className="game-icon">
                <g.icon size={47} strokeWidth={1.5} />
              </span>
              <div>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <span className="badge">
                    {t(nextLevel)} · 3–5 {t("minutes")}
                  </span>
                  {highScore !== undefined && highScore > 0 && (
                    <span className="badge" style={{ background: "rgba(34, 197, 94, 0.15)", color: "#15803d", fontWeight: 600 }}>
                      Best: {highScore}%
                    </span>
                  )}
                </div>
                <h2>{t(g.key)}</h2>
                <p>{t(g.desc)}</p>
              </div>
              <span className="text-link">
                {t("start")}
                <ArrowRight size={18} />
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
export function Routine() {
  const { t } = useTranslation();
  const { data } = useApp();
  const [filter, setFilter] = useState("all");
  const items = data.routines.filter(
    (r: any) => filter === "all" || r.status === filter,
  );
  return (
    <>
      <PageHeader title={t("tasks")} subtitle={t("routineSubtitle")} />
      <div className="tabs">
        {["all", "pending", "completed", "missed"].map((f) => (
          <button
            key={f}
            className={filter === f ? "active" : ""}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? t("viewAll") : t(f === "completed" ? "done" : f)}
          </button>
        ))}
      </div>
      <RecallCard className="routine-list">
        {items.map((r: any) => (
          <RoutineCard key={r.id} item={r} />
        ))}
        {!items.length && <EmptyState text={t("noTasks")} />}
      </RecallCard>
      <Link className="button secondary space-top" to="/patient/medications">
        <Pill />
        {t("medications")}
        <ArrowRight size={18} />
      </Link>
    </>
  );
}
export function Medications() {
  const { t } = useTranslation();
  const { data, pid, refresh, setToast } = useApp();
  const [busy, setBusy] = useState(false);
  async function demo() {
    setBusy(true);
    try {
      await patientService.triggerDemoReminder(pid || 1);
      await refresh();
      setToast(
        "Demo timer started. The caregiver alert appears after 30 seconds.",
      );
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader title={t("medications")} subtitle={t("medicineSubtitle")} />
      <div className="med-grid">
        {data.medications.map((m: any) => (
          <MedicationCard key={m.id} item={m} />
        ))}
        {!data.medications.length && <EmptyState />}
      </div>
      {data.demo_mode && (
        <div className="demo-panel">
          <span>{t("sample")}</span>
          <SecondaryButton disabled={busy} onClick={demo}>
            {t("demoReminder")}
          </SecondaryButton>
        </div>
      )}
    </>
  );
}
export function Family() {
  const { t } = useTranslation();
  const { data } = useApp();
  return (
    <>
      <PageHeader title={t("familyHeadline")} subtitle={t("familySubtitleText")}>
        <Link to="/patient/games/family" className="button primary">
          {t("start")}
          <ArrowRight size={18} />
        </Link>
      </PageHeader>
      <div className="family-responsive-grid">
        {data.family.map((p: any) => (
          <FamilyMemberCard key={p.id} person={p} />
        ))}
      </div>
      {!data.family.length && <EmptyState text={t("empty")} />}
    </>
  );
}
export function Progress({ caregiver = false }: { caregiver?: boolean }) {
  const { t } = useTranslation();
  const { data } = useApp();
  const p = data?.progress || defaultProgress;
  return (
    <>
      <PageHeader
        title={caregiver ? "Cognitive progress" : t("progress")}
        subtitle={t("smallSteps")}
      />
      <div className="stats-grid">
        <StatCard
          icon={Brain}
          label={t("score")}
          value={p.memory_score + "%"}
        />
        <StatCard
          icon={Flame}
          label={t("streak")}
          value={p.streak}
          tone="amber"
        />
        <StatCard
          icon={Activity}
          label={t("recent")}
          value={p.total_sessions}
          tone="blue"
        />
      </div>
      <div className="two-column">
        <RecallCard>
          <h2>{t("weekly")}</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={p.weekly}>
                <CartesianGrid vertical={false} stroke="#e6ebe8" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar
                  name={t("accuracy")}
                  dataKey="accuracy"
                  fill="#3f817a"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </RecallCard>
        <RecallCard>
          <h2>{t("routineDone")}</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={p.weekly}>
                <CartesianGrid vertical={false} stroke="#e6ebe8" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line
                  name={t("routine")}
                  dataKey="routine"
                  stroke="#285f5a"
                  strokeWidth={3}
                />
                <Line
                  name={t("medications")}
                  dataKey="medication"
                  stroke="#a77025"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </RecallCard>
      </div>
      {caregiver && (
        <div className="two-column space-top">
          <RecallCard>
            <h2>Response time · seconds</h2>
            <div className="chart">
              <ResponsiveContainer>
                <LineChart data={p.weekly}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    dataKey="response_time"
                    stroke="#3f817a"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </RecallCard>
          <RecallCard>
            <h2>Difficulty progression</h2>
            <p className="muted">1 Easy · 2 Medium · 3 Hard</p>
            <div className="chart">
              <ResponsiveContainer>
                <LineChart data={p.weekly}>
                  <XAxis dataKey="day" />
                  <YAxis domain={[1, 3]} ticks={[1, 2, 3]} />
                  <Tooltip />
                  <Line
                    type="stepAfter"
                    dataKey="difficulty"
                    stroke="#a77025"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </RecallCard>
        </div>
      )}
      <SectionHeader title={t("recent")} />
      <RecallCard className="table-card">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("games")}</th>
                <th>{t("accuracy")}</th>
                <th>{t("time")}</th>
                <th>{t("recent")}</th>
              </tr>
            </thead>
            <tbody>
              {p.recent.map((s: any) => (
                <tr key={s.id}>
                  <td>
                    {t(
                      gameMeta.find((g) => g.id === s.game_type)?.key ||
                        "games",
                    )}
                    <small>{t(s.difficulty)}</small>
                  </td>
                  <td>{Math.round(s.accuracy)}%</td>
                  <td>{Math.round(s.response_time)} s</td>
                  <td>{new Date(s.completed_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!p.recent.length && <EmptyState />}
        </div>
      </RecallCard>
      {caregiver && (
        <>
          <SectionHeader title="Family recall performance" />
          <div className="stats-grid">
            {p.family.map((f: any) => (
              <RecallCard key={f.id}>
                <h3>{f.name}</h3>
                <strong>
                  {f.accuracy === null ? "No attempts yet" : f.accuracy + "%"}
                </strong>
                <p>{f.attempts} attempts</p>
              </RecallCard>
            ))}
          </div>
        </>
      )}
    </>
  );
}
export function Voice() {
  const { t } = useTranslation();
  const { data, settings } = useApp();
  const [query, setQuery] = useState(""),
    [answer, setAnswer] = useState(""),
    [path, setPath] = useState(""),
    [listening, setListening] = useState(false),
    [error, setError] = useState("");
  const recognition = useRef<any>(null);
  useEffect(() => () => recognition.current?.abort(), []);
  function ask(q = query) {
    if (!q.trim()) return;
    const text = q.toLowerCase();
    let result = t("help"),
      dest = "";
    if (/medicine|medication|दवा|ঔষধ/.test(text)) {
      const m = data.medications
        .filter((m: any) => ["pending", "snoozed"].includes(m.status))
        .sort((a: any, b: any) =>
          (a.due_at || "").localeCompare(b.due_at || ""),
        )[0];
      result = m
        ? `${t("nextMedicine")}: ${m.medicine_name}, ${m.scheduled_time}. ${m.instructions}`
        : t("noMedicine");
      dest = "/patient/medications";
    } else if (/game|खेल|খেল/.test(text)) {
      result = t("gamesSubtitle");
      dest = "/patient/games/memory";
    } else if (/progress|doing|status|प्रगति|অগ্ৰগতি/.test(text)) {
      result = `${t("score")}: ${data.progress.memory_score}%. ${t("routineDone")}: ${data.routines.filter((r: any) => r.status === "completed").length}.`;
      dest = "/patient/progress";
    } else if (/task|routine|today|काम|दिनचर्या|কাম/.test(text)) {
      const task = data.routines.find((r: any) => r.status === "pending");
      result = task
        ? `${t("nextTask")}: ${task.title}, ${task.scheduled_time}`
        : t("noTasks");
      dest = "/patient/routine";
    } else {
      const p = data.family.find((f: any) =>
        text.includes(f.name.toLowerCase()),
      );
      if (p) {
        result = `${p.name}, ${p.relation}. ${p.memory_note} ${p.important_facts}`;
        dest = "/patient/family";
      }
    }
    setAnswer(result);
    setPath(dest);
    if (settings.voice) speak(result);
  }
  return (
    <div className="voice-page">
      <PageHeader title={t("voiceTitle")} subtitle={t("voiceSubtitle")} />
      <button
        className={"mic-button " + (listening ? "listening" : "")}
        aria-label={t("voice")}
        onClick={() => {
          setError("");
          setListening(true);
          recognition.current = listen(
            (q) => {
              setQuery(q);
              ask(q);
            },
            setError,
            () => setListening(false),
          );
        }}
      >
        <Mic size={56} strokeWidth={1.5} />
      </button>
      <p>{listening ? t("listening") : t("help")}</p>
      <form
        className="voice-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
      >
        <input
          aria-label={t("ask")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("ask") + "…"}
        />
        <PrimaryButton>
          {t("ask")}
          <ArrowRight size={18} />
        </PrimaryButton>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="suggestions">
        {["nextMedicine", "tasks", "progress"].map((key) => (
          <button
            key={key}
            onClick={() => {
              const q =
                key === "nextMedicine"
                  ? "medicine"
                  : key === "tasks"
                    ? "routine"
                    : "progress";
              setQuery(t(key));
              ask(q);
            }}
          >
            {t(key)}
          </button>
        ))}
      </div>
      {answer && (
        <RecallCard className="voice-answer">
          <p aria-live="polite">{answer}</p>
          <div className="button-row">
            <SecondaryButton onClick={() => speak(answer)}>
              <Volume2 size={18} />
              {t("speak")}
            </SecondaryButton>
            {path && (
              <Link to={path} className="button primary">
                {t("continue")}
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </RecallCard>
      )}
      <button
        className="text-link space-top"
        onClick={() => window.speechSynthesis?.cancel()}
      >
        <Square size={16} />
        {t("stop")}
      </button>
    </div>
  );
}
export function Settings() {
  const { t } = useTranslation();
  const { settings, saveSettings, setToast, refresh } = useApp();
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  async function notifications() {
    if (!("Notification" in window)) {
      setToast("This browser does not support notifications.");
      return;
    }
    if (Notification.permission === "denied") {
      setToast(t("notificationDenied"));
      return;
    }
    const p = await Notification.requestPermission();
    setDraft({ ...draft, notifications: p === "granted" });
  }

  async function handleResetDemo() {
    storageService.resetDemoData();
    await refresh();
    setToast("Demo data restored to defaults.");
  }

  return (
    <>
      <PageHeader title={t("settings")} subtitle={t("practice")} />
      <RecallCard className="settings-card">
        <label>
          <div className="flex justify-between items-center mb-1">
            <span>{t("language")}</span>
            <LanguageSelector />
          </div>
          <select
            value={draft.language}
            onChange={(e) => setDraft({ ...draft, language: e.target.value })}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.native} — {lang.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("textSize")}
          <select
            value={draft.text_size}
            onChange={(e) => setDraft({ ...draft, text_size: e.target.value })}
          >
            {["normal", "large", "extra"].map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
        {["voice", "reduced_motion"].map((k) => (
          <label className="switch-row" key={k}>
            <span>{t(k === "voice" ? "voiceFeedback" : "reducedMotion")}</span>
            <input
              type="checkbox"
              checked={draft[k]}
              onChange={(e) => setDraft({ ...draft, [k]: e.target.checked })}
            />
          </label>
        ))}
        <label className="switch-row">
          <span>{t("notifications")}</span>
          <input
            type="checkbox"
            checked={draft.notifications}
            onChange={(e) =>
              e.target.checked
                ? notifications()
                : setDraft({ ...draft, notifications: false })
            }
          />
        </label>
        <PrimaryButton onClick={() => saveSettings(draft)}>
          {t("save")}
        </PrimaryButton>

        <div style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid var(--border, #e2e8f0)", display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "0.9rem", color: "var(--muted, #64748b)" }}>Demo Management</span>
          <SecondaryButton type="button" onClick={handleResetDemo}>
            <RotateCcw size={16} />
            Reset Demo Data
          </SecondaryButton>
        </div>
      </RecallCard>
    </>
  );
}
export function Profile() {
  const { t } = useTranslation();
  const { user, logout } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <>
      <PageHeader title={t("profile")} />
      <RecallCard className="profile-card">
        <div className="avatar">{user.name[0]}</div>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <span className="badge">{t(user.role)}</span>
        <div className="profile-links">
          {[
            { to: "progress", icon: Activity, key: "progress" },
            { to: "family", icon: Users, key: "family" },
            { to: "settings", icon: SettingsIcon, key: "settings" },
          ].map((x) => (
            <Link key={x.to} to={"/patient/" + x.to}>
              <x.icon />
              {t(x.key)}
              <ArrowRight size={18} />
            </Link>
          ))}
        </div>
        <SecondaryButton onClick={handleLogout}>
          <LogOut size={18} />
          {t("logout")}
        </SecondaryButton>
      </RecallCard>
    </>
  );
}
