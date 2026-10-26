"use client";
// Project Slider — carousel WebGL dengan tepi melengkung & RGB split saat digeser (port dari komponen Framer).
import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type SliderItem = { title: string; category: string; year: string; src: string; href: string };

type Settings = { slideWidth: number; gap: number; speed: number; titleSize: number; titleTracking: string };
const DESKTOP: Settings = { slideWidth: 44, gap: 22, speed: 2, titleSize: 96, titleTracking: "-0.045em" };
const TABLET: Settings = { slideWidth: 62, gap: 18, speed: 2, titleSize: 72, titleTracking: "-0.045em" };
const PHONE: Settings = { slideWidth: 82, gap: 8, speed: 1.6, titleSize: 44, titleTracking: "-0.04em" };
const RATIO = 56.28;
const DISTORTION = 1.85;
const ZOOM = 1;
const EASE = 0.075;
const INTERVAL = 1;

const VS = `
precision highp float;
attribute vec2 aUv;
uniform vec4 uRect;
uniform vec2 uRes;
uniform mediump float uVelo;
varying vec2 vUv;
#define M_PI 3.1415926535897932384626433832795
void main() {
    vec2 p = uRect.xy + aUv * uRect.zw;
    p.x += sin(aUv.y * M_PI) * uVelo * 0.125 * uRect.z;
    vUv = aUv;
    gl_Position = vec4(p.x / uRes.x * 2.0 - 1.0, 1.0 - p.y / uRes.y * 2.0, 0.0, 1.0);
}
`;
const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTexture;
uniform vec2 uMeshSize;
uniform vec4 uCover;
uniform mediump float uVelo;
uniform float uScale;
uniform float uRadius;
varying vec2 vUv;

float roundedMask(vec2 uv, vec2 size, float r) {
    if (r <= 0.0) return 1.0;
    vec2 p = (uv - 0.5) * size;
    vec2 q = abs(p) - size * 0.5 + r;
    float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    return 1.0 - smoothstep(-0.75, 0.75, d);
}

