import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Check,
  Volume2,
  Mic,
  RotateCcw,
  Pause,
  Play,
  Brain,
} from "lucide-react";
import { motion } from "framer-motion";
import { useApp, Photo } from "../context";
import {
  PrimaryButton,
  SecondaryButton,
  RecallCard,
  PageHeader,
  EmptyState,
} from "../components/ui";
import { gameMeta } from "./Patient";
import { listen, speak } from "../services/voice";
const objects: Record<string, any>[] = [
  { icon: "🍎", en: "Apple", hi: "सेब", mr: "सफरचंद", bn: "আপেল", ta: "ஆப்பிள்", te: "ఆపిల్", ur: "سیب", gu: "સફરજન", kn: "ಸೇಬು", ml: "ആപ്പിൾ", pa: "ਸੇਬ", as: "আপেল", or: "ସେଓ" },
  { icon: "☂️", en: "Umbrella", hi: "छाता", mr: "छत्री", bn: "ছাতা", ta: "குடை", te: "గొడుగు", ur: "چھتری", gu: "છત્રી", kn: "ಛತ್ರಿ", ml: "കുട", pa: "ਛੱਤਰੀ", as: "ছাতি", or: "ଛତା" },
  { icon: "📖", en: "Book", hi: "किताब", mr: "पुस्तक", bn: "বই", ta: "புத்தகம்", te: "పుస్తకం", ur: "کتاب", gu: "પુસ્તક", kn: "ಪುಸ್ತಕ", ml: "പുസ്തകം", pa: "ਕਿਤਾਬ", as: "কিতাপ", or: "ବହି" },
  { icon: "☕", en: "Cup", hi: "कप", mr: "कप", bn: "কাপ", ta: "கோப்பை", te: "కప్పు", ur: "کپ", gu: "કપ", kn: "ಕಪ್", ml: "കപ്പ്", pa: "ਕੱਪ", as: "কাপ", or: "କପ୍" },
  { icon: "🔑", en: "Key", hi: "चाबी", mr: "किल्ली", bn: "চাবি", ta: "சாவி", te: "తాళంచెవి", ur: "چابی", gu: "ચાવી", kn: "ಕೀಲಿ", ml: "താക്കോൽ", pa: "ਚਾਬੀ", as: "চাবি", or: "ଚାବି" },
  { icon: "⏰", en: "Clock", hi: "घड़ी", mr: "घड्याळ", bn: "ঘড়ি", ta: "கடிகாரம்", te: "గడియారం", ur: "گھڑی", gu: "ઘડિયાળ", kn: "ಗಡಿಯಾರ", ml: "ഘടികാരം", pa: "ਘੜੀ", as: "ঘড়ী", or: "ଘଣ୍ଟା" },
  { icon: "🌷", en: "Flower", hi: "फूल", mr: "फूल", bn: "ফুল", ta: "மலர்", te: "పువ్వు", ur: "پھول", gu: "ફૂલ", kn: "ಹೂವು", ml: "പൂവ്", pa: "ਫੁੱਲ", as: "ফুল", or: "ଫୁଲ" },
  { icon: "🍌", en: "Banana", hi: "केला", mr: "केळे", bn: "কলা", ta: "வாழைப்பழம்", te: "అరటిపండు", ur: "کیلا", gu: "કેળું", kn: "ಬಾಳೆಹಣ್ಣು", ml: "വാഴപ്പഴം", pa: "ਕੇਲਾ", as: "কল", or: "କଦଳୀ" },
];
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export default function Game() {
  const { type = "memory" } = useParams();
  const { t, i18n } = useTranslation();
  const { data, perform, pid, settings, setToast } = useApp();
  const meta = gameMeta.find((g) => g.id === type);
  const [level, setLevel] = useState(
    data.progress.recommendations[type]?.next_level || "easy",
  );
  const [run, setRun] = useState(0),
    [paused, setPaused] = useState(false),
    [seconds, setSeconds] = useState(0),
    [moves, setMoves] = useState(0),
    [hints, setHints] = useState(0),
    [mistakes, setMistakes] = useState(0),
    [phase, setPhase] = useState("preview"),
    [round, setRound] = useState(0),
    [feedback, setFeedback] = useState<boolean | null>(null),
    [finished, setFinished] = useState(false),
    [saving, setSaving] = useState(false),
    [result, setResult] = useState<any>(null),
    [saveError, setSaveError] = useState("");
  const [cards, setCards] = useState<number[]>([]),
    [flipped, setFlipped] = useState<number[]>([]),
    [matched, setMatched] = useState<number[]>([]),
    [target, setTarget] = useState<number[]>([]),
    [choices, setChoices] = useState<number[]>([]),
    [answer, setAnswer] = useState<number[]>([]),
    [people, setPeople] = useState<any[]>([]),
    [personChoices, setPersonChoices] = useState<any[]>([]);
  const started = useRef(new Date().toISOString()),
    roundStart = useRef(Date.now()),
    attempts = useRef<any[]>([]),
    roundHints = useRef(0),
    eventId = useRef(crypto.randomUUID()),
    done = useRef(false),
    recognition = useRef<any>(null);
  const word = (index: number) =>
    objects[index][i18n.language] || objects[index].hi || objects[index].en;
  function setupRound(n: number) {
    roundStart.current = Date.now();
    roundHints.current = 0;
    setAnswer([]);
    setFeedback(null);
    const list = shuffle(objects.map((_, i) => i));
    setTarget(
      type === "sequence"
        ? list.slice(0, level === "easy" ? 3 : level === "medium" ? 4 : 5)
        : list.slice(0, 1),
    );
    setChoices(shuffle(list));
    setPhase(type === "family" ? "answer" : "preview");
    setRound(n);
  }
  useEffect(() => {
    setSeconds(0);
    setMoves(0);
    setHints(0);
    setMistakes(0);
    setPaused(false);
    setFinished(false);
    setResult(null);
    setSaveError("");
    setMatched([]);
    setFlipped([]);
    done.current = false;
    started.current = new Date().toISOString();
    eventId.current = crypto.randomUUID();
    attempts.current = [];
    const pairs = level === "easy" ? 3 : level === "medium" ? 6 : 8;
    setCards(shuffle([...Array(pairs).keys(), ...Array(pairs).keys()]));
    let pool = data.family.map((p: any) => ({
      ...p,
      weight: data.progress.family.find((f: any) => f.id === p.id)?.weight || 1,
    }));
    const weighted = [];
    while (pool.length) {
      let v =
          Math.random() * pool.reduce((s: number, p: any) => s + p.weight, 0),
        index = pool.length - 1;
      for (let i = 0; i < pool.length; i++) {
        v -= pool[i].weight;
        if (v <= 0) {
          index = i;
          break;
        }
      }
      weighted.push(pool[index]);
      pool.splice(index, 1);
    }
    setPeople(weighted);
    setupRound(0);
    return () => recognition.current?.abort();
  }, [type, level, run]);
  useEffect(() => {
    if (type === "family" && people[round])
      setPersonChoices(
        shuffle([
          people[round],
          ...shuffle(
            data.family.filter((p: any) => p.id !== people[round].id),
          ).slice(0, 3),
        ]),
      );
  }, [round, people, type]);
  useEffect(() => {
    if (paused || finished) return;
    const timer = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(timer);
  }, [paused, finished]);
  useEffect(() => {
    if (paused || phase !== "preview" || !["object", "sequence"].includes(type))
      return;
    const timer = setTimeout(
      () => {
        setPhase("answer");
        roundStart.current = Date.now();
      },
      level === "easy" ? 6000 : level === "medium" ? 4500 : 3000,
    );
    return () => clearTimeout(timer);
  }, [phase, paused, round, type, level, run]);
  useEffect(() => {
    if (flipped.length !== 2 || paused || type !== "memory") return;
    const timer = setTimeout(() => {
      const [a, b] = flipped;
      if (cards[a] === cards[b]) {
        const next = [...matched, a, b];
        setMatched(next);
        if (settings.voice) speak(t("correct"));
        if (next.length === cards.length)
          finish(
            moves ? Math.min(100, (cards.length / 2 / moves) * 100) : 100,
            mistakes,
            moves,
          );
      } else setMistakes((x) => x + 1);
      setFlipped([]);
    }, 650);
    return () => clearTimeout(timer);
  }, [flipped, paused]);
  async function persist(payload: any) {
    setSaving(true);
    setSaveError("");
    try {
      const saved = await perform(`/patients/${pid}/games/sessions`, payload);
      setResult({ ...payload, queued: !!saved.queued });
    } catch (e) {
      setSaveError((e as Error).message);
      setResult(payload);
    } finally {
      setSaving(false);
    }
  }
  function finish(accuracy: number, errors = mistakes, totalMoves = moves) {
    if (done.current) return;
    done.current = true;
    setFinished(true);
    const payload = {
      event_id: eventId.current,
      game_type: type,
      difficulty: level,
      accuracy: Math.round(accuracy * 10) / 10,
      response_time: seconds,
      mistakes: errors,
      hints_used: hints,
      moves: totalMoves,
      started_at: started.current,
      attempts: attempts.current,
    };
    persist(payload);
  }
  function respond(correct: boolean, personId?: number) {
    if (feedback !== null || paused) return;
    setFeedback(correct);
    if (!correct) setMistakes((x) => x + 1);
    setMoves((x) => x + 1);
    attempts.current.push({
      person_id: personId || null,
      correct,
      response_time: (Date.now() - roundStart.current) / 1000,
      hints_used: roundHints.current,
    });
    if (settings.voice)
      speak(
        type === "family"
          ? `${correct ? t("correct") : t("almost")} ${people[round].name}. ${people[round].relation}.`
          : t(correct ? "correct" : "almost"),
      );
  }
  function next() {
    const total = type === "family" ? Math.min(5, people.length) : 5;
    if (round + 1 >= total) {
      finish(
        (attempts.current.filter((a) => a.correct).length /
          attempts.current.length) *
          100,
        mistakes,
        moves,
      );
    } else setupRound(round + 1);
  }
  if (!meta) return <EmptyState />;
  if (type === "family" && !people.length)
    return (
      <>
        <PageHeader title={t("familyGame")} />
        <EmptyState />
        <Link className="button secondary" to="/patient/games">
          {t("back")}
        </Link>
      </>
    );
  if (finished)
    return (
      <div className="game-summary">
        <div className="success-circle">
          <Check size={62} />
        </div>
        <h1>{t("wellDone")}</h1>
        <p>
          {saving
            ? t("loading")
            : saveError
              ? saveError
              : t(result?.queued ? "queued" : "saved")}
        </p>
        <div className="summary-grid">
          <RecallCard>
            <strong>
              {result?.accuracy ??
                Math.round(
                  (attempts.current.filter((a) => a.correct).length /
                    Math.max(1, attempts.current.length)) *
                    100,
                )}
              %
            </strong>
            <p>{t("accuracy")}</p>
          </RecallCard>
          <RecallCard>
            <strong>{seconds}s</strong>
            <p>{t("time")}</p>
          </RecallCard>
          <RecallCard>
            <strong>{hints}</strong>
            <p>{t("hints")}</p>
          </RecallCard>
        </div>
        {saveError && (
          <PrimaryButton onClick={() => persist(result)}>
            {t("retry")}
          </PrimaryButton>
        )}
        <div className="button-row">
          <Link to="/patient/progress" className="button primary">
            {t("viewProgress")}
          </Link>
          <SecondaryButton onClick={() => setRun((x) => x + 1)}>
            {t("again")}
          </SecondaryButton>
        </div>
      </div>
    );
  const person = people[round];
  const total = type === "family" ? Math.min(5, people.length) : 5;
  return (
    <div className="game-screen">
      <Link className="text-link" to="/patient/games">
        <ArrowLeft size={18} />
        {t("games")}
      </Link>
      <PageHeader title={t(meta.key)} subtitle={t("gentle")}>
        <label className="difficulty-label">
          <select
            aria-label="Difficulty"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {["easy", "medium", "hard"].map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
      </PageHeader>
      <div className="game-toolbar">
        <span>
          {t("time")} <strong>{seconds}s</strong>
        </span>
        <span>
          {t("moves")} <strong>{moves}</strong>
        </span>
        <button onClick={() => setPaused(!paused)}>
          {paused ? <Play size={18} /> : <Pause size={18} />}{" "}
          {t(paused ? "resume" : "pause")}
        </button>
        <button onClick={() => setRun((x) => x + 1)}>
          <RotateCcw size={18} />
          {t("restart")}
        </button>
      </div>
      <div className="game-progress">
        <span
          style={{
            width:
              (type === "memory"
                ? matched.length / cards.length
                : round / total) *
                100 +
              "%",
          }}
        />
      </div>
      <RecallCard className="play-area">
        {paused ? (
          <div className="paused">
            <Pause size={60} />
            <h2>{t("pause")}</h2>
            <PrimaryButton onClick={() => setPaused(false)}>
              {t("resume")}
            </PrimaryButton>
          </div>
        ) : type === "memory" ? (
          <div
            className={"memory-grid " + (level === "easy" ? "easy" : "larger")}
          >
            {cards.map((object, index) => {
              const visible =
                flipped.includes(index) || matched.includes(index);
              return (
                <motion.button
                  whileTap={settings.reduced_motion ? {} : { scale: 0.96 }}
                  className={
                    "memory-tile " +
                    (visible ? "flipped " : "") +
                    (matched.includes(index) ? "matched" : "")
                  }
                  key={index}
                  disabled={
                    matched.includes(index) ||
                    flipped.includes(index) ||
                    flipped.length === 2
                  }
                  aria-label={visible ? word(object) : `Card ${index + 1}`}
                  onClick={() => {
                    setFlipped([...flipped, index]);
                    if (flipped.length === 1) setMoves((m) => m + 1);
                  }}
                >
                  {visible ? (
                    <>
                      <span>{objects[object].icon}</span>
                      <small>{word(object)}</small>
                    </>
                  ) : (
                    <Brain size={36} strokeWidth={1.2} />
                  )}
                </motion.button>
              );
            })}
          </div>
        ) : type === "family" ? (
          <>
            <p className="eyebrow">
              {round + 1} / {total}
            </p>
            <h2>{t("who")}</h2>
            <Photo person={person} className="recall-photo" />
            <div className="answer-grid">
              {personChoices.map((p) => (
                <button
                  key={p.id}
                  disabled={feedback !== null}
                  className={
                    "answer-card " +
                    (feedback !== null && p.id === person.id ? "correct" : "")
                  }
                  onClick={() => respond(p.id === person.id, person.id)}
                >
                  {p.name}
                  <small>{p.relation}</small>
                </button>
              ))}
            </div>
            <div className="button-row centered">
              <SecondaryButton
                onClick={() => {
                  roundHints.current++;
                  setHints((h) => h + 1);
                  setToast(person.memory_note);
                }}
              >
                {t("hint")}
              </SecondaryButton>
              <SecondaryButton
                onClick={() => {
                  roundHints.current++;
                  setHints((h) => h + 1);
                  speak(`${person.name}. ${person.relation}`);
                }}
              >
                <Volume2 size={18} />
                {t("hear")}
              </SecondaryButton>
              <SecondaryButton
                disabled={feedback !== null}
                onClick={() => {
                  recognition.current = listen(
                    (text) =>
                      respond(
                        text.toLowerCase().includes(person.name.toLowerCase()),
                        person.id,
                      ),
                    setToast,
                    () => {},
                  );
                }}
              >
                <Mic size={18} />
                {t("voice")}
              </SecondaryButton>
            </div>
          </>
        ) : (
          <>
            <p className="eyebrow">{round + 1} / 5</p>
            <h2>
              {t(
                phase === "preview"
                  ? "remember"
                  : type === "object"
                    ? "chooseObject"
                    : "repeatSequence",
              )}
            </h2>
            {phase === "preview" ? (
              <>
                <div className="object-preview">
                  {target.map((id, i) => (
                    <div key={i}>
                      <span>{objects[id].icon}</span>
                      <strong>{word(id)}</strong>
                      {type === "sequence" && <small>{i + 1}</small>}
                    </div>
                  ))}
                </div>
                <PrimaryButton
                  onClick={() => {
                    setPhase("answer");
                    roundStart.current = Date.now();
                  }}
                >
                  {t("ready")}
                </PrimaryButton>
              </>
            ) : (
              <>
                {type === "sequence" && (
                  <div className="sequence-slots">
                    {target.map((_, i) => (
                      <span key={i}>
                        {answer[i] !== undefined
                          ? objects[answer[i]].icon
                          : i + 1}
                      </span>
                    ))}
                  </div>
                )}
                <div className="answer-grid">
                  {(type === "object"
                    ? choices.filter(
                        (x) =>
                          x === target[0] ||
                          choices
                            .filter((y) => y !== target[0])
                            .slice(0, 3)
                            .includes(x),
                      )
                    : choices
                  ).map((id) => (
                    <button
                      key={id}
                      className={
                        "answer-card " +
                        (feedback !== null && target.includes(id)
                          ? "correct"
                          : "")
                      }
                      disabled={feedback !== null || answer.includes(id)}
                      onClick={() => {
                        if (type === "object") respond(id === target[0]);
                        else {
                          const a = [...answer, id];
                          setAnswer(a);
                          if (a.length === target.length)
                            respond(a.every((v, i) => v === target[i]));
                        }
                      }}
                    >
                      <span>{objects[id].icon}</span>
                      {word(id)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {feedback !== null && (
          <div className="feedback" role="status">
            <h3>{t(feedback ? "correct" : "almost")}</h3>
            {type !== "family" && !feedback && (
              <p>{target.map(word).join(" → ")}</p>
            )}
            <PrimaryButton onClick={next}>{t("next")}</PrimaryButton>
          </div>
        )}
      </RecallCard>
    </div>
  );
}
