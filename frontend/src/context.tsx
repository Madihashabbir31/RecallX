// frontend/src/context.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { action, syncQueue, pendingCount } from "./services/api";
import { patientService } from "./services/patientService";
import { settingsService } from "./services/settingsService";
import { storageService } from "./services/storageService";
import { authService } from "./services/authService";
import { read, write, clearPrivate } from "./services/offline";
import i18n, { applyLanguageDirection } from "./locales";

export type User = {
  id: number;
  name: string;
  role: "patient" | "caregiver";
  patients: { id: number; name: string }[];
  demo_mode?: boolean;
};

export type Settings = {
  language: string;
  text_size: string;
  voice: boolean;
  notifications: boolean;
  reduced_motion: boolean;
};

const Context = createContext<any>(null);

export function Provider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() =>
    authService.getCurrentUser(),
  );
  const [pid, setPid] = useState<number | null>(() =>
    authService.getCurrentUser()?.patients?.[0]?.id || 1,
  );
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  const [settings, setSettings] = useState<Settings>({
    language: i18n.language || "en",
    text_size: "normal",
    voice: true,
    notifications: false,
    reduced_motion: false,
  });

  const refresh = useCallback(async () => {
    if (!user || !pid) return;
    try {
      const d = await patientService.getPatientSnapshot(pid);
      await write(`snapshot:${user.id}:${pid}`, d);
      setData(d);
      setError("");
    } catch (e) {
      const cached = await read(`snapshot:${user.id}:${pid}`);
      if (cached) setData(cached);
      else setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, pid]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refresh();

    settingsService.getSettings().then((s) => {
      setSettings(s);
      write(`settings:${user.id}`, s);
    });

    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [user?.id, pid, refresh]);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
    applyLanguageDirection(settings.language);
    storageService.setItem("recallx-language", settings.language);
    document.documentElement.lang = settings.language;
    document.documentElement.dataset.text = settings.text_size;
    document.documentElement.dataset.motion = settings.reduced_motion
      ? "reduced"
      : "normal";
  }, [settings]);

  useEffect(() => {
    const count = () => pendingCount().then(setPending);
    const on = () => {
      setOnline(true);
      if (user)
        syncQueue(user.id)
          .then(refresh)
          .catch((e) => setToast(e.message));
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    window.addEventListener("queue-change", count);
    count();
    if (user && navigator.onLine) on();
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      window.removeEventListener("queue-change", count);
    };
  }, [user?.id, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (
      !data ||
      !settings.notifications ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    )
      return;
    const items =
      user?.role === "caregiver"
        ? (data.alerts || [])
            .filter((a: any) => !a.read)
            .map((a: any) => ({
              key: `alert:${a.id}`,
              title: a.title,
              body: a.message,
            }))
        : (data.medications || [])
            .filter(
              (m: any) =>
                ["pending", "snoozed", "missed"].includes(m.status) &&
                m.due_at &&
                new Date(m.snoozed_until || m.due_at).getTime() <= Date.now(),
            )
            .map((m: any) => ({
              key: `med:${m.log_id || m.id}`,
              title: m.medicine_name,
              body: m.instructions,
            }));
    for (const item of items) {
      const k = `notified:${user?.id}:${item.key}`;
      if (!sessionStorage.getItem(k)) {
        new Notification(item.title, {
          body: item.body,
          icon: "/icon-192.png",
        });
        sessionStorage.setItem(k, "1");
      }
    }
  }, [data, settings.notifications, user?.id]);

  async function login(result: any) {
    if (await pendingCount())
      throw new Error("Sync pending activity before switching accounts.");
    await clearPrivate();
    storageService.setCurrentUser(result.user);
    setData(null);
    setUser(result.user);
    setPid(result.user.patients[0]?.id || 1);
  }

  async function logout() {
    await clearPrivate();
    await authService.logout();
    setUser(null);
    setData(null);
    setPid(null);
  }

  async function perform(path: string, body: any, optimistic?: () => void) {
    try {
      const result = await action(user!.id, path, body);
      if (result.queued) {
        optimistic?.();
        setToast(i18n.t("queued"));
      } else {
        setToast(i18n.t("saved"));
        await refresh();
      }
      return result;
    } catch (e) {
      setToast((e as Error).message);
      throw e;
    }
  }

  async function saveSettings(next: Settings) {
    try {
      const updated = await settingsService.updateSettings(next);
      setSettings(updated);
      setToast(i18n.t("saved"));
    } catch (e) {
      setToast((e as Error).message);
    }
  }

  return (
    <Context.Provider
      value={{
        user,
        pid,
        setPid,
        data,
        setData,
        error,
        loading,
        refresh,
        login,
        logout,
        settings,
        setSettings,
        saveSettings,
        toast,
        setToast,
        online,
        pending,
        perform,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </Context.Provider>
  );
}

export const useApp = () => useContext(Context);

export function Photo({
  person,
  className = "",
}: {
  person: any;
  className?: string;
}) {
  const [src, setSrc] = useState("");

  const localAvatar = (() => {
    const rel = (person?.relation || "").toLowerCase();
    const n = (person?.name || "").toLowerCase();
    if (rel.includes("daughter") || n.includes("priya") || n.includes("anita"))
      return "/avatars/daughter.svg";
    if (rel.includes("son") || n.includes("rahul") || n.includes("rajesh"))
      return "/avatars/son.svg";
    if (
      rel.includes("wife") ||
      rel.includes("spouse") ||
      n.includes("sunita") ||
      n.includes("asha")
    )
      return "/avatars/wife.svg";
    if (rel.includes("granddaughter") || n.includes("anaya"))
      return "/avatars/granddaughter.svg";
    if (rel.includes("grandson") || n.includes("aarav"))
      return "/avatars/grandson.svg";
    if (rel.includes("brother") || n.includes("vikram") || n.includes("amit"))
      return "/avatars/brother.svg";
    if (rel.includes("sister") || n.includes("meera"))
      return "/avatars/sister.svg";
    return "";
  })();

  useEffect(() => {
    if (!person?.photo) {
      setSrc(localAvatar || "");
      return;
    }
    if (
      person.photo.startsWith("data:") ||
      person.photo.startsWith("blob:") ||
      person.photo.startsWith("http") ||
      person.photo.startsWith("/avatars") ||
      person.photo.startsWith("/images")
    ) {
      setSrc(person.photo);
      return;
    }
    setSrc(localAvatar || "/avatars/daughter.svg");
  }, [person?.photo, localAvatar]);

  return src ? (
    <img
      className={"person-photo " + className}
      src={src}
      alt={person?.name || "Person"}
      onError={() => setSrc("")}
    />
  ) : (
    <div
      className={"person-photo avatar " + className}
      aria-label={person?.name}
    >
      {person?.name?.charAt(0) || "P"}
    </div>
  );
}
