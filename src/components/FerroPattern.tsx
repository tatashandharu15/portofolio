"use client";
// Ferrofluid Pattern — pola reaksi-difusi (Gray-Scott) untuk halaman 404 (port dari komponen Framer).
import { useEffect, useRef } from "react";

const PATTERNS = { maze: [0.029, 0.057], worms: [0.042, 0.061], coral: [0.0545, 0.062], dots: [0.035, 0.065] } as const;
type Pattern = keyof typeof PATTERNS;

const VS = `
precision highp float;
attribute vec2 aPos;
varying vec2 vUv;
void main() {
    vUv = aPos;
    gl_Position = vec4(aPos * 2.0 - 1.0, 0.0, 1.0);
}
`;
const COMMON = `
precision highp float;
uniform sampler2D uState;
uniform vec2 uTexel;
uniform vec2 uSize;
vec4 tex(vec2 uv) {
    return texture2D(uState, uv);
}
vec4 bilinear(vec2 uv) {
    vec2 st = uv * uSize - 0.5;
    vec2 i = floor(st);
    vec2 f = st - i;
    vec2 base = (i + 0.5) * uTexel;
    vec4 a = tex(base);
    vec4 b = tex(base + vec2(uTexel.x, 0.0));
    vec4 c = tex(base + vec2(0.0, uTexel.y));
    vec4 d = tex(base + uTexel);
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
`;
const FS_SEED = `${COMMON}
uniform float uAspect;
uniform float uShape;
uniform float uSeed;
varying vec2 vUv;
void main() {
    vec2 p = (vUv - 0.5) * (uAspect > 1.0 ? vec2(uAspect, 1.0) : vec2(1.0, 1.0 / uAspect));
    vec2 cell = floor(vUv * uSize / 3.0);
    float n = hash(cell + uSeed);
    float inside = uShape > 0.5 ? step(length(p), 0.07) : 1.0;
    float v = step(uShape > 0.5 ? 0.55 : 0.985, n) * inside;
    gl_FragColor = vec4(1.0 - v * 0.5, v * 0.25, 0.0, 1.0);
}
`;
const FS_STEP = `${COMMON}
uniform float uF;
uniform float uK;
uniform float uAspect;
uniform float uShape;
uniform float uRadius;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uMouseVel;
uniform float uMouseOn;
uniform float uMouseR;
varying vec2 vUv;

vec2 S(vec2 uv, float bil) {
    return bil > 0.5 ? bilinear(uv).rg : tex(uv).rg;
}

vec2 toP(vec2 uv) {
    return (uv - 0.5) * (uAspect > 1.0 ? vec2(uAspect, 1.0) : vec2(1.0, 1.0 / uAspect));
}

void main() {
    vec2 p = toP(vUv);
    vec2 dm = p - toP(uMouse);
    float g = exp(-dot(dm, dm) / (uMouseR * uMouseR)) * uMouseOn;
    vec2 uv = vUv - uMouseVel * g;
    float bil = step(0.000001, g * length(uMouseVel));

    vec2 c = S(uv, bil);
    vec2 n = S(uv + vec2(0.0, uTexel.y), bil);
    vec2 s = S(uv - vec2(0.0, uTexel.y), bil);
    vec2 e = S(uv + vec2(uTexel.x, 0.0), bil);
    vec2 w = S(uv - vec2(uTexel.x, 0.0), bil);
    vec2 ne = S(uv + uTexel, bil);
    vec2 nw = S(uv + vec2(-uTexel.x, uTexel.y), bil);
    vec2 se = S(uv + vec2(uTexel.x, -uTexel.y), bil);
    vec2 sw = S(uv - uTexel, bil);
    vec2 lap = -c + 0.2 * (n + s + e + w) + 0.05 * (ne + nw + se + sw);

    float region = 1.0;
    if (uShape > 0.5) {
        float a = atan(p.y, p.x);
        float edge = uRadius * (1.0
            + 0.07 * sin(a * 5.0 + uTime * 0.35)
            + 0.05 * sin(a * 9.0 - uTime * 0.5)
            + 0.04 * sin(a * 3.0 + uTime * 0.2)
            + 0.05 * sin(uTime * 0.27));
        region = 1.0 - smoothstep(edge * 0.62, edge * 1.12, length(p));
    }
    region = max(region, smoothstep(0.02, 0.35, g));

    float u = c.r;
    float v = c.g;
    float k = mix(0.0665, uK, region);
    float f = uF;
    float r = u * v * v;
    u += 1.0 * lap.r - r + f * (1.0 - u);
    v += 0.5 * lap.g + r - (f + k) * v;
    v += g * 0.06 * clamp(length(uMouseVel) * 400.0, 0.0, 1.0) * step(0.8, hash(vUv * uSize + uTime));

    gl_FragColor = vec4(clamp(u, 0.0, 1.0), clamp(v, 0.0, 1.0), 0.0, 1.0);
}
`;
const FS_DRAW = `${COMMON}
uniform vec3 uInk;
uniform float uGloss;
uniform float uShadow;
uniform vec2 uShadowOff;
varying vec2 vUv;

float ink(vec2 uv) {
    return smoothstep(0.195, 0.245, bilinear(uv).g);
}

void main() {
    float a = ink(vUv);
    float sh = ink(vUv - uShadowOff) * uShadow;
    float hx = bilinear(vUv + vec2(uTexel.x, 0.0)).g - bilinear(vUv - vec2(uTexel.x, 0.0)).g;
    float hy = bilinear(vUv + vec2(0.0, uTexel.y)).g - bilinear(vUv - vec2(0.0, uTexel.y)).g;
    vec3 nrm = normalize(vec3(-hx * 3.0, -hy * 3.0, 1.0));
    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));
    float spec = pow(max(dot(reflect(-L, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 18.0) * uGloss;
    vec3 col = uInk + vec3(spec * 0.55);
    vec3 outC = col * a + uInk * sh * 0.35 * (1.0 - a);
    float outA = a + sh * 0.35 * (1.0 - a);
    gl_FragColor = vec4(outC, outA);
}
`;

