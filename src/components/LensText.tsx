"use client";
// Lens Text — teks muncul dengan lensa blur yang menyapu kiri→kanan (port dari komponen Framer "Lens Text").
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type Easing = "power2.inOut" | "power3.out" | "expo.out" | "linear";
const EASE: Record<Easing, number> = { "power2.inOut": 0, "power3.out": 1, "expo.out": 2, linear: 3 };
const LEVELS = 8;
const MAX_LINES = 8;
const Q = 2;

const VS_COPY = `
precision highp float;
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos;
    gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}
`;
const FS_COPY = `
precision mediump float;
uniform sampler2D uTex;
varying vec2 vUv;
void main() {
    gl_FragColor = texture2D(uTex, vUv);
}
`;
const FS_BLUR = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
    vec4 sum = vec4(0.0);
    float wsum = 0.0;
    for (int i = -6; i <= 6; i++) {
        float x = float(i);
        float w = exp(-x * x / 8.0);
        sum += texture2D(uTex, vUv + uStep * x) * w;
        wsum += w;
    }
    gl_FragColor = sum / wsum;
}
`;
const VS_FINAL = `
precision highp float;
attribute vec2 aPos;
uniform vec2 uSize;
varying vec2 vUv;
varying vec2 vPos;
void main() {
    vUv = aPos;
    vPos = aPos * uSize;
    gl_Position = vec4(aPos.x * 2.0 - 1.0, 1.0 - aPos.y * 2.0, 0.0, 1.0);
}
`;
const FS_FINAL = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uL0;
uniform sampler2D uL1;
uniform sampler2D uL2;
uniform sampler2D uL3;
uniform sampler2D uL4;
uniform sampler2D uL5;
uniform sampler2D uL6;
uniform sampler2D uL7;
uniform float uSig[8];
uniform float uLevels;
uniform vec4 uLines[8];
uniform float uLineCount;
uniform float uElapsed;
uniform float uDuration;
uniform float uLineStagger;
uniform float uEase;
uniform vec2 uLensR;
uniform float uSigmaMax;
uniform float uGain;
uniform vec3 uColor;
uniform vec2 uMouse;
uniform float uHover;
varying vec2 vUv;
varying vec2 vPos;

float easeFn(float t) {
    if (uEase < 0.5) {
        float k = -2.0 * t + 2.0;
        return t < 0.5 ? 2.0 * t * t : 1.0 - k * k * 0.5;
    }
    if (uEase < 1.5) {
        float k = 1.0 - t;
        return 1.0 - k * k * k;
    }
    if (uEase < 2.5) {
        return t >= 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
    }
    return t;
}

float lensMask(vec2 p, vec2 c) {
    return 1.0 - smoothstep(-0.25, 1.0, length((p - c) / uLensR));
}

float lw(float f, float k) {
    return clamp(1.0 - abs(f - k), 0.0, 1.0);
}

void main() {
    float lensSum = 0.0;
    float maskSum = 0.0;
    float wSum = 0.0;
    for (int i = 0; i < 8; i++) {
        if (float(i) >= uLineCount) break;
        vec4 l = uLines[i];
        float cy = (l.x + l.y) * 0.5;
        float hh = max((l.y - l.x) * 0.5, 1.0);
        float dy = (vPos.y - cy) / hh;
        float w = exp(-dy * dy);
        float t = clamp((uElapsed - float(i) * uLineStagger) / max(uDuration, 0.0001), 0.0, 1.0);
        float lx = mix(l.z - uLensR.x * 1.4, l.w + uLensR.x * 1.4, easeFn(t));
        maskSum += w * (1.0 - smoothstep(lx - uLensR.x * 0.35, lx + uLensR.x * 0.7, vPos.x));
        lensSum += w * lensMask(vPos, vec2(lx, cy));
        wSum += w;
    }
    float mask = maskSum / max(wSum, 0.00001);
    float lens = lensSum / max(wSum, 0.00001);
    if (mask <= 0.001) {
        gl_FragColor = vec4(0.0);
        return;
    }
    if (uHover > 0.001) lens = max(lens, lensMask(vPos, uMouse) * uHover);

    float s = lens * uSigmaMax;
    float a;
    if (s < 0.3) {
        a = texture2D(uL0, vUv).a;
    } else {
        float f = 0.0;
        for (int k = 0; k < 7; k++) {
            if (float(k + 1) >= uLevels) break;
            float s0 = uSig[k];
            float s1 = uSig[k + 1];
            if (s >= s0) f = float(k) + clamp((s - s0) / max(s1 - s0, 0.0001), 0.0, 1.0);
        }
        a = texture2D(uL0, vUv).a * lw(f, 0.0)
          + texture2D(uL1, vUv).a * lw(f, 1.0)
          + texture2D(uL2, vUv).a * lw(f, 2.0)
          + texture2D(uL3, vUv).a * lw(f, 3.0)
          + texture2D(uL4, vUv).a * lw(f, 4.0)
          + texture2D(uL5, vUv).a * lw(f, 5.0)
          + texture2D(uL6, vUv).a * lw(f, 6.0)
          + texture2D(uL7, vUv).a * lw(f, 7.0);
    }

    a = clamp(a * mix(1.0, uGain, lens), 0.0, 1.0) * mask;
    gl_FragColor = vec4(uColor * a, a);
}
`;

