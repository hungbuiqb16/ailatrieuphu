"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicGameData } from "@/lib/gameData";

const LETTERS = ["A", "B", "C", "D"];
const fmt = (n: number) => n.toLocaleString("vi-VN");

type Screen = "start" | "game" | "result";
type ResultType = "win" | "lose" | "walk";

type ToastState = { title: string; body: React.ReactNode; isHtml: boolean } | null;
type ConfettiPiece = { id: number; left: number; color: string; radius: string; duration: number; rotate: number };
type AnswerState = "idle" | "picked" | "correct" | "wrong" | "reveal";

const COLORS = ["#FFC93C", "#FF5D8F", "#2EC4B6", "#FF9E1B", "#FFF3D6", "#6C34C4"];

export default function GameClient({ data }: { data: PublicGameData }) {
  const [gameData, setGameData] = useState(data);
  const [playedSetIds, setPlayedSetIds] = useState<string[]>([data.setId]);
  const { questions, prizes, safe, settings } = gameData;
  const timePerQuestion = settings.timePerQuestion;

  const [screen, setScreen] = useState<Screen>("start");
  const [idx, setIdx] = useState(0);
  const [locked, setLocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [removed, setRemoved] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [answerStates, setAnswerStates] = useState<AnswerState[]>(["idle", "idle", "idle", "idle"]);
  const [timeLeft, setTimeLeft] = useState(timePerQuestion);
  const [used, setUsed] = useState({ f5050: false, phone: false, audience: false });
  const [toast, setToast] = useState<ToastState>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [result, setResult] = useState<{ type: ResultType; money: number; reason?: string } | null>(null);
  const [showResultScreen, setShowResultScreen] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actxRef = useRef<AudioContext | null>(null);
  const mutedRef = useRef(muted);
  const lockedRef = useRef(locked);
  const confettiId = useRef(0);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);
  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  function beep(freq: number, dur = 0.12, type: OscillatorType = "square", vol = 0.15) {
    if (mutedRef.current) return;
    try {
      actxRef.current = actxRef.current || new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const actx = actxRef.current;
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(actx.destination);
      g.gain.setValueAtTime(vol, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + dur);
      o.start();
      o.stop(actx.currentTime + dur);
    } catch {
      // Web Audio unavailable
    }
  }
  const sndPick = () => beep(520, 0.08, "square", 0.12);
  const sndCorrect = () => {
    beep(660, 0.1);
    setTimeout(() => beep(880, 0.15), 110);
    setTimeout(() => beep(1046, 0.25), 240);
  };
  const sndWrong = () => {
    beep(200, 0.25, "sawtooth", 0.18);
    setTimeout(() => beep(140, 0.35, "sawtooth", 0.18), 120);
  };
  const sndLifeline = () => beep(760, 0.15, "triangle", 0.14);

  function confettiBurst(n = 40) {
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < n; i++) {
      confettiId.current += 1;
      pieces.push({
        id: confettiId.current,
        left: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        radius: Math.random() < 0.5 ? "2px" : "50%",
        duration: 2 + Math.random() * 2,
        rotate: Math.random() * 360,
      });
    }
    setConfetti((prev) => [...prev, ...pieces]);
    pieces.forEach((p) => {
      setTimeout(() => setConfetti((prev) => prev.filter((c) => c.id !== p.id)), p.duration * 1000);
    });
  }

  function showToast(title: string, body: React.ReactNode, isHtml = false) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ title, body, isHtml });
    toastTimeoutRef.current = setTimeout(() => setToast(null), isHtml ? 9000 : 6000);
  }

  function startTimer(duration: number) {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(duration);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1;
        if (next <= 5 && next > 0) beep(880, 0.05, "square", 0.08);
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          timeUp();
          return 0;
        }
        return next;
      });
    }, 1000);
  }

  function timeUp() {
    if (lockedRef.current) return;
    setLocked(true);
    lockedRef.current = true;
    sndWrong();
    setAnswerStates((prev) => prev.map((_, i) => (i === questions[idx].c ? "reveal" : prev[i])));
    setTimeout(() => endGame(false, "Hết giờ! ⏰"), 1500);
  }

  function render(nextIdx: number, duration = timePerQuestion) {
    setLocked(false);
    lockedRef.current = false;
    setRemoved([]);
    setSelected(null);
    setAnswerStates(["idle", "idle", "idle", "idle"]);
    setIdx(nextIdx);
    startTimer(duration);
  }

  function startGame() {
    setUsed({ f5050: false, phone: false, audience: false });
    setScreen("game");
    render(0);
  }

  function selectAnswer(i: number, isRemoved: boolean) {
    if (lockedRef.current || isRemoved) return;
    setSelected(i);
    sndPick();
  }

  function confirmAnswer() {
    if (lockedRef.current || selected === null) return;
    setLocked(true);
    lockedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const i = selected;
    const Q = questions[idx];
    setAnswerStates((prev) => prev.map((s, k) => (k === i ? "picked" : s)));

    setTimeout(() => {
      if (i === Q.c) {
        setAnswerStates((prev) => prev.map((s, k) => (k === i ? "correct" : s)));
        sndCorrect();
        confettiBurst(30);
        setTimeout(next, 1600);
      } else {
        setAnswerStates((prev) => prev.map((s, k) => (k === i ? "wrong" : k === Q.c ? "reveal" : s)));
        sndWrong();
        setTimeout(() => endGame(false), 1900);
      }
    }, 1100);
  }

  function next() {
    if (idx >= questions.length - 1) {
      endGame(true);
      return;
    }
    render(idx + 1);
  }

  function use5050() {
    if (used.f5050 || lockedRef.current) return;
    setUsed((u) => ({ ...u, f5050: true }));
    sndLifeline();
    const Q = questions[idx];
    const wrongs = [0, 1, 2, 3].filter((i) => i !== Q.c);
    wrongs.sort(() => Math.random() - 0.5);
    setRemoved([wrongs[0], wrongs[1]]);
    setSelected((s) => (s === wrongs[0] || s === wrongs[1] ? null : s));
  }

  function usePhone() {
    if (used.phone || lockedRef.current) return;
    setUsed((u) => ({ ...u, phone: true }));
    sndLifeline();
    const Q = questions[idx];
    let guess =
      Math.random() < 0.75
        ? Q.c
        : [0, 1, 2, 3].filter((i) => i !== Q.c && !removed.includes(i)).sort(() => Math.random() - 0.5)[0];
    if (guess === undefined) guess = Q.c;
    const lines = [
      `Ừm… mình khá chắc là đáp án ${LETTERS[guess]} đó!`,
      `Câu này dễ mà, chọn ${LETTERS[guess]} đi bạn ơi!`,
      `Để nghĩ chút… theo mình là ${LETTERS[guess]} nhé.`,
      `Mình từng đọc ở đâu đó rồi, chắc chắn ${LETTERS[guess]}!`,
    ];
    showToast("📞 Người bạn nói:", lines[Math.floor(Math.random() * lines.length)]);
  }

  function useAudience() {
    if (used.audience || lockedRef.current) return;
    setUsed((u) => ({ ...u, audience: true }));
    sndLifeline();
    const Q = questions[idx];
    const avail = [0, 1, 2, 3].filter((i) => !removed.includes(i));
    const votes = [0, 0, 0, 0];
    let left = 100;
    const correctPct = 45 + Math.floor(Math.random() * 30);
    votes[Q.c] = correctPct;
    left -= correctPct;
    const others = avail.filter((i) => i !== Q.c);
    others.forEach((o, k) => {
      const v = k === others.length - 1 ? left : Math.floor(Math.random() * left);
      votes[o] = v;
      left -= v;
    });
    showToast(
      "👥 Bình chọn khán giả:",
      <div className="flex items-end justify-center gap-3 mt-2 h-32">
        {avail.map((i) => (
          <div key={i} className="flex items-end gap-1 flex-col">
            <div className="w-9 bg-gold comic-sm rounded-t-md" style={{ height: `${Math.max(votes[i], 3) * 1.6}px` }} />
            <span className="font-display text-ink text-xs">
              {LETTERS[i]}·{votes[i]}%
            </span>
          </div>
        ))}
      </div>,
      true
    );
  }

  function moneyWon(win: boolean) {
    if (win) return prizes[prizes.length - 1];
    let safeMoney = 0;
    safe.forEach((s) => {
      if (idx > s) safeMoney = prizes[s];
    });
    return safeMoney;
  }

  function walkAway() {
    if (lockedRef.current) return;
    setLocked(true);
    lockedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const money = idx > 0 ? prizes[idx - 1] : 0;
    finish("walk", money);
  }

  function endGame(win: boolean, reason?: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    finish(win ? "win" : "lose", moneyWon(win), reason);
  }

  function finish(type: ResultType, money: number, reason?: string) {
    setResult({ type, money, reason });
    if (type === "win") {
      confettiBurst(120);
      sndCorrect();
    }
    setTimeout(() => {
      setScreen("result");
      setShowResultScreen(true);
    }, 300);
  }

  async function restart() {
    setShowResultScreen(false);
    setResult(null);

    let nextData = gameData;
    try {
      const res = await fetch(`/api/game-data/next?played=${encodeURIComponent(playedSetIds.join(","))}`);
      if (res.ok) nextData = (await res.json()) as PublicGameData;
    } catch {
      // Giữ nguyên bộ câu hỏi hiện tại nếu không lấy được bộ mới
    }

    setPlayedSetIds((prev) => (prev.includes(nextData.setId) ? [nextData.setId] : [...prev, nextData.setId]));
    setGameData(nextData);
    setUsed({ f5050: false, phone: false, audience: false });
    setScreen("game");
    render(0, nextData.settings.timePerQuestion);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (screen !== "game") return;
      const map: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };
      const k = e.key.toUpperCase();
      if (k in map) {
        const i = map[k];
        if (!removed.includes(i) && !lockedRef.current) selectAnswer(i, false);
      } else if (e.key === "Enter") {
        confirmAnswer();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, idx, removed, selected]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const Q = questions[idx];
  const frac = timeLeft / timePerQuestion;
  const timerColor = timeLeft <= 10 ? "#FF5D8F" : "#FFC93C";

  return (
    <div className="stage dots min-h-screen text-cream overflow-x-hidden relative">
      <div className="bg-rays" aria-hidden="true" />
      <div className="spotlight l" aria-hidden="true" />
      <div className="spotlight r" aria-hidden="true" />
      <div className="bg-floor" aria-hidden="true" />

      <Stars />

      {screen === "start" && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6">
          <div className="text-center max-w-lg">
            <div className="floaty inline-block mb-6">
              <div className="bg-gold comic rounded-[2rem] px-8 py-6 rotate-[-2deg]">
                <p className="font-body font-extrabold text-ink text-lg tracking-wide">GAME SHOW</p>
                <h1 className="font-display text-ink text-5xl sm:text-6xl leading-none drop-shadow-[3px_3px_0_#FF9E1B]">
                  AI LÀ
                  <br />
                  TRIỆU PHÚ
                </h1>
                <p className="font-body font-bold text-grape text-sm mt-2">✨ Cartoon Edition ✨</p>
              </div>
            </div>
            <p className="font-body font-semibold text-cream/90 text-lg mb-8 max-w-md mx-auto">
              Trả lời đúng {questions.length} câu hỏi để leo lên đỉnh cao{" "}
              <span className="text-gold font-extrabold">{fmt(prizes[prizes.length - 1] / 1000000)} triệu</span>!
              <br />
              Sẵn sàng chưa?
            </p>
            <button
              onClick={startGame}
              className="comic comic-press bg-coral text-cream font-display text-2xl px-10 py-4 rounded-full"
            >
              ▶ BẮT ĐẦU CHƠI
            </button>
          </div>
        </div>
      )}

      {screen === "game" && (
        <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <header className="flex items-center justify-between gap-3 mb-4">
            <div className="bg-gold comic-sm rounded-2xl px-4 py-1.5 rotate-[-1deg]">
              <h1 className="font-display text-ink text-xl sm:text-2xl leading-none">AI LÀ TRIỆU PHÚ</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16">
                <svg viewBox="0 0 100 100" className="ring w-full h-full">
                  <circle cx="50" cy="50" r="42" fill="#2A1550" stroke="#1A0B33" strokeWidth="8" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke={timerColor}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="264"
                    strokeDashoffset={264 * (1 - frac)}
                  />
                </svg>
                <span
                  className="absolute inset-0 grid place-items-center font-display text-xl sm:text-2xl"
                  style={{ color: timerColor }}
                >
                  {timeLeft}
                </span>
              </div>
              <button
                onClick={() => setMuted((m) => !m)}
                className="comic-sm comic-press bg-panel rounded-xl w-11 h-11 grid place-items-center text-xl"
              >
                {muted ? "🔇" : "🔊"}
              </button>
            </div>
          </header>

          <div className="grid lg:grid-cols-[1fr_260px] gap-5">
            <section className="order-1">
              <div className="flex flex-wrap items-center gap-2.5 mb-5">
                <span className="font-body font-bold text-cream/70 text-sm mr-1">Trợ giúp:</span>
                {settings.lifelines.f5050 && (
                  <button
                    disabled={used.f5050}
                    onClick={use5050}
                    className="comic-sm comic-press bg-teal text-ink font-display rounded-full px-4 py-1.5 text-sm"
                  >
                    50:50
                  </button>
                )}
                {settings.lifelines.phone && (
                  <button
                    disabled={used.phone}
                    onClick={usePhone}
                    className="comic-sm comic-press bg-teal text-ink font-display rounded-full px-4 py-1.5 text-sm"
                  >
                    📞 GỌI ĐIỆN
                  </button>
                )}
                {settings.lifelines.audience && (
                  <button
                    disabled={used.audience}
                    onClick={useAudience}
                    className="comic-sm comic-press bg-teal text-ink font-display rounded-full px-4 py-1.5 text-sm"
                  >
                    👥 KHÁN GIẢ
                  </button>
                )}
                <button
                  onClick={walkAway}
                  className="comic-sm comic-press bg-gold2 text-ink font-display rounded-full px-4 py-1.5 text-sm ml-auto"
                >
                  🏳️ DỪNG CUỘC CHƠI
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <div className="bg-coral comic-sm rounded-full w-11 h-11 grid place-items-center font-display text-cream text-lg rotate-[-3deg]">
                  {idx + 1}
                </div>
                <p className="font-body font-bold text-cream/80">
                  Câu hỏi cho <span className="text-gold font-extrabold">{fmt(prizes[idx])}</span> đồng
                </p>
              </div>

              <div className="bg-panel comic rounded-3xl p-5 sm:p-6 mb-5 relative">
                <div className="absolute -top-3 -left-3 bg-gold comic-sm rounded-full w-9 h-9 grid place-items-center font-display text-ink coinbob">
                  ?
                </div>
                <p className="font-body font-bold text-cream text-lg sm:text-2xl leading-snug">{Q.q}</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                {Q.a.map((text, i) => {
                  const isRemoved = removed.includes(i);
                  const state = answerStates[i];
                  let extra = "";
                  if (state === "picked") extra = "!bg-gold2 !text-ink";
                  else if (state === "correct") extra = "!bg-teal !text-ink flash-correct";
                  else if (state === "wrong") extra = "!bg-coral !text-cream flash-wrong shake";
                  else if (state === "reveal") extra = "!bg-teal !text-ink";
                  else if (selected === i) extra = "!bg-gold2 !text-ink ring-4 ring-gold";
                  return (
                    <button
                      key={i}
                      disabled={isRemoved || locked}
                      onClick={() => selectAnswer(i, isRemoved)}
                      style={isRemoved ? { opacity: 0.2 } : undefined}
                      className={`comic-sm comic-press bg-grape2 text-cream rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left w-full ${extra}`}
                    >
                      <span className="bg-gold comic-sm text-ink font-display rounded-lg w-8 h-8 grid place-items-center shrink-0">
                        {LETTERS[i]}
                      </span>
                      <span className="font-body font-bold text-base sm:text-lg leading-tight">{text}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center mt-5">
                <button
                  onClick={confirmAnswer}
                  disabled={selected === null || locked}
                  className="comic comic-press bg-gold text-ink font-display text-lg px-10 py-3 rounded-full"
                >
                  XÁC NHẬN
                </button>
              </div>
            </section>

            <aside className="order-2">
              <div className="bg-panel comic rounded-3xl p-3">
                <p className="font-display text-gold text-center text-lg mb-2">💰 THANG TIỀN</p>
                <ol className="ladder space-y-1.5 max-h-[46vh] lg:max-h-[62vh] overflow-y-auto pr-1">
                  {prizes.map((_, rev) => {
                    const i = prizes.length - 1 - rev;
                    const isSafe = safe.includes(i);
                    const isCurrent = i === idx;
                    return (
                      <li
                        key={i}
                        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 font-body font-extrabold text-sm transition-colors ${
                          isCurrent ? "bg-coral comic-sm scale-105" : ""
                        }`}
                      >
                        <span
                          className={`font-display w-6 text-center ${
                            isCurrent ? "!text-cream" : isSafe ? "text-gold" : "text-cream/50"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span
                          className={`flex-1 text-right ${
                            isCurrent ? "!text-cream" : isSafe ? "text-gold" : "text-cream/85"
                          }`}
                        >
                          {fmt(prizes[i])}
                        </span>
                        {isSafe && <span title="Mốc an toàn">🔒</span>}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </aside>
          </div>
        </main>
      )}

      {screen === "result" && showResultScreen && result && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-6 bg-ink/70 backdrop-blur-sm">
          <div className="pop text-center max-w-md bg-panel comic rounded-[2rem] p-8">
            <div className="text-6xl mb-3">{result.type === "win" ? "🏆" : result.type === "walk" ? "🤝" : "😵"}</div>
            <h2
              className={`font-display text-4xl mb-2 ${
                result.type === "win" ? "text-gold" : result.type === "walk" ? "text-teal" : "text-coral"
              }`}
            >
              {result.type === "win" ? "TRIỆU PHÚ!" : result.type === "walk" ? "DỪNG ĐÚNG LÚC!" : "RẤT TIẾC!"}
            </h2>
            <p className="font-body font-semibold text-cream/90 text-lg mb-1">
              {result.type === "win"
                ? "Bạn đã chinh phục toàn bộ các câu hỏi!"
                : result.type === "walk"
                ? "Bạn ra về an toàn với số tiền của mình."
                : result.reason || "Đáp án chưa chính xác rồi!"}
            </p>
            <p className="font-body font-bold text-cream/70">Bạn giành được</p>
            <p className="font-display text-5xl text-gold my-2 drop-shadow-[3px_3px_0_#FF9E1B]">{fmt(result.money)} đồng</p>
            <button
              onClick={restart}
              className="comic comic-press bg-coral text-cream font-display text-xl px-8 py-3 rounded-full mt-4"
            >
              🔁 CHƠI LẠI
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="pop fixed z-50 left-1/2 -translate-x-1/2 top-24 bg-cream comic rounded-2xl p-4 max-w-xs w-[90%] text-center">
          <p className="font-display text-ink text-lg mb-1">{toast.title}</p>
          <div className="font-body font-bold text-grape">{toast.body}</div>
          <button
            onClick={() => setToast(null)}
            className="comic-sm comic-press bg-coral text-cream font-display rounded-full px-4 py-1 mt-3 text-sm"
          >
            ĐÓNG
          </button>
        </div>
      )}

      <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
        {confetti.map((p) => (
          <div
            key={p.id}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              background: p.color,
              borderRadius: p.radius,
              animation: `fall ${p.duration}s linear forwards`,
              transform: `rotate(${p.rotate}deg)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Stars() {
  const [stars] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 4,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
    }))
  );
  return (
    <div className="pointer-events-none fixed inset-0 -z-0">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star absolute rounded-full bg-gold"
          style={{
            width: s.size,
            height: s.size,
            left: `${s.left}%`,
            top: `${s.top}%`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