void main() {
    vec2 uv = vUv;
    vec2 texUv = uv * uCover.xy + uCover.zw;
    vec2 texScale = (texUv - 0.5) * uScale + 0.5;
    vec4 color = texture2D(uTexture, texScale);
    texScale.x += 0.15 * uVelo;
    color.g = texture2D(uTexture, texScale).g;
    texScale.x += 0.10 * uVelo;
    color.b = texture2D(uTexture, texScale).b;
    float m = roundedMask(uv, uMeshSize, uRadius);
    gl_FragColor = vec4(color.rgb * m, m);
}
`;

type Tex = { tex: WebGLTexture | null; w: number; h: number; ready: boolean; failed: boolean };

class SliderGL {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  program: WebGLProgram;
  buffer: WebGLBuffer;
  count: number;
  aUv: number;
  loc: Record<string, WebGLUniformLocation | null> = {};
  textures = new Map<string, Tex>();
  onTexture: () => void;
  cssW = 1;
  cssH = 1;
  constructor(canvas: HTMLCanvasElement, onTexture: () => void) {
    this.canvas = canvas;
    this.onTexture = onTexture;
    const attrs = { alpha: true, premultipliedAlpha: true, antialias: true };
    const gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
    if (!gl) throw new Error("no webgl");
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "compile");
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
    this.program = p;
    const seg = window.matchMedia?.("(pointer: coarse)").matches ? 16 : 32;
    const v: number[] = [];
    for (let y = 0; y < seg; y++)
      for (let x = 0; x < seg; x++) {
        const x0 = x / seg, x1 = (x + 1) / seg, y0 = y / seg, y1 = (y + 1) / seg;
        v.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
      }
    this.count = v.length / 2;
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(v), gl.STATIC_DRAW);
    this.aUv = gl.getAttribLocation(p, "aUv");
    for (const u of ["uRect", "uRes", "uVelo", "uTexture", "uMeshSize", "uCover", "uScale", "uRadius"]) this.loc[u] = gl.getUniformLocation(p, u);
  }
  resize(w: number, h: number) {
    const coarse = !!window.matchMedia?.("(pointer: coarse)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
    this.cssW = Math.max(1, w);
    this.cssH = Math.max(1, h);
    this.canvas.width = Math.round(this.cssW * dpr);
    this.canvas.height = Math.round(this.cssH * dpr);
  }
  texture(src: string) {
    const found = this.textures.get(src);
    if (found) return found;
    const t: Tex = { tex: null, w: 1, h: 1, ready: false, failed: false };
    this.textures.set(src, t);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      const gl = this.gl;
      try {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        const max = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096, 4096);
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        let source: TexImageSource = img;
        if (s < 1) {
          const c = document.createElement("canvas");
          c.width = Math.floor(img.naturalWidth * s);
          c.height = Math.floor(img.naturalHeight * s);
          c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
          source = c;
        }
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        t.tex = tex;
        t.w = img.naturalWidth;
        t.h = img.naturalHeight;
        t.ready = true;
      } catch {
        t.failed = true;
      }
      this.onTexture();
    };
    img.onerror = () => { t.failed = true; this.onTexture(); };
    img.src = src;
    return t;
  }
  begin() {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.aUv);
    gl.vertexAttribPointer(this.aUv, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.loc.uRes, this.cssW, this.cssH);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(this.loc.uTexture, 0);
  }
  drawPlane(t: Tex, x: number, y: number, w: number, h: number, velo: number, scale: number, radius: number) {
    const gl = this.gl;
    if (!t.ready || !t.tex) return;
    gl.bindTexture(gl.TEXTURE_2D, t.tex);
    gl.uniform4f(this.loc.uRect, x, y, w, h);
    gl.uniform1f(this.loc.uVelo, velo);
    gl.uniform2f(this.loc.uMeshSize, w, h);
    const plane = w / Math.max(h, 1), img = t.w / Math.max(t.h, 1);
    if (plane < img) { const k = plane / img; gl.uniform4f(this.loc.uCover, k, 1, (1 - k) / 2, 0); }
    else { const k = img / plane; gl.uniform4f(this.loc.uCover, 1, k, 0, (1 - k) / 2); }
    gl.uniform1f(this.loc.uScale, scale);
    gl.uniform1f(this.loc.uRadius, radius);
    gl.drawArrays(gl.TRIANGLES, 0, this.count);
  }
  destroy() {
    const gl = this.gl;
    try {
      this.textures.forEach((t) => t.tex && gl.deleteTexture(t.tex));
      gl.deleteBuffer(this.buffer);
      gl.deleteProgram(this.program);
    } catch {}
    this.textures.clear();
  }
}

const wrap = (min: number, max: number, v: number) => { const r = max - min; return (((v - min) % r) + r) % r + min; };
const clamp = (a: number, b: number, v: number) => Math.min(b, Math.max(a, v));
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

export function ProjectSlider({ items }: { items: SliderItem[] }) {
  const router = useRouter();
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cards = useRef<(HTMLAnchorElement | null)[]>([]);
  const titleTrack = useRef<HTMLDivElement>(null);
  const barA = useRef<HTMLDivElement>(null);
  const barB = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<Settings>(DESKTOP);
  const G = items.length;

  useIso(() => {
    const el = host.current;
    if (!el) return;
    const read = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
      const vw = window.innerWidth;
      setSettings(vw < 810 ? PHONE : vw < 1200 ? TABLET : DESKTOP);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const W = size.w || 1200, H = size.h || 760;
    const square = W < 640;
    const ratio = square ? 100 : RATIO;
    let sw = (W * settings.slideWidth) / 100;
    let sh = (sw * ratio) / 100;
    const maxH = H * (square ? 0.7 : 0.78);
    if (sh > maxH) { sh = maxH; sw = (sh * 100) / ratio; }
    const step = sw * (1 + settings.gap / 100);
    const reps = G ? Math.max(1, Math.ceil((W + step * 2) / (G * step))) : 1;
    return { W, H, sw, sh, step, reps, total: G * reps * step, startX: (W - sw) / 2, top: (H - sh) / 2, square };
  }, [size.w, size.h, settings, G]);

  const slides = useMemo(() => {
    const out: (SliderItem & { index: number; copy: number })[] = [];
    for (let c = 0; c < geo.reps; c++) items.forEach((it, i) => out.push({ ...it, index: i, copy: c }));
    return out;
  }, [items, geo.reps]);

  const state = useRef({ target: 0, current: 0, off: 0, downX: 0, downY: 0, dragging: false, moved: false, diff: 0, dirty: true, step: 0 });
  const geoRef = useRef(geo); geoRef.current = geo;
  const slidesRef = useRef(slides); slidesRef.current = slides;
  const settingsRef = useRef(settings); settingsRef.current = settings;
  const glRef = useRef<SliderGL | null>(null);
  const kickRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = host.current;
    if (!el || !G) return;
    const s = state.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, visible = true, wheelT = 0, disposed = false, last = 0, autoT = 0, hovering = false, focused = false, lastInteract = -1e9;
    let hidden = document.hidden;
    const render = () => {
      const g = geoRef.current, list = slidesRef.current, gl = glRef.current;
      const { W, sw, sh, step, total, startX, top } = g;
      const velo = reduced ? 0 : s.diff * DISTORTION;
      gl?.begin();
      for (let i = 0; i < list.length; i++) {
        const card = cards.current[i];
        const x = startX + wrap(-startX - step, total - startX - step, i * step + s.current);
        if (card) card.style.transform = `translate3d(${x - startX}px,0,0)`;
        if (!gl || x + sw < -50 || x > W + 50) continue;
        const it = list[i];
        if (!it.src) continue;
        const t = gl.texture(it.src);
        const b = clamp(0, 1, 1 - (x + sw) / (W + sw));
        const z = reduced || g.square ? 1 : ZOOM;
        gl.drawPlane(t, x, top, sw, sh, velo, z + (1 - z) * b, 0);
      }
      const h = (((-s.current / step) % G) + G) % G;
      const prog = h / G;
      if (titleTrack.current) titleTrack.current.style.transform = `translate3d(0, ${(-h / (G + 1)) * 100}%, 0)`;
      if (barA.current) barA.current.style.transform = `scaleX(${prog})`;
      if (barB.current) barB.current.style.transform = `scaleX(${1 - easeOutCubic(clamp(0, 1, prog * 2))})`;
    };
    const autoplay = () => !reduced;
    const minGap = () => Math.max(2000, INTERVAL * 1000);
    const paused = () => !visible || hidden || s.dragging || focused || (hovering && false);
    const clearAuto = () => { if (autoT) window.clearTimeout(autoT); autoT = 0; };
    const scheduleAuto = () => {
      clearAuto();
      if (!autoplay() || paused() || disposed) return;
      const since = performance.now() - lastInteract;
      const wait = Math.max(INTERVAL * 1000, Math.max(0, minGap() - since));
      autoT = window.setTimeout(() => {
        autoT = 0;
        if (!autoplay() || paused()) return;
        if (performance.now() - lastInteract < minGap()) { scheduleAuto(); return; }
        const st = geoRef.current.step;
        s.target = Math.round(s.target / st) * st - st;
        kick();
        scheduleAuto();
      }, wait);
    };
    const interact = () => { lastInteract = performance.now(); clearAuto(); };
    const frame = (now: number) => {
      raf = 0;
      if (disposed) return;
      last = now;
      s.current += (s.target - s.current) * EASE;
      if (Math.abs(s.target - s.current) < 0.01) s.current = s.target;
      s.diff = (s.target - s.current) * 5e-4;
      render();
      if ((s.current !== s.target || s.dragging || s.dirty) && visible) { s.dirty = false; raf = requestAnimationFrame(frame); }
      else { last = 0; if (!autoT) scheduleAuto(); }
    };
    const kick = () => { s.dirty = true; if (!raf && visible && !disposed) raf = requestAnimationFrame(frame); };
    kickRef.current = kick;
    const snap = () => { const st = geoRef.current.step; s.target = Math.round(s.target / st) * st; };
    const down = (e: PointerEvent) => {
      if (e.button !== undefined && e.button > 0) return;
      s.dragging = true; s.moved = false; s.downX = e.clientX; s.downY = e.clientY; s.off = s.target;
      el.style.cursor = "grabbing";
      interact(); kick();
    };
    const move = (e: PointerEvent) => {
      if (!s.dragging) return;
      const dx = e.clientX - s.downX, dy = e.clientY - s.downY;
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) s.moved = true;
      s.target = s.off + dx * settingsRef.current.speed;
      kick();
    };
    const up = () => { if (!s.dragging) return; s.dragging = false; el.style.cursor = "grab"; interact(); snap(); kick(); };
    const clickCapture = (e: MouseEvent) => { if (s.moved) { e.preventDefault(); e.stopPropagation(); s.moved = false; } };
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault(); interact();
      s.target -= e.deltaX; kick();
      window.clearTimeout(wheelT);
      wheelT = window.setTimeout(() => { snap(); kick(); }, 160);
    };
    const key = (e: KeyboardEvent) => {
      const st = geoRef.current.step;
      if (e.key === "ArrowRight") s.target -= st;
      else if (e.key === "ArrowLeft") s.target += st;
      else return;
      e.preventDefault(); interact(); snap(); kick();
    };
    const noDrag = (e: Event) => e.preventDefault();
    const enter = (e: PointerEvent) => { if (e.pointerType === "mouse") hovering = true; };
    const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") { hovering = false; kick(); } };
    const focusIn = (e: FocusEvent) => { let fv = false; try { fv = !!(e.target as HTMLElement)?.matches(":focus-visible"); } catch {} if (fv) { focused = true; clearAuto(); } };
    const focusOut = (e: FocusEvent) => { if (e.relatedTarget && el.contains(e.relatedTarget as Node)) return; focused = false; kick(); };
    const vis = () => { hidden = document.hidden; if (hidden) clearAuto(); else kick(); };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    el.addEventListener("click", clickCapture, true);
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("keydown", key);
    el.addEventListener("dragstart", noDrag);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("focusin", focusIn);
    el.addEventListener("focusout", focusOut);
    document.addEventListener("visibilitychange", vis);
    const canvas = canvasRef.current;
    const onLost = (e: Event) => { e.preventDefault(); glRef.current = null; setReady({}); };
    if (canvas) {
      try {
        const gl = new SliderGL(canvas, () => {
          if (glRef.current !== gl) return;
          const r: Record<string, boolean> = {};
          gl.textures.forEach((t, src) => { if (t.ready) r[src] = true; });
          setReady(r);
          kick();
        });
        glRef.current = gl;
        gl.resize(geoRef.current.W, geoRef.current.H);
        items.forEach((it) => it.src && gl.texture(it.src));
        canvas.addEventListener("webglcontextlost", onLost);
      } catch (err) {
        console.warn("[ProjectSlider] WebGL disabled:", err);
        glRef.current = null;
      }
    }
    const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; if (visible) kick(); else clearAuto(); });
    io.observe(el);
    kick();
    return () => {
      disposed = true;
      kickRef.current = () => {};
      if (raf) cancelAnimationFrame(raf);
      window.clearTimeout(wheelT);
      clearAuto();
      io.disconnect();
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      el.removeEventListener("click", clickCapture, true);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("keydown", key);
      el.removeEventListener("dragstart", noDrag);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("focusin", focusIn);
      el.removeEventListener("focusout", focusOut);
      document.removeEventListener("visibilitychange", vis);
      canvas?.removeEventListener("webglcontextlost", onLost);
      glRef.current?.destroy();
      glRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [G > 0]);

  useEffect(() => {
    const s = state.current, gl = glRef.current;
    if (gl) { gl.resize(geo.W, geo.H); items.forEach((it) => it.src && gl.texture(it.src)); }
    if (s.step !== geo.step) {
      const old = s.step || geo.step;
      s.target = Math.round(s.target / old) * geo.step;
      s.current = s.target;
      s.step = geo.step;
    }
    kickRef.current();
  }, [geo, slides, items]);

  const longest = items.reduce((m, it) => (it.title.length > m.length ? it.title : m), "");
  const titleStyle: React.CSSProperties = { fontFamily: "var(--font-switzer), sans-serif", fontSize: settings.titleSize, fontWeight: 500, letterSpacing: settings.titleTracking, lineHeight: "1.05em", color: "var(--on-dark)", display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", margin: 0 };

  return (
    <div ref={host} role="region" aria-roledescription="carousel" aria-label="Projects" tabIndex={0} style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", cursor: "grab", userSelect: "none", WebkitUserSelect: "none", touchAction: "pan-y", outline: "none" }}>
      <canvas ref={canvasRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        {slides.map((it, i) => (
          <Link
            key={`${it.href}-${it.copy}`}
            ref={(el) => { cards.current[i] = el; }}
            href={it.href}
            draggable={false}
            aria-label={it.title}
            tabIndex={it.copy === 0 ? 0 : -1}
            onClick={(e) => { if (e.defaultPrevented) return; e.preventDefault(); router.push(it.href); }}
            style={{ position: "absolute", left: geo.startX, top: geo.top, width: geo.sw, height: geo.sh, display: "block", color: "inherit", textDecoration: "none", willChange: "transform", transform: `translate3d(${i * geo.step}px,0,0)` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={it.src} alt={it.title} draggable={false} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: ready[it.src] ? 0 : 1, transition: "opacity 0.3s", pointerEvents: "none" }} />
            <div className="t-mono" style={{ position: "absolute", left: 0, right: 0, top: "100%", marginTop: 16, display: "flex", justifyContent: "space-between", gap: 16, fontSize: 12, letterSpacing: "0.02em", lineHeight: "1.2em", color: "var(--on-dark-muted)", pointerEvents: "none" }}>
              <span>{String(it.index + 1).padStart(2, "0")}{it.category ? `_${it.category}` : ""}</span>
              <span>{it.year}</span>
            </div>
          </Link>
        ))}
      </div>
      {G > 0 && (
        <div aria-hidden="true" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", overflow: "hidden", pointerEvents: "none", zIndex: 2, mixBlendMode: "difference" }}>
          <div style={{ ...titleStyle, visibility: "hidden" }}>{longest}</div>
          <div ref={titleTrack} style={{ position: "absolute", top: 0, left: 0, right: 0, willChange: "transform" }}>
            {[...items, items[0]].map((it, i) => (<div key={i} style={titleStyle}>{it.title}</div>))}
          </div>
        </div>
      )}
      <div aria-hidden="true" style={{ position: "absolute", left: 0, bottom: 0, width: "100%", height: 3, overflow: "hidden", pointerEvents: "none", zIndex: 2 }}>
        <div ref={barA} style={{ position: "absolute", inset: 0, background: "var(--on-dark)", transformOrigin: "left", transform: "scaleX(0)" }} />
        <div ref={barB} style={{ position: "absolute", inset: 0, background: "var(--on-dark)", transformOrigin: "right", transform: "scaleX(1)" }} />
      </div>
    </div>
  );
}
