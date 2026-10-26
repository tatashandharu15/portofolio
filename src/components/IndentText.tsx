"use client";
// Indent Text — kalimat besar dengan indent baris pertama, kata-kata menyala saat di-scroll.
import { useEffect, useRef } from "react";

type Props = { text: string; as?: "p" | "h2" | "h3"; className?: string; dimOpacity?: number };

export function IndentText({ text, as = "h2", className, dimOpacity = 0.16 }: Props) {
  const ref = useRef<HTMLElement>(null);
  const parts = (text || "").split(/(\s+)/);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      el?.querySelectorAll<HTMLElement>("[data-word]").forEach((w) => (w.style.opacity = "1"));
      return;
    }
    const words = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
    let raf = 0, inView = false;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const start = vh * 0.85, end = vh * 0.45;
      const p = (start - r.top) / (start - end + r.height);
      const n = words.length;
      words.forEach((w, i) => {
        const v = Math.min(1, Math.max(0, p * (n + 4) - i));
        w.style.opacity = String(dimOpacity + (1 - dimOpacity) * v);
      });
    };
    const schedule = () => { if (inView && !raf) raf = requestAnimationFrame(update); };
    const io = new IntersectionObserver((e) => { inView = e[0]?.isIntersecting ?? false; schedule(); });
    io.observe(el);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => { io.disconnect(); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); if (raf) cancelAnimationFrame(raf); };
  }, [text, dimOpacity]);
  const Tag = as as React.ElementType;
  return (
    <Tag ref={ref} className={className} style={{ margin: 0, width: "100%", whiteSpace: "pre-wrap" }}>
      {parts.map((w, i) => (/^\s+$/.test(w) ? w : <span key={i} data-word="" style={{ opacity: dimOpacity, transition: "opacity 0.25s linear" }}>{w}</span>))}
    </Tag>
  );
}
