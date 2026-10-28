"use client";

import { gsap, useGSAP } from "@/components/motion/gsap";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/* ───────────────────────── shared state ───────────────────────── */

export type MascotMode = "idle" | "watching" | "hiding" | "peeking" | "thinking" | "happy" | "sad";
type FieldKind = "text" | "password" | null;
type Status = "idle" | "loading" | "success" | "error";

interface MascotApi {
  mode: MascotMode;
  /** -1 (looking left) … 1 (looking right) */
  look: number;
  /** a form field gained / lost focus (password fields also report whether the text is visible) */
  setField: (kind: FieldKind, visible?: boolean) => void;
  setLook: (n: number) => void;
  setStatus: (s: Status) => void;
}

const MascotContext = createContext<MascotApi | null>(null);

/** Safe outside a provider too (everything becomes a no-op), so fields can be reused anywhere. */
export function useMascot(): MascotApi {
  return useContext(MascotContext) ?? { mode: "idle", look: 0, setField: () => undefined, setLook: () => undefined, setStatus: () => undefined };
}

export function MascotProvider({ children }: { children: React.ReactNode }) {
  const [field, setFieldState] = useState<{ kind: FieldKind; visible: boolean }>({ kind: null, visible: false });
  const [look, setLook] = useState(0);
  const [status, setStatusState] = useState<Status>("idle");
  const errorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [errorHold, setErrorHold] = useState(false);

  const setField = useCallback((kind: FieldKind, visible = false) => {
    setFieldState({ kind, visible });
    if (kind !== "text") setLook(0);
  }, []);

  // a failed attempt keeps the sad face for a moment, longer than the form's own 0.5s "error" state
  const setStatus = useCallback((s: Status) => {
    setStatusState(s);
    if (s === "error") {
      setErrorHold(true);
      if (errorTimer.current) clearTimeout(errorTimer.current);
      errorTimer.current = setTimeout(() => setErrorHold(false), 2200);
    } else if (s !== "idle") {
      setErrorHold(false);
    }
  }, []);
  useEffect(() => () => {
    if (errorTimer.current) clearTimeout(errorTimer.current);
  }, []);

  const mode: MascotMode =
    status === "loading"
      ? "thinking"
      : status === "success"
        ? "happy"
        : status === "error" || errorHold
          ? "sad"
          : field.kind === "password"
            ? field.visible
              ? "peeking"
              : "hiding"
            : field.kind === "text"
              ? "watching"
              : "idle";

  const value = useMemo(() => ({ mode, look, setField, setLook, setStatus }), [mode, look, setField, setStatus]);
  return <MascotContext.Provider value={value}>{children}</MascotContext.Provider>;
}

/* ───────────────────────── the robot ───────────────────────── */

// eyelids: open = lids parked outside the eye, closed = they meet a little below the eye's centre
const LID_TOP_OPEN = -38;
const LID_BOT_OPEN = 26;

const EYE_L = { x: 92, y: 98 };
const EYE_R = { x: 148, y: 98 };

/**
 * An original robot mascot, drawn as inline SVG and animated with GSAP:
 *  - watching: head turns and pupils follow the caret while you type in a text field
 *  - hiding / peeking: hands cover the eyes on a password field (peeks when the eye icon shows the password)
 *  - thinking / happy / sad: while submitting, after success, after a failed attempt
 */