type Fmt = { internal: number; format: number; type: number };
function floatFormat(gl: WebGLRenderingContext | WebGL2RenderingContext): Fmt | null {
  const isGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  const list: Fmt[] = [];
  if (isGL2) {
    const g = gl as WebGL2RenderingContext;
    if (g.getExtension("EXT_color_buffer_half_float") || g.getExtension("EXT_color_buffer_float")) list.push({ internal: g.RGBA16F, format: g.RGBA, type: g.HALF_FLOAT });
    if (g.getExtension("EXT_color_buffer_float")) list.push({ internal: g.RGBA32F, format: g.RGBA, type: g.FLOAT });
  } else {
    const half = gl.getExtension("OES_texture_half_float");
    gl.getExtension("EXT_color_buffer_half_float");
    if (half) list.push({ internal: gl.RGBA, format: gl.RGBA, type: half.HALF_FLOAT_OES });
    if (gl.getExtension("OES_texture_float")) { gl.getExtension("WEBGL_color_buffer_float"); list.push({ internal: gl.RGBA, format: gl.RGBA, type: gl.FLOAT }); }
  }
  for (const f of list) {
    const t = gl.createTexture(), fb = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, f.internal, 4, 4, 0, f.format, f.type, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.deleteTexture(t);
    if (ok) return f;
  }
  return null;
}

function rgb(c: string): [number, number, number] {
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) { const v = m[1].split(/[ ,/]+/).filter(Boolean).map(parseFloat); return [(v[0] || 0) / 255, (v[1] || 0) / 255, (v[2] || 0) / 255]; }
  return [0.04, 0.04, 0.04];
}

