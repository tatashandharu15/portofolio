"use client";
// Skills — ikon tools & bahasa: marquee berjalan, garis ikon "digambar" saat masuk layar,
// nama di-scramble ala glitch, hover memberi efek RGB-split seperti slider proyek.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Skill, SkillGroup } from "@/content/skills";
import { IndentText } from "./IndentText";

const CHARS = "#%&/<>_=+*01ABCDEFXYZ";

function useScramble(text: string, duration = 520) {
  const [out, setOut] = useState(text);
  const raf = useRef(0);
  const run = useCallback(
    (delay = 0) => {
      cancelAnimationFrame(raf.current);
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setOut(text);
      const start = performance.now() + delay;
      const tick = (now: number) => {
        const p = Math.max(0, (now - start) / duration);
        const shown = Math.floor(p * text.length);
        setOut(
          text
            .split("")
            .map((c, i) => (c === " " || i < shown ? c : CHARS[Math.floor(Math.random() * CHARS.length)]))
            .join(""),
        );
        if (p < 1) raf.current = requestAnimationFrame(tick);
        else setOut(text);
      };
      raf.current = requestAnimationFrame(tick);
    },
    [text, duration],
  );
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  return [out, run] as const;
}

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <path d={path} pathLength={1} />
    </svg>
  );
}

function Tile({ skill, index, code, inView }: { skill: Skill; index: number; code: string; inView: boolean }) {
  const [name, scramble] = useScramble(skill.name);
  useEffect(() => {
    if (inView) scramble(380 + index * 70);
  }, [inView, index, scramble]);
  return (
    <li className="skill-tile" style={{ "--i": index } as CSSProperties} onMouseEnter={() => scramble(0)}>
      <span className="t-mono skill-tile__idx">{code}</span>
      <Icon path={skill.path} className="skill-icon" />
      <span className="t-mono skill-tile__name" aria-label={skill.name}>{name}</span>
    </li>
  );
}

function Group({ id, title, items }: { id: string; title: string; items: Skill[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="grid12 skills-group" data-in={inView || undefined}>
      <div className="skills-group__head">
        <p className="t-mono">{id}_{title}</p>
        <p className="t-mono skills-muted">({String(items.length).padStart(2, "0")})</p>
      </div>
      <ul className="skills-grid">
        {items.map((s, i) => (
          <Tile key={s.name} skill={s} index={i} code={`${id}.${String(i + 1).padStart(2, "0")}`} inView={inView} />
        ))}
      </ul>
    </div>
  );
}

export function Skills({ intro, groups }: { intro: { label: string; statement: string }; groups: SkillGroup[] }) {
  const all = groups.flatMap((g) => g.items);
  const row = (
    <ul className="skills-marquee__row">
      {all.map((s, i) => (
        <li key={`${s.name}-${i}`} className="skills-marquee__item">
          <Icon path={s.path} className="skills-marquee__icon" />
          <span className="t-mono">{s.name}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section id="skills" className="skills" data-name="Skills">
      <div className="grid12 px skills-head">
        <p className="t-mono skills-head__label">{intro.label}</p>
        <div className="skills-head__text">
          <IndentText text={intro.statement} as="h2" className="statement" dimOpacity={0.2} />
        </div>
      </div>
      <div className="skills-marquee" aria-hidden="true">
        <div className="skills-marquee__track">
          {row}
          {row}
        </div>
      </div>
      <div className="px skills-groups">
        {groups.map((g) => <Group key={g.id} {...g} />)}
      </div>
    </section>
  );
}