export default function RobotMascot({ className = "" }: { className?: string }) {
  const { mode, look } = useMascot();
  const root = useRef<SVGSVGElement>(null);
  const reduce = useRef(false);

  // ── always-on idle life: blinking + antenna wiggle
  useGSAP(
    () => {
      reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const q = gsap.utils.selector(root);
      gsap.set(q("[data-eye]"), { transformBox: "fill-box", transformOrigin: "50% 50%" });
      gsap.set(q("[data-head], [data-ball], [data-hand-l], [data-hand-r], [data-mouth]"), { transformBox: "fill-box" });
      if (reduce.current) return;
      // a blink the way eyes really do it: the upper lid sweeps down fast while the lower lid lifts a little,
      // they meet, pause for a beat, then open slower than they closed. Timing is irregular, sometimes a double blink.
      const lidTop = q("[data-lid-top]");
      const lidBot = q("[data-lid-bot]");
      const blink = () => {
        gsap.timeline()
          .to(lidTop, { y: 0, duration: 0.07, ease: "power2.in" }, 0)
          .to(lidBot, { y: 0, duration: 0.07, ease: "power2.in" }, 0.01)
          .to(lidTop, { y: LID_TOP_OPEN, duration: 0.15, ease: "power2.out" }, 0.11)
          .to(lidBot, { y: LID_BOT_OPEN, duration: 0.19, ease: "power2.out" }, 0.1);
      };
      let timer: ReturnType<typeof setTimeout> | undefined;
      let alive = true;
      const loop = (first = false) => {
        timer = setTimeout(
          () => {
            if (!alive) return;
            blink();
            if (Math.random() < 0.2) setTimeout(() => alive && blink(), 330); // the occasional double blink
            loop();
          },
          first ? 1400 : 2400 + Math.random() * 3200,
        );
      };
      loop(true);
      gsap.to(q("[data-antenna]"), { rotation: 7, transformOrigin: "50% 100%", duration: 1.6, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(q("[data-ball]"), { scale: 1.18, transformOrigin: "50% 50%", duration: 0.9, ease: "sine.inOut", repeat: -1, yoyo: true });
      gsap.to(q("[data-bob]"), { y: -3, duration: 2.2, ease: "sine.inOut", repeat: -1, yoyo: true });
      return () => {
        alive = false;
        clearTimeout(timer);
        gsap.killTweensOf([...lidTop, ...lidBot]);
      };
    },
    { scope: root },
  );

  // ── pose changes
  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const d = reduce.current ? 0 : 0.5;
      const ease = "back.out(1.5)";
      gsap.killTweensOf(q("[data-pupil]"));

      const hands = (l: gsap.TweenVars, r: gsap.TweenVars) => {
        gsap.to(q("[data-hand-l]"), { ...l, duration: d, ease, overwrite: "auto" });
        gsap.to(q("[data-hand-r]"), { ...r, duration: d, ease, overwrite: "auto" });
      };
      const down = { y: 260, rotation: 0 };
      const mouth = (name: string) => {
        q("[data-mouth]").forEach((m) => {
          const on = (m as HTMLElement).dataset.mouth === name;
          gsap.to(m, { opacity: on ? 1 : 0, duration: reduce.current ? 0 : 0.2, overwrite: "auto" });
        });
      };

      // reset the things only some poses change
      gsap.to(q("[data-head]"), { rotation: 0, y: 0, duration: d, ease: "power3.out", overwrite: "auto" });
      gsap.to(q("[data-eye]"), { scaleY: 1, duration: 0.2, overwrite: "auto" });
      gsap.to(q("[data-cheek]"), { opacity: 0.55, duration: 0.3 });

      switch (mode) {
        case "hiding":
          hands({ x: EYE_L.x, y: EYE_L.y + 2, rotation: 0 }, { x: EYE_R.x, y: EYE_R.y + 2, rotation: 0 });
          mouth("smile");
          break;
        case "peeking":
          // left hand stays; right hand slides away so the right eye peeks out
          hands({ x: EYE_L.x, y: EYE_L.y + 2, rotation: -6 }, { x: EYE_R.x + 40, y: EYE_R.y + 16, rotation: 26 });
          gsap.to(q("[data-pupil-r]"), { x: 5, y: 1, duration: d });
          mouth("smirk");
          break;
        case "thinking":
          hands({ x: EYE_L.x, y: down.y }, { x: EYE_R.x, y: down.y });
          mouth("o");
          gsap.to(q("[data-pupil]"), { keyframes: [{ x: 6, y: -4 }, { x: 0, y: -7 }, { x: -6, y: -4 }, { x: -6, y: 4 }, { x: 0, y: 7 }, { x: 6, y: 4 }], duration: 1.3, ease: "none", repeat: -1 });
          gsap.to(q("[data-ball]"), { fill: "#ffd37a", duration: 0.4, repeat: -1, yoyo: true });
          break;
        case "happy":
          hands({ x: EYE_L.x, y: down.y }, { x: EYE_R.x, y: down.y });
          mouth("happy");
          gsap.to(q("[data-eye]"), { scaleY: 0.55, duration: 0.25 });
          gsap.to(q("[data-cheek]"), { opacity: 1, duration: 0.3 });
          if (!reduce.current) {
            gsap.fromTo(q("[data-head]"), { y: 0 }, { y: -9, duration: 0.28, yoyo: true, repeat: 3, ease: "power2.out" });
            q("[data-spark]").forEach((s, i) => {
              const a = (i / 8) * Math.PI * 2;
              gsap.fromTo(s, { x: 120, y: 90, scale: 0, opacity: 1, rotation: 0 }, { x: 120 + Math.cos(a) * 110, y: 90 + Math.sin(a) * 78, scale: 1, rotation: 160, opacity: 0, duration: 1.1, ease: "power2.out", delay: 0.05 * (i % 3) });
            });
          }
          break;
        case "sad":
          hands({ x: EYE_L.x, y: down.y }, { x: EYE_R.x, y: down.y });
          mouth("sad");
          gsap.to(q("[data-head]"), { rotation: -5, y: 5, transformOrigin: "50% 100%", duration: d });
          gsap.to(q("[data-eye]"), { scaleY: 0.8, duration: 0.3 });
          gsap.to(q("[data-pupil]"), { x: 0, y: 5, duration: 0.3 });
          if (!reduce.current) gsap.fromTo(q("[data-robot]"), { x: -8 }, { x: 0, duration: 0.6, ease: "elastic.out(1.2, 0.25)" });
          break;
        case "watching":
          hands({ x: EYE_L.x, y: down.y }, { x: EYE_R.x, y: down.y });
          mouth("smile");
          break;
        default:
          hands({ x: EYE_L.x, y: down.y }, { x: EYE_R.x, y: down.y });
          mouth("smile");
          gsap.to(q("[data-pupil]"), { x: 0, y: 0, duration: d });
      }
    },
    { scope: root, dependencies: [mode] },
  );

  // ── eyes + head follow what is being typed
  useGSAP(
    () => {
      if (mode !== "watching") return;
      const q = gsap.utils.selector(root);
      const t = reduce.current ? 0 : 0.28;
      gsap.to(q("[data-pupil]"), { x: look * 7, y: 3, duration: t, ease: "power2.out", overwrite: "auto" });
      gsap.to(q("[data-head]"), { rotation: look * 5, transformOrigin: "50% 100%", duration: t * 1.6, ease: "power2.out", overwrite: "auto" });
      gsap.to(q("[data-plate]"), { x: look * 4, duration: t * 1.6, ease: "power2.out", overwrite: "auto" });
    },
    { scope: root, dependencies: [look, mode] },
  );

  const eye = (c: { x: number; y: number }, side: "l" | "r") => (
    <g data-eye>
      <circle cx={c.x} cy={c.y} r="23" fill="#ffffff" stroke="#fcdde5" strokeWidth="2.5" />
      <g data-pupil data-pupil-r={side === "r" ? "" : undefined}>
        <circle cx={c.x} cy={c.y} r="11.5" fill="#4a1424" />
        <circle cx={c.x} cy={c.y} r="6" fill="#8e2b47" />
        <circle cx={c.x + 4} cy={c.y - 4.5} r="3.2" fill="#fff" />
      </g>
      {/* eyelids, clipped to the eye; parked outside it until a blink */}
      <clipPath id={`rm-eye-clip-${side}`}>
        <circle cx={c.x} cy={c.y} r="24" />
      </clipPath>
      <g clipPath={`url(#rm-eye-clip-${side})`}>
        <g data-lid-bot transform={`translate(0 ${LID_BOT_OPEN})`}>
          <path d={`M${c.x - 30} ${c.y + 60} V${c.y + 6} Q${c.x} ${c.y} ${c.x + 30} ${c.y + 6} V${c.y + 60} Z`} fill="#f9d5df" />
        </g>
        <g data-lid-top transform={`translate(0 ${LID_TOP_OPEN})`}>
          <path d={`M${c.x - 30} ${c.y - 70} H${c.x + 30} V${c.y + 4} Q${c.x} ${c.y + 14} ${c.x - 30} ${c.y + 4} Z`} fill="#f9d5df" />
          <path d={`M${c.x - 30} ${c.y + 4} Q${c.x} ${c.y + 14} ${c.x + 30} ${c.y + 4}`} fill="none" stroke="#4a1424" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
    </g>
  );

  const hand = (name: "l" | "r") => (
    <g data-hand-l={name === "l" ? "" : undefined} data-hand-r={name === "r" ? "" : undefined} transform="translate(0 260)">
      <rect x="-31" y="-27" width="62" height="54" rx="25" fill="#e06d88" />
      <rect x="-31" y="-27" width="62" height="24" rx="12" fill="#f4a2b6" opacity="0.8" />
      <path d="M-12 -24v16M2 -26v18M16 -24v16" stroke="#ba3d5d" strokeWidth="2.6" strokeLinecap="round" opacity="0.85" />
      <circle cx="-22" cy="16" r="3" fill="#fcdde5" opacity="0.75" />
    </g>
  );

  return (
    <svg ref={root} viewBox="0 0 240 215" className={`overflow-visible ${className}`} role="img" aria-label="Friendly robot mascot" data-mode={mode}>
      <defs>
        <linearGradient id="rm-head" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c9476c" />
          <stop offset="1" stopColor="#5c1d30" />
        </linearGradient>
        <linearGradient id="rm-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4a2b6" />
          <stop offset="1" stopColor="#e06d88" />
        </linearGradient>
      </defs>

      <g data-robot>
        <g data-bob>
          {/* body (mostly tucked behind the card) */}
          <rect x="62" y="158" width="116" height="70" rx="26" fill="url(#rm-body)" />
          <rect x="108" y="170" width="24" height="10" rx="5" fill="#fff" opacity="0.6" />

          <g data-head>
            {/* antenna */}
            <g data-antenna>
              <rect x="117.5" y="14" width="5" height="26" rx="2.5" fill="#5c1d30" />
              <circle data-ball cx="120" cy="12" r="9" fill="#e06d88" />
              <circle cx="116.5" cy="8.5" r="2.6" fill="#fff" opacity="0.75" />
            </g>
            {/* ears */}
            <rect x="12" y="84" width="20" height="46" rx="10" fill="#e06d88" />
            <rect x="208" y="84" width="20" height="46" rx="10" fill="#e06d88" />
            {/* head + face plate */}
            <rect x="26" y="38" width="188" height="128" rx="38" fill="url(#rm-head)" />
            <rect x="26" y="38" width="188" height="44" rx="30" fill="#fff" opacity="0.12" />
            <g data-plate>
              <rect x="46" y="58" width="148" height="92" rx="28" fill="#fff7f9" />
              {eye(EYE_L, "l")}
              {eye(EYE_R, "r")}
              <ellipse data-cheek cx="68" cy="130" rx="11" ry="6.5" fill="#fca5b9" opacity="0.65" />
              <ellipse data-cheek cx="172" cy="130" rx="11" ry="6.5" fill="#fca5b9" opacity="0.65" />
              <g strokeLinecap="round" strokeLinejoin="round">
                <path data-mouth="smile" d="M100 126 Q120 142 140 126" fill="none" stroke="#4a1424" strokeWidth="5" />
                <path data-mouth="smirk" d="M104 128 Q124 140 142 122" fill="none" stroke="#4a1424" strokeWidth="5" opacity="0" />
                <path data-mouth="happy" d="M97 120 Q120 156 143 120 Z" fill="#4a1424" stroke="#4a1424" strokeWidth="4" opacity="0" />
                <path data-mouth="sad" d="M102 138 Q120 122 138 138" fill="none" stroke="#4a1424" strokeWidth="5" opacity="0" />
                <ellipse data-mouth="o" cx="120" cy="132" rx="7" ry="8" fill="#4a1424" opacity="0" />
              </g>
            </g>
          </g>
        </g>

        {/* hands rise from below to cover the eyes */}
        {hand("l")}
        {hand("r")}

        {/* confetti for success */}
        <g>
          {Array.from({ length: 8 }).map((_, i) => (
            <rect key={i} data-spark x="-5" y="-5" width="10" height="10" rx="2" opacity="0" fill={["#e06d88", "#c9476c", "#f4a2b6", "#ffd1dc"][i % 4]} />
          ))}
        </g>
      </g>
    </svg>
  );
}