type Props = { color?: string; pattern?: Pattern; shape?: "radial" | "fill"; radius?: number; scale?: number; speed?: number; interactive?: boolean; cursorSize?: number; gloss?: number; shadow?: number };

export function FerroPattern({ color = "#0A0A0A", pattern = "maze", shape = "radial", radius = 80, scale = 3, speed = 1, interactive = true, cursorSize = 10, gloss = 1, shadow = 1 }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = host.current, canvas = canvasRef.current;
    if (!el || !canvas) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const attrs = { alpha: true, premultipliedAlpha: true, antialias: false };
    const gl = (canvas.getContext("webgl2", attrs) || canvas.getContext("webgl", attrs)) as WebGLRenderingContext | null;
    if (!gl) return;
    const fmt = floatFormat(gl);
    if (!fmt) { console.warn("[FerroPattern] float render targets are not supported"); return; }
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "compile");
      return s;
    };
    const prog = (fs: string) => {
      const p = gl.createProgram()!;
      gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
      return p;
    };
    let seedP: WebGLProgram, stepP: WebGLProgram, drawP: WebGLProgram;
    try { seedP = prog(FS_SEED); stepP = prog(FS_STEP); drawP = prog(FS_DRAW); } catch (e) { console.warn("[FerroPattern] WebGL disabled:", e); return; }
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    const locs = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
    const U = (p: WebGLProgram, n: string) => {
      let m = locs.get(p);
      if (!m) locs.set(p, (m = new Map()));
      if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n));
      return m.get(n)!;
    };
    let w = 0, h = 0, cssW = 1, cssH = 1;
    let texA: WebGLTexture | null = null, texB: WebGLTexture | null = null, fbA: WebGLFramebuffer | null = null, fbB: WebGLFramebuffer | null = null;
    const seed = Math.random() * 100;
    const makeTarget = () => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, fmt.internal, w, h, 0, fmt.format, fmt.type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fb = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { t, fb };
    };
    const freeTargets = () => {
      if (texA) gl.deleteTexture(texA);
      if (texB) gl.deleteTexture(texB);
      if (fbA) gl.deleteFramebuffer(fbA);
      if (fbB) gl.deleteFramebuffer(fbB);
      texA = texB = null; fbA = fbB = null;
    };
    const use = (p: WebGLProgram) => {
      gl.useProgram(p);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      const a = gl.getAttribLocation(p, "aPos");
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(U(p, "uTexel"), 1 / w, 1 / h);
      gl.uniform2f(U(p, "uSize"), w, h);
    };
    const seedState = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbA);
      gl.viewport(0, 0, w, h);
      gl.disable(gl.BLEND);
      use(seedP);
      gl.uniform1f(U(seedP, "uAspect"), cssW / cssH);
      gl.uniform1f(U(seedP, "uShape"), shape === "radial" ? 1 : 0);
      gl.uniform1f(U(seedP, "uSeed"), seed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    const resize = () => {
      const r = el.getBoundingClientRect();
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cssW * dpr);
      canvas.height = Math.round(cssH * dpr);
      const cell = Math.max(1.5, scale);
      const nw = Math.max(32, Math.min(512, Math.round(cssW / cell)));
      const nh = Math.max(32, Math.min(512, Math.round(cssH / cell)));
      if (nw !== w || nh !== h) {
        w = nw; h = nh;
        freeTargets();
        const a = makeTarget(), b = makeTarget();
        texA = a.t; fbA = a.fb; texB = b.t; fbB = b.fb;
        seedState();
      }
    };
    const mouse = { x: 0.5, y: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0, on: 0, last: -1e9 };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) / r.width;
      mouse.y = 1 - (e.clientY - r.top) / r.height;
      mouse.last = performance.now();
    };
    let simTime = 0;
    const simulate = (iters: number, dt: number) => {
      const [F, K] = PATTERNS[pattern] ?? PATTERNS.maze;
      const fresh = performance.now() - mouse.last < 120;
      const inside = mouse.x > -0.2 && mouse.x < 1.2 && mouse.y > -0.2 && mouse.y < 1.2;
      const want = interactive && fresh && inside ? 1 : 0;
      mouse.on += (want - mouse.on) * (1 - Math.exp(-dt * (want ? 12 : 3)));
      mouse.vx = ((mouse.x - mouse.px) / Math.max(1, iters)) * 0.5;
      mouse.vy = ((mouse.y - mouse.py) / Math.max(1, iters)) * 0.5;
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      gl.disable(gl.BLEND);
      gl.viewport(0, 0, w, h);
      use(stepP);
      gl.uniform1f(U(stepP, "uF"), F);
      gl.uniform1f(U(stepP, "uK"), K);
      gl.uniform1f(U(stepP, "uAspect"), cssW / cssH);
      gl.uniform1f(U(stepP, "uShape"), shape === "radial" ? 1 : 0);
      gl.uniform1f(U(stepP, "uRadius"), (radius / 100) * 0.5);
      gl.uniform2f(U(stepP, "uMouse"), mouse.x, mouse.y);
      gl.uniform2f(U(stepP, "uMouseVel"), mouse.vx, mouse.vy);
      gl.uniform1f(U(stepP, "uMouseOn"), mouse.on);
      gl.uniform1f(U(stepP, "uMouseR"), cursorSize / 100);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1i(U(stepP, "uState"), 0);
      for (let i = 0; i < iters; i++) {
        simTime += dt / Math.max(1, iters);
        gl.uniform1f(U(stepP, "uTime"), simTime);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbB);
        gl.bindTexture(gl.TEXTURE_2D, texA);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        [texA, texB] = [texB, texA];
        [fbA, fbB] = [fbB, fbA];
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    const draw = () => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.disable(gl.BLEND);
      use(drawP);
      const ink = rgb(probe.current ? getComputedStyle(probe.current).color : "#0A0A0A");
      gl.uniform3f(U(drawP, "uInk"), ink[0], ink[1], ink[2]);
      gl.uniform1f(U(drawP, "uGloss"), gloss);
      gl.uniform1f(U(drawP, "uShadow"), shadow);
      gl.uniform2f(U(drawP, "uShadowOff"), 5 / cssW, -5 / cssH);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texA);
      gl.uniform1i(U(drawP, "uState"), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    resize();
    let raf = 0, visible = true, last = 0, dead = false;
    const loop = (now: number) => {
      raf = 0;
      if (dead) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 1 / 60;
      last = now;
      const iters = Math.round(12 * speed);
      if (iters > 0) simulate(iters, dt);
      draw();
      if (visible) raf = requestAnimationFrame(loop);
      else last = 0;
    };
    let io: IntersectionObserver | null = null;
    if (reduced) {
      for (let i = 0; i < 160; i++) simulate(16, 1 / 30);
      draw();
    } else {
      for (let i = 0; i < 12; i++) simulate(16, 1 / 60);
      draw();
      io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; if (visible && !raf) raf = requestAnimationFrame(loop); });
      io.observe(el);
      window.addEventListener("pointermove", onMove, { passive: true });
      raf = requestAnimationFrame(loop);
    }
    const ro = new ResizeObserver(() => { resize(); draw(); });
    ro.observe(el);
    return () => {
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      try {
        freeTargets();
        gl.deleteBuffer(quad);
        gl.deleteProgram(seedP); gl.deleteProgram(stepP); gl.deleteProgram(drawP);
      } catch {}
    };
  }, [scale, shape, pattern, radius, speed, interactive, cursorSize, gloss, shadow]);
  return (
    <div ref={host} aria-hidden="true" style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "none" }}>
      <span ref={probe} style={{ position: "absolute", width: 0, height: 0, overflow: "hidden", color }} />
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}
