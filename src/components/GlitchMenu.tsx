"use client";
// Glitch Menu — tombol MENU di nav + panel (sidebar di desktop/tablet, fullscreen di ponsel).
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*/<>_+=?";
const STRIPS = 9;
const OPEN_MS = 900;
const CLOSE_MS = 640;
const randChar = () => CHARS[Math.floor(Math.random() * CHARS.length)];

type Mode = "idle" | "in" | "out" | "hover";

function GlitchLabel({ text, mode, delay, duration, strength, colorA, colorB, reduced, style }: { text: string; mode: Mode; delay: number; duration: number; strength: number; colorA: string; colorB: string; reduced: boolean; style: React.CSSProperties }) {
  const main = useRef<HTMLSpanElement>(null);
  const a = useRef<HTMLSpanElement>(null);
  const b = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const m = main.current, ca = a.current, cb = b.current;
    if (!m || !ca || !cb) return;
    const settle = (show: boolean) => {
      m.textContent = text;
      m.style.opacity = show ? "1" : "0";
      m.style.transform = "none";
      m.style.clipPath = "none";
      ca.style.opacity = "0";
      cb.style.opacity = "0";
    };
    if (mode === "idle") { settle(true); return; }
    if (reduced) { settle(mode !== "out"); return; }
    let raf = 0, last = 0;
    const t0 = performance.now() + delay;
    const chars = Array.from(text);
    const slice = () => {
      const top = Math.random() * 85, h = 8 + Math.random() * 30;
      return `inset(${top.toFixed(1)}% 0 ${Math.max(0, 100 - top - h).toFixed(1)}% 0)`;
    };
    const tick = (now: number) => {
      const t = (now - t0) / duration;
      if (t < 0) { if (mode === "in") m.style.opacity = "0"; raf = requestAnimationFrame(tick); return; }
      const p = Math.min(1, t);
      const reveal = mode === "out" ? 1 - p : mode === "hover" ? p : p * 1.15;
      let s = "";
      chars.forEach((ch, i) => {
        const pos = i / Math.max(1, chars.length - 1);
        if (ch === " ") s += " ";
        else if (pos <= reveal - 0.08 || (mode === "hover" && Math.random() > 0.35)) s += ch;
        else s += randChar();
      });
      m.textContent = s;
      m.style.opacity = String(mode === "out" ? 1 - p * p : Math.min(1, p * 3));
      if (now - last > 45) {
        last = now;
        const k = strength * (1 - (mode === "in" ? p * 0.8 : 0));
        const on = Math.random() < 0.8 && k > 0.02;
        ca.textContent = s;
        cb.textContent = s;
        ca.style.opacity = on ? "1" : "0";
        cb.style.opacity = on && Math.random() < 0.7 ? "1" : "0";
        ca.style.clipPath = slice();
        cb.style.clipPath = slice();
        const off = (0.02 + Math.random() * 0.05) * k;
        ca.style.transform = `translate3d(${(-off).toFixed(3)}em, 0, 0)`;
        cb.style.transform = `translate3d(${off.toFixed(3)}em, 0, 0)`;
        if (Math.random() < 0.35 * k) {
          m.style.clipPath = Math.random() < 0.5 ? slice() : "none";
          m.style.transform = `translate3d(${((Math.random() - 0.5) * 0.06 * k).toFixed(3)}em, 0, 0) skewX(${((Math.random() - 0.5) * 10 * k).toFixed(1)}deg)`;
        } else {
          m.style.clipPath = "none";
          m.style.transform = "none";
        }
      }
      if (p < 1) raf = requestAnimationFrame(tick);
      else settle(mode !== "out");
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, mode, delay, duration, strength, reduced]);
  const layer: React.CSSProperties = { position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", pointerEvents: "none", opacity: 0, willChange: "transform, clip-path" };
  return (
    <span style={{ position: "relative", display: "inline-block", whiteSpace: "nowrap", ...style }}>
      <span aria-hidden="true" ref={a} style={{ ...layer, color: colorA }} />
      <span aria-hidden="true" ref={b} style={{ ...layer, color: colorB }} />
      <span ref={main} style={{ position: "relative", display: "inline-block", willChange: "transform" }}>{text}</span>
    </span>
  );
}