type Char = { ch: string; x: number; y: number; w: number; h: number; base: number; line: number };
type Layout = { chars: Char[]; width: number; height: number; fontSize: number; fontCss: string };
type Tex = { tex: WebGLTexture; w: number; h: number };

function measure(el: HTMLElement): Layout | null {
  const rect = el.getBoundingClientRect();
  const w = el.offsetWidth, h = el.offsetHeight;
  if (!w || !h) return null;
  const scale = rect.width / w || 1;
  const cs = getComputedStyle(el);
  const fontSize = parseFloat(cs.fontSize) || 16;
  const fontCss = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const chars: Char[] = [];
  let line = -1, lastTop = -Infinity;
  el.querySelectorAll<HTMLElement>("[data-lt-char]").forEach((c) => {
    const r = c.getBoundingClientRect();
    const marker = c.firstElementChild as HTMLElement | null;
    const mr = marker ? marker.getBoundingClientRect() : r;
    const y = (r.top - rect.top) / scale;
    if (y > lastTop + fontSize * 0.5) { line++; lastTop = y; }
    chars.push({ ch: (c.textContent || "").trim(), x: (r.left - rect.left) / scale, y, w: r.width / scale, h: r.height / scale, base: (mr.top - rect.top) / scale, line });
  });
  return { chars, width: w, height: h, fontSize, fontCss };
}

function parseColor(c: string): [number, number, number] {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const v = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat);
    return [(v[0] || 0) / 255, (v[1] || 0) / 255, (v[2] || 0) / 255];
  }
  return [0, 0, 0];
}

