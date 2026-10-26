"use client";
// Glitch Counter — angka menghitung naik dengan glitch RGB split.
import { useEffect, useLayoutEffect, useRef } from "react";

const DIGITS = "0123456789";
const fmt = (n: number, d: number, pad = 1) => n.toLocaleString("en-US", { minimumIntegerDigits: pad, minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false });
const easeOutCubic = (t: number) => 1 - (1 - Math.min(1, t)) ** 3;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Props = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  from?: number;
  duration?: number;
  delay?: number;
  threshold?: number;
  glitch?: number;
  colorA?: string;
  colorB?: string;
  className?: string;
  /** jumlah digit minimum (03, 07, ...) supaya animasi hitung & glitch tetap terlihat untuk angka satu digit */
  pad?: number;
};

export function GlitchCounter({ value, prefix = "", suffix = "", decimals = 0, from = 0, duration = 1.6, delay = 0, threshold = 0.5, glitch = 1, colorA = "rgba(255, 40, 80, 0.9)", colorB = "rgba(0, 190, 255, 0.9)", className, pad = 1 }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLSpanElement>(null);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  const finalText = `${prefix}${fmt(value, decimals, pad)}${suffix}`;
  const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useIso(() => {
    if (reduced() || !main.current) return;
    main.current.textContent = `${prefix}${fmt(from, decimals, pad)}${suffix}`;
  }, [prefix, suffix, from, decimals, pad]);

  useEffect(() => {
    const el = root.current, m = main.current, ca = a.current, cb = b.current;
    if (!el || !m || !ca || !cb) return;
    const rm = reduced();
    let raf = 0, started = false, t0 = 0, lastGlitch = 0, dead = false;
    const text = (n: number) => `${prefix}${fmt(n, decimals, pad)}${suffix}`;
    const clear = () => {
      for (const s of [ca, cb]) { s.style.opacity = "0"; s.style.clipPath = "none"; s.style.transform = "none"; }
      m.style.transform = "none";
      m.style.clipPath = "none";
    };
    const scramble = (s: string, p: number) => {
      if (p <= 0) return s;
      let out = "";
      for (const ch of s) out += /[0-9]/.test(ch) && Math.random() < p ? DIGITS[Math.floor(Math.random() * 10)] : ch;
      return out;
    };
    const slice = () => {
      const top = Math.random() * 90, h = 6 + Math.random() * 34;
      return `inset(${top.toFixed(1)}% 0 ${Math.max(0, 100 - top - h).toFixed(1)}% 0)`;
    };
    const glitchFrame = (k: number, s: string) => {
      if (k <= 0.01) { clear(); return; }
      ca.textContent = s;
      cb.textContent = s;
      const on = Math.random() < 0.85;
      ca.style.opacity = on ? "1" : "0";
      cb.style.opacity = on && Math.random() < 0.8 ? "1" : "0";
      ca.style.clipPath = Math.random() < 0.3 ? "none" : slice();
      cb.style.clipPath = Math.random() < 0.3 ? "none" : slice();
      const off = (0.02 + Math.random() * 0.07) * k;
      ca.style.transform = `translate3d(${(-off).toFixed(3)}em, ${((Math.random() - 0.5) * 0.02).toFixed(3)}em, 0)`;
      cb.style.transform = `translate3d(${off.toFixed(3)}em, ${((Math.random() - 0.5) * 0.02).toFixed(3)}em, 0)`;
      if (Math.random() < 0.35 * k) {
        m.style.clipPath = Math.random() < 0.5 ? slice() : "none";
        m.style.transform = `translate3d(${((Math.random() - 0.5) * 0.08 * k).toFixed(3)}em, 0, 0) skewX(${((Math.random() - 0.5) * 12 * k).toFixed(1)}deg)`;
      } else {
        m.style.clipPath = "none";
        m.style.transform = "none";
      }
    };
    const tick = (now: number) => {
      raf = 0;
      if (dead) return;
      const dur = Math.max(0.1, duration);
      const t = (now - t0) / 1000 - delay;
      if (t < 0) { raf = requestAnimationFrame(tick); return; }
      const prog = Math.min(1, t / dur);
      const e = easeOutCubic(prog);
      const scale = 10 ** decimals;
      let n = from + (value - from) * e;
      n = prog >= 1 ? value : Math.floor(n * scale) / scale;
      const g = Math.max(0, glitch);
      const after = t - dur;
      let k = prog < 1 ? g * (0.35 + 0.65 * (1 - prog)) : 0;
      if (after >= 0 && after < 0.22) k = g * 0.9 * (1 - after / 0.22);
      const s = scramble(text(n), prog < 1 ? g * 0.55 * (1 - prog) ** 1.4 : 0);
      m.textContent = s;
      if (now - lastGlitch > 45) { lastGlitch = now; glitchFrame(k, s); }
      if (after >= 0.22) { m.textContent = text(value); clear(); return; }
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (started) return;
      started = true;
      if (rm) { m.textContent = text(value); return; }
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting && en.intersectionRatio >= Math.min(threshold, 0.99)) { start(); io.disconnect(); }
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 0.99] });
    io.observe(el);
    return () => { dead = true; if (raf) cancelAnimationFrame(raf); io.disconnect(); };
  }, [value, prefix, suffix, decimals, from, duration, delay, threshold, glitch, pad]);

  const layer: React.CSSProperties = { position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, willChange: "transform, clip-path" };
  return (
    <div ref={root} className={className} style={{ position: "relative", display: "inline-block", width: "max-content", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>{finalText}</span>
      <span aria-hidden="true" style={{ visibility: "hidden" }}>{finalText}</span>
      <span ref={a} aria-hidden="true" style={{ ...layer, color: colorA }} />
      <span ref={b} aria-hidden="true" style={{ ...layer, color: colorB }} />
      <span ref={main} aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", willChange: "transform" }}>{finalText}</span>
    </div>
  );
}