type Item = { label: string; href: string };
type Props = { brand: string; items: Item[]; email: string; socials: Item[]; openLabel?: string; closeLabel?: string };

type Layout = { sidebar: boolean; padding: number };
function useLayout(): Layout {
  const [l, setL] = useState<Layout>({ sidebar: true, padding: 48 });
  useEffect(() => {
    const read = () => {
      const w = window.innerWidth;
      setL(w < 810 ? { sidebar: false, padding: 16 } : w < 1200 ? { sidebar: true, padding: 32 } : { sidebar: true, padding: 48 });
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, []);
  return l;
}

export function GlitchMenu({ brand, items, email, socials, openLabel = "Menu", closeLabel = "Close" }: Props) {
  const router = useRouter();
  const { sidebar, padding } = useLayout();
  const [state, setState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const [hovered, setHovered] = useState(-1);
  const [anchor, setAnchor] = useState<{ top: number; height: number; right: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);
  const pending = useRef<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const strips = useRef(Array.from({ length: STRIPS }, (_, i) => ({ delay: 0, fromLeft: i % 2 === 0 })));
  const id = "glitch-menu";

  useEffect(() => {
    strips.current = Array.from({ length: STRIPS }, (_, i) => ({ delay: Math.round(Math.random() * 180), fromLeft: i % 2 === 0 ? Math.random() < 0.7 : Math.random() < 0.3 }));
    setMounted(true);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const measure = () => {
    const el = trigger.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const right = document.documentElement.clientWidth - r.right;
    return !r.width || !r.height || r.top < 0 || r.bottom > 160 || right < 0 || right > 160 ? null : { top: r.top, height: r.height, right };
  };

  const open = useCallback(() => {
    if (state !== "closed") return;
    window.clearTimeout(timer.current);
    setAnchor(measure());
    setState("opening");
    setShown(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    timer.current = window.setTimeout(() => setState("open"), reduced ? 150 : OPEN_MS);
  }, [state, reduced]);

  const close = useCallback((hash?: string) => {
    if (state === "closed" || state === "closing") return;
    pending.current = hash ?? null;
    window.clearTimeout(timer.current);
    setState("closing");
    timer.current = window.setTimeout(() => {
      setShown(false);
      setState("closed");
      trigger.current?.focus({ preventScroll: true });
    }, reduced ? 150 : CLOSE_MS);
    window.setTimeout(() => setShown(false), reduced ? 0 : CLOSE_MS * 0.35);
  }, [state, reduced]);

  useEffect(() => {
    if (state === "closed") return;
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    const hasBar = window.innerWidth > root.clientWidth;
    const prevGutter = root.style.getPropertyValue("scrollbar-gutter");
    if (hasBar) root.style.setProperty("scrollbar-gutter", "stable");
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "Tab" && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>("a[href], button"));
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    if (state === "opening") closeBtn.current?.focus({ preventScroll: true });
    return () => {
      root.style.overflow = prevOverflow;
      if (hasBar) { if (prevGutter) root.style.setProperty("scrollbar-gutter", prevGutter); else root.style.removeProperty("scrollbar-gutter"); }
      window.removeEventListener("keydown", onKey);
    };
  }, [state, close]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (state !== "closed" || !pending.current) return;
    const hash = pending.current;
    pending.current = null;
    const raf = requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(raf);
  }, [state, reduced]);

  const onItem = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    const url = new URL(href, window.location.href);
    const samePage = url.origin === window.location.origin && url.pathname === window.location.pathname;
    if (samePage && url.hash) { close(decodeURIComponent(url.hash.slice(1))); return; }
    close();
    if (!samePage) window.setTimeout(() => router.push(url.pathname + url.hash), reduced ? 150 : CLOSE_MS);
  };

  const modeFor = (i: number): Mode => (state === "opening" ? "in" : state === "closing" ? "out" : hovered === i ? "hover" : "idle");
  const isOpen = state !== "closed";
  const contentOpacity = state === "closing" || (state === "opening" && !shown) ? 0 : 1;
  const small: React.CSSProperties = { fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, letterSpacing: "0.02em", lineHeight: "1.3em", textTransform: "uppercase" };
  const fg = "#f4f3ef", muted = "rgba(244, 243, 239, 0.5)", bg = "#0a0a0a";
  const top = anchor ? anchor.top : 18;
  const right = anchor ? anchor.right : padding;

  const overlay = mounted && isOpen
    ? createPortal(
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          {sidebar ? (
            <div aria-hidden="true" onClick={() => close()} style={{ position: "absolute", inset: 0, background: "rgba(10, 10, 10, 0.72)", opacity: shown ? 1 : 0, transition: reduced ? "opacity 0.15s linear" : `opacity ${state === "closing" ? 0.3 : 0.36}s steps(4, end)` }} />
          ) : null}
          <div ref={panel} id={id} role="dialog" aria-modal="true" aria-label="Menu" style={sidebar ? { position: "absolute", top: 0, right: 0, bottom: 0, width: "min(520px, 100%)", color: fg } : { position: "absolute", inset: 0, color: fg }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
              {strips.current.map((s, i) => (
                <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${(i * 100) / STRIPS}%`, height: "11.511111111111111%", background: bg, transformOrigin: (sidebar ? i % 4 === 1 : s.fromLeft) ? "left" : "right", transform: reduced ? "none" : `scaleX(${shown ? 1 : 0})`, opacity: reduced ? (shown ? 1 : 0) : 1, transition: reduced ? "opacity 0.15s linear" : `transform ${state === "closing" ? 0.26 : 0.3}s steps(5, end) ${s.delay}ms` }} />
              ))}
            </div>
            <div style={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: `${top}px ${right}px ${padding + 8}px ${padding}px`, boxSizing: "border-box", opacity: contentOpacity, transition: `opacity ${state === "closing" ? 0.3 : 0.2}s linear ${state === "opening" ? 0.12 : 0}s` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", minHeight: anchor ? anchor.height : undefined, ...small, color: fg }}>
                <span>{brand}</span>
                <button ref={closeBtn} type="button" onClick={() => close()} aria-controls={id} aria-expanded="true" style={{ ...small, color: fg, background: "none", border: 0, padding: 0, cursor: "pointer" }}>{closeLabel}</button>
              </div>
              <nav aria-label="Main">
                <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                  {items.map((it, i) => (
                    <li key={it.label}>
                      <a href={it.href} onClick={(e) => onItem(e, it.href)} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(-1)} onFocus={() => setHovered(i)} onBlur={() => setHovered(-1)} style={{ display: "flex", alignItems: "baseline", gap: 14, color: fg, textDecoration: "none" }}>
                        <span style={{ ...small, color: muted, minWidth: "2.2em" }}>{String(i + 1).padStart(2, "0")}</span>
                        <GlitchLabel text={it.label} mode={modeFor(i)} delay={state === "opening" ? 160 + i * 70 : state === "closing" ? (items.length - 1 - i) * 45 : 0} duration={state === "opening" ? 460 : state === "closing" ? 300 : 280} strength={1} colorA="rgba(255, 40, 80, 0.9)" colorB="rgba(0, 190, 255, 0.9)" reduced={reduced} style={{ fontFamily: "var(--font-switzer), sans-serif", fontSize: 64, fontWeight: 500, letterSpacing: "-0.045em", lineHeight: "1em" }} />
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, ...small }}>
                {email ? <a href={`mailto:${email}`} style={{ color: fg, textDecoration: "none" }}>{email}</a> : null}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
                  {socials.map((s) => (
                    <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: muted, textDecoration: "none" }}>{s.label} ↗</a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button ref={trigger} type="button" onClick={open} aria-expanded={isOpen} aria-controls={id} aria-haspopup="dialog" className="nav-menu-btn">
        {openLabel}
      </button>
      {overlay}
    </>
  );
}