class LensRenderer {
  gl: WebGLRenderingContext;
  canvas: HTMLCanvasElement;
  quad: WebGLBuffer;
  copyProg: WebGLProgram;
  blurProg: WebGLProgram;
  finalProg: WebGLProgram;
  loc: Record<string, WebGLUniformLocation | null> = {};
  levels: Tex[] = [];
  sig: number[] = [];
  lines = new Float32Array(MAX_LINES * 4);
  lineCount = 0;
  cssW = 1;
  cssH = 1;
  fontSize = 16;
  lineH = 16;
  sigmaMaxPx = 0;
  bleedX = 0;
  bleedY = 0;
  maxTex = 4096;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const attrs = { alpha: true, premultipliedAlpha: true, antialias: false };
    const gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
    if (!gl) throw new Error("no webgl");
    this.gl = gl;
    if ((gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS) || 0) < LEVELS) throw new Error("units");
    this.maxTex = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096, 4096);
    this.copyProg = this.program(VS_COPY, FS_COPY);
    this.blurProg = this.program(VS_COPY, FS_BLUR);
    this.finalProg = this.program(VS_FINAL, FS_FINAL);
    const q = gl.createBuffer();
    if (!q) throw new Error("buffer");
    this.quad = q;
    gl.bindBuffer(gl.ARRAY_BUFFER, q);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    for (const u of ["uSig", "uLevels", "uLines", "uLineCount", "uElapsed", "uDuration", "uLineStagger", "uEase", "uLensR", "uSigmaMax", "uGain", "uColor", "uMouse", "uHover", "uSize"])
      this.loc[u] = gl.getUniformLocation(this.finalProg, u);
    for (let i = 0; i < LEVELS; i++) this.loc[`uL${i}`] = gl.getUniformLocation(this.finalProg, `uL${i}`);
  }
  shader(type: number, src: string) {
    const gl = this.gl;
    const s = gl.createShader(type);
    if (!s) throw new Error("shader");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(log || "compile");
    }
    return s;
  }
  program(vs: string, fs: string) {
    const gl = this.gl;
    const p = gl.createProgram();
    if (!p) throw new Error("program");
    gl.attachShader(p, this.shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(p, this.shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
    return p;
  }
  createTex(w: number, h: number, src?: TexImageSource) {
    const gl = this.gl;
    const t = gl.createTexture();
    if (!t) throw new Error("texture");
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  pass(prog: WebGLProgram, src: Tex, dst: Tex, step?: [number, number]) {
    const gl = this.gl;
    const fb = gl.createFramebuffer();
    if (!fb) throw new Error("framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dst.tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(fb);
      throw new Error("fbo");
    }
    gl.viewport(0, 0, dst.w, dst.h);
    gl.disable(gl.BLEND);
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const a = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.tex);
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
    if (step) gl.uniform2f(gl.getUniformLocation(prog, "uStep"), step[0], step[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
  }
  blurInto(src: Tex, dst: Tex) {
    const tmp: Tex = { tex: this.createTex(dst.w, dst.h), w: dst.w, h: dst.h };
    this.pass(this.blurProg, src, tmp, [1 / src.w, 0]);
    this.pass(this.blurProg, tmp, dst, [0, 1 / tmp.h]);
    this.gl.deleteTexture(tmp.tex);
  }
  freeLevels() {
    for (const l of this.levels) this.gl.deleteTexture(l.tex);
    this.levels = [];
    this.sig = [];
  }
  build(layout: Layout, bx: number, by: number, sigmaMax: number) {
    const gl = this.gl;
    this.freeLevels();
    this.bleedX = bx;
    this.bleedY = by;
    this.fontSize = layout.fontSize;
    const cw = layout.width + bx * 2, ch = layout.height + by * 2;
    let q = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
    for (let i = 0; i < 12; i++) {
      W = Math.ceil((cw * q) / 128) * 128;
      H = Math.ceil((ch * q) / 128) * 128;
      if (W <= this.maxTex && H <= this.maxTex && W * H <= 6e6) break;
      q *= 0.85;
    }
    this.cssW = W / q;
    this.cssH = H / q;
    this.canvas.width = W;
    this.canvas.height = H;
    this.sigmaMaxPx = sigmaMax * q;
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const ctx = off.getContext("2d");
    if (!ctx) throw new Error("2d");
    ctx.setTransform(q, 0, 0, q, 0, 0);
    ctx.font = layout.fontCss;
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff";
    for (const c of layout.chars) if (c.ch) ctx.fillText(c.ch, c.x + bx, c.base + by);
    this.levels.push({ tex: this.createTex(W, H, off), w: W, h: H });
    this.sig.push(0);
    let variance = 0;
    for (let e = 1; e < LEVELS; e++) {
      const prev = this.levels[e - 1];
      if (e === 1) {
        const t: Tex = { tex: this.createTex(W, H), w: W, h: H };
        this.blurInto(prev, t);
        this.levels.push(t);
        variance = Q * Q;
      } else {
        const nw = prev.w / 2, nh = prev.h / 2;
        if (nw < 4 || nh < 4 || nw !== Math.floor(nw) || nh !== Math.floor(nh)) break;
        const half: Tex = { tex: this.createTex(nw, nh), w: nw, h: nh };
        this.pass(this.copyProg, prev, half);
        const t: Tex = { tex: this.createTex(nw, nh), w: nw, h: nh };
        this.blurInto(half, t);
        gl.deleteTexture(half.tex);
        this.levels.push(t);
        const a = 2 ** (e - 2), b = 2 ** (e - 1);
        variance = variance + 0.25 * a * a + Q * Q * b * b;
      }
      this.sig.push(Math.sqrt(variance));
      if (this.sig[e] >= this.sigmaMaxPx) break;
    }
    const lines = new Map<number, { top: number; bottom: number; left: number; right: number }>();
    for (const c of layout.chars) {
      if (!c.ch) continue;
      const l = lines.get(c.line);
      if (l) {
        l.top = Math.min(l.top, c.y);
        l.bottom = Math.max(l.bottom, c.y + c.h);
        l.left = Math.min(l.left, c.x);
        l.right = Math.max(l.right, c.x + c.w);
      } else lines.set(c.line, { top: c.y, bottom: c.y + c.h, left: c.x, right: c.x + c.w });
    }
    const sorted = Array.from(lines.entries()).sort((a, b) => a[0] - b[0]).slice(0, MAX_LINES);
    this.lines.fill(0);
    let maxH = 0;
    sorted.forEach(([, l], i) => {
      this.lines[i * 4] = l.top + by;
      this.lines[i * 4 + 1] = l.bottom + by;
      this.lines[i * 4 + 2] = l.left + bx;
      this.lines[i * 4 + 3] = l.right + bx;
      maxH = Math.max(maxH, l.bottom - l.top);
    });
    this.lineCount = sorted.length;
    this.lineH = maxH || layout.fontSize;
  }
  render(p: { elapsed: number; duration: number; lineStagger: number; ease: number; color: number[]; lensEm: number; gain: number; mouse: number[]; hover: number }) {
    const gl = this.gl;
    if (!this.levels.length) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.finalProg);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const a = gl.getAttribLocation(this.finalProg, "aPos");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < LEVELS; i++) {
      const lvl = this.levels[Math.min(i, this.levels.length - 1)];
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, lvl.tex);
      gl.uniform1i(this.loc[`uL${i}`], i);
    }
    const sig = new Float32Array(LEVELS);
    this.sig.forEach((v, i) => (sig[i] = v));
    for (let i = this.sig.length; i < LEVELS; i++) sig[i] = sig[this.sig.length - 1] + i;
    const rx = p.lensEm * this.fontSize;
    const ry = Math.max(this.lineH * 0.85, rx * 0.6);
    const L = this.loc;
    gl.uniform1fv(L.uSig, sig);
    gl.uniform1f(L.uLevels, this.levels.length);
    gl.uniform4fv(L.uLines, this.lines);
    gl.uniform1f(L.uLineCount, this.lineCount);
    gl.uniform1f(L.uElapsed, p.elapsed);
    gl.uniform1f(L.uDuration, p.duration);
    gl.uniform1f(L.uLineStagger, p.lineStagger);
    gl.uniform1f(L.uEase, p.ease);
    gl.uniform2f(L.uLensR, rx, ry);
    gl.uniform1f(L.uSigmaMax, this.sigmaMaxPx);
    gl.uniform1f(L.uGain, p.gain);
    gl.uniform3f(L.uColor, p.color[0], p.color[1], p.color[2]);
    gl.uniform2f(L.uMouse, p.mouse[0] + this.bleedX, p.mouse[1] + this.bleedY);
    gl.uniform1f(L.uHover, p.hover);
    gl.uniform2f(L.uSize, this.cssW, this.cssH);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  destroy() {
    const gl = this.gl;
    try {
      this.freeLevels();
      gl.deleteBuffer(this.quad);
      gl.deleteProgram(this.copyProg);
      gl.deleteProgram(this.blurProg);
      gl.deleteProgram(this.finalProg);
    } catch {}
  }
}

export type LensTextProps = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "span";
  className?: string;
  color?: string;
  fit?: boolean;
  fullWidth?: boolean;
  trigger?: "load" | "inView";
  threshold?: number;
  once?: boolean;
  duration?: number;
  delay?: number;
  lineStagger?: number;
  easing?: Easing;
  blur?: number;
  lens?: number;
  gain?: number;
  hover?: boolean;
  href?: string;
};

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;
const splitWords = (s: string) => s.split(/( +)/).filter((p) => p.length > 0);

