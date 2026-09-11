import i18n from "../locales";
export function speak(text: string) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang =
    ({ en: "en-IN", hi: "hi-IN", as: "as-IN" } as Record<string, string>)[
      i18n.language
    ] || "en-IN";
  u.rate = 0.85;
  speechSynthesis.speak(u);
}
export function listen(
  onText: (s: string) => void,
  onError: (s: string) => void,
  onEnd: () => void,
) {
  const R =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
  if (!R) {
    onError(i18n.t("speechFallback"));
    onEnd();
    return null;
  }
  const r = new R();
  r.lang =
    ({ en: "en-IN", hi: "hi-IN", as: "as-IN" } as any)[i18n.language] ||
    "en-IN";
  r.interimResults = false;
  r.onresult = (e: any) => onText(e.results[0][0].transcript);
  r.onerror = () => onError(i18n.t("voiceError"));
  r.onend = onEnd;
  try {
    r.start();
  } catch {
    onError(i18n.t("voiceError"));
    onEnd();
  }
  return r;
}