export function LensText(props: LensTextProps) {
  const { text, as = "h2", className, color = "#0a0a0a", fit = false, fullWidth = false, href } = props;
  const root = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colorProbe = useRef<HTMLSpanElement>(null);
  const [mode, setMode] = useState<"pending" | "gl" | "html" | "fallback">("pending");
  const [revealed, setRevealed] = useState(false);
  const [fitSize, setFitSize] = useState<number | null>(null);
  const live = useRef(props);
  live.current = props;
  const normalized = (text || "").normalize("NFC");
  const lines = normalized.split("\n");

  useIso(() => {
    if (!fit) return;
    const el = root.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let raf = 0;
    const run = () => {
      raf = 0;
      const w = el.clientWidth;
      const chars = el.querySelectorAll<HTMLElement>("[data-lt-char]");
      if (!w || !chars.length) return;
      const r = el.getBoundingClientRect();
      const s = r.width / el.offsetWidth || 1;
      const rows = new Map<number, [number, number]>();
      chars.forEach((c) => {
        const cr = c.getBoundingClientRect();
        const top = Math.round((cr.top - r.top) / s);
        const left = (cr.left - r.left) / s;
        const right = left + cr.width / s;
        const cur = rows.get(top);
        rows.set(top, cur ? [Math.min(cur[0], left), Math.max(cur[1], right)] : [left, right]);
      });
      let widest = 0;
      rows.forEach(([a, b]) => (widest = Math.max(widest, b - a)));
      const fs = parseFloat(getComputedStyle(el).fontSize) || 16;
      if (!widest) return;
      const next = Math.floor(((fs * w) / widest) * 100) / 100;
      if (Math.abs(next - fs) > 0.4) setFitSize(next);
    };
    const ro = new ResizeObserver(() => { raf ||= requestAnimationFrame(run); });
    ro.observe(el);
    run();
    document.fonts?.ready?.then(() => { raf ||= requestAnimationFrame(run); });
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [fit, normalized]);

  useEffect(() => {
    const el = root.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let r: LensRenderer | null = null;
    let disposed = false, layout: Layout | null = null, raf = 0, rebuildRaf = 0, visible = true, ready = false;
    const st = { triggered: false, start: 0, done: false, color: [0, 0, 0], mouse: [-1e4, -1e4], mouseT: [-1e4, -1e4], hover: 0, hoverT: 0, last: 0 };
    const p = () => live.current;
    const readColor = () => { if (colorProbe.current) st.color = parseColor(getComputedStyle(colorProbe.current).color); };
    const lineCount = () => (layout ? layout.chars.reduce((m, c) => Math.max(m, c.line), 0) + 1 : 1);
    const total = () => (p().delay ?? 0) + (p().duration ?? 1.4) + (lineCount() - 1) * (p().lineStagger ?? 0.15);
    const elapsed = (now: number) => (st.triggered ? (now - st.start) / 1000 - (p().delay ?? 0) : -1e5);
    const draw = (now: number) => {
      if (!r) return;
      const q = p();
      r.render({ elapsed: elapsed(now), duration: q.duration ?? 1.4, lineStagger: q.lineStagger ?? 0.15, ease: EASE[q.easing ?? "power2.inOut"] ?? 0, color: st.color, lensEm: q.lens ?? 1.3, gain: q.gain ?? 1.5, mouse: st.mouse, hover: st.hover });
    };
    const frame = (now: number) => {
      raf = 0;
      if (disposed || !r) return;
      const dt = st.last ? Math.min((now - st.last) / 1000, 0.1) : 1 / 60;
      st.last = now;
      let busy = false;
      if (st.triggered && !st.done) {
        if (elapsed(now) + (p().delay ?? 0) >= total()) st.done = true;
        else busy = true;
      }
      const k = 1 - Math.exp(-8 * dt);
      st.mouse[0] += (st.mouseT[0] - st.mouse[0]) * k;
      st.mouse[1] += (st.mouseT[1] - st.mouse[1]) * k;
      st.hover += (st.hoverT - st.hover) * (1 - Math.exp(-6 * dt));
      if (Math.abs(st.hoverT - st.hover) > 0.002 || (st.hover > 0.002 && Math.hypot(st.mouseT[0] - st.mouse[0], st.mouseT[1] - st.mouse[1]) > 0.3)) busy = true;
      draw(now);
      const q = p();
      if (st.done && !busy && !(q.hover ?? false) && (q.once ?? true)) {
        r.destroy();
        r = null;
        setMode("html");
        return;
      }
      if (busy && visible) raf = requestAnimationFrame(frame);
      else st.last = 0;
    };
    const kick = () => { if (!raf && visible && r && !disposed) raf = requestAnimationFrame(frame); };
    const trigger = () => {
      if (st.triggered) return;
      st.triggered = true;
      st.done = false;
      st.start = performance.now();
      if (r) kick(); else setRevealed(true);
    };
    const reset = () => { st.triggered = false; st.done = false; if (r) draw(performance.now()); else setRevealed(false); };
    const local = (e: PointerEvent) => {
      const b = el.getBoundingClientRect();
      const s = b.width / el.offsetWidth || 1;
      return [(e.clientX - b.left) / s, (e.clientY - b.top) / s];
    };
    const onEnter = (e: PointerEvent) => { if (!(p().hover ?? false) || !r || reduced) return; st.mouseT = local(e); st.mouse = [...st.mouseT]; st.hoverT = 1; kick(); };
    const onMove = (e: PointerEvent) => { if (!(p().hover ?? false) || !r || reduced) return; st.mouseT = local(e); st.hoverT = 1; kick(); };
    const onLeave = () => { st.hoverT = 0; kick(); };
    const fail = () => {
      r?.destroy();
      r = null;
      setMode("fallback");
      if (st.triggered) setRevealed(true);
    };
    const rebuild = () => {
      rebuildRaf = 0;
      if (disposed || !r) return;
      layout = measure(el);
      if (!layout) return;
      const blur = p().blur ?? 0.3;
      const bx = layout.fontSize * Math.max(0.35, blur * 3.2 + 0.1);
      readColor();
      r.build(layout, bx, bx, blur * layout.fontSize);
      canvas.style.left = `${-bx}px`;
      canvas.style.top = `${-bx}px`;
      canvas.style.width = `${r.cssW}px`;
      canvas.style.height = `${r.cssH}px`;
      canvas.style.visibility = "visible";
      draw(performance.now());
    };
    const scheduleRebuild = () => { if (!rebuildRaf && !disposed && r) rebuildRaf = requestAnimationFrame(() => { try { rebuild(); } catch { fail(); } }); };
    let io: IntersectionObserver | null = null, ro: ResizeObserver | null = null;
    const observe = () => {
      if (typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver((entries) => {
          for (const en of entries) {
            visible = en.isIntersecting;
            const q = p();
            if ((q.trigger ?? "inView") === "inView" && en.isIntersecting && en.intersectionRatio >= Math.min(q.threshold ?? 0.3, 0.99)) trigger();
            if (!en.isIntersecting && !(q.once ?? true) && st.done) reset();
            if (visible) kick();
          }
        }, { threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.99] });
        io.observe(el);
      } else trigger();
      if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(scheduleRebuild); ro.observe(el); }
      if ((p().trigger ?? "inView") === "load") trigger();
    };
    const onLost = (e: Event) => { e.preventDefault(); fail(); };
    const init = () => {
      if (disposed) return;
      if (reduced) { setMode("fallback"); observe(); return; }
      try {
        r = new LensRenderer(canvas);
        rebuild();
        if (!layout) throw new Error("layout");
      } catch {
        r = null;
        setMode("fallback");
        observe();
        return;
      }
      ready = true;
      canvas.addEventListener("webglcontextlost", onLost);
      setMode("gl");
      observe();
      if (st.triggered) { st.start = performance.now(); kick(); }
    };
    const fonts = document.fonts;
    (fonts?.ready ?? Promise.resolve()).then(init, init);
    const onFonts = () => { if (ready) scheduleRebuild(); };
    fonts?.addEventListener?.("loadingdone", onFonts);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      if (rebuildRaf) cancelAnimationFrame(rebuildRaf);
      io?.disconnect();
      ro?.disconnect();
      fonts?.removeEventListener?.("loadingdone", onFonts);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      r?.destroy();
      r = null;
    };
  }, [normalized, color]);

  const showHtml = mode === "html" || (mode === "fallback" && revealed);
  const Tag = (href ? "a" : as) as React.ElementType;
  const style: React.CSSProperties = {
    position: "relative",
    display: "block",
    margin: 0,
    padding: 0,
    color: showHtml ? color : "transparent",
    opacity: mode === "fallback" && !revealed ? 0 : 1,
    transition: mode === "fallback" ? "opacity 0.8s cubic-bezier(0.45, 0, 0.55, 1)" : undefined,
    textDecoration: "none",
    overflow: "visible",
    WebkitTapHighlightColor: "transparent",
    width: fullWidth ? "100%" : "max-content",
    ...(fitSize ? { fontSize: fitSize } : null),
  };
  return (
    <Tag ref={root} className={className} style={style} aria-label={normalized.replace(/\n/g, " ")} {...(href ? { href } : {})}>
      <span aria-hidden="true">
        {lines.map((line, i) => (
          <span key={i} style={{ display: "block", whiteSpace: fit ? "nowrap" : "normal" }}>
            {line.length === 0
              ? " "
              : splitWords(line).map((w, j) =>
                  /^ +$/.test(w) ? (
                    w
                  ) : (
                    <span key={j} style={{ whiteSpace: "nowrap" }}>
                      {Array.from(w).map((ch, k) => (
                        <span key={k} data-lt-char="">
                          <span style={{ display: "inline-block", width: 0, height: 0 }} />
                          {ch}
                        </span>
                      ))}
                    </span>
                  ),
                )}
          </span>
        ))}
      </span>
      <span ref={colorProbe} aria-hidden="true" style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", color }} />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, visibility: "hidden", pointerEvents: "none", display: mode === "gl" || mode === "pending" ? "block" : "none" }}
      />
    </Tag>
  );
}
