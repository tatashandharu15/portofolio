"use client";
// Ferrofluid — simulasi metaball partikel (port dari komponen Framer "Ferrofluid — Metaball Simulation").
import { useEffect, useRef } from "react";

export type FerroOptions = {
  color: string;
  particles: number;
  particleSize: number;
  keepVolume: boolean;
  mobileParticles: number;
  cohesion: number;
  magnetism: number;
  viscosity: number;
  activity: number;
  speed: number;
  heartbeat: boolean;
  heartRate: number;
  pulseStrength: number;
  gloss: number;
  shadow: number;
  trails: boolean;
  trailDrag: number;
  trailLife: number;
  size: number;
  placement: "Hero" | "Center";
  interactive: boolean;
  strength: number;
  radius: number;
  seed: number;
};

const DEFAULTS: FerroOptions = {
  color: "#101110", particles: 800, particleSize: 10.5, keepVolume: true, mobileParticles: 400,
  cohesion: 1, magnetism: 1, viscosity: 3.2, activity: 1, speed: 1, heartbeat: true, heartRate: 60,
  pulseStrength: 0.45, gloss: 0, shadow: 0, trails: true, trailDrag: 1.2, trailLife: 1.4, size: 1,
  placement: "Hero", interactive: true, strength: 40, radius: 120, seed: 12,
};

const FIELD = 440; // ukuran dunia simulasi
const DT = 1 / 60;

function rng(seed: number) {
  let t = seed | 0;
  return () => {
    t |= 0;
    t = (t + 1831565813) | 0;
    let e = Math.imul(t ^ (t >>> 15), 1 | t);
    e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e;
    return ((e ^ (e >>> 14)) >>> 0) / 4294967296;
  };
}

function heartbeatWave(time: number, bpm: number) {
  const n = (((time * Math.max(1, bpm)) / 60) % 1 + 1) % 1;
  return Math.exp(-(((n - 0.16) / 0.055) ** 2)) + 0.5 * Math.exp(-(((n - 0.36) / 0.075) ** 2));
}

type Pointer = { x: number; y: number; amount: number };

function createSimulation(o: FerroOptions) {
  const count = Math.max(64, Math.min(1600, Math.round(o.particles)));
  const vol = o.keepVolume ? Math.sqrt(300 / count) : 1;
  const pos = new Float32Array(count * 2);
  const vel = new Float32Array(count * 2);
  const force = new Float32Array(count * 2);
  const dir = new Float32Array(count * 2);
  const radii = new Float32Array(count);
  const packed = new Float32Array(count * 3);
  const rand = rng(o.seed);
  const cell = 44 * vol;
  const dim = Math.ceil(704 / cell);
  const half = (dim * cell) / 2;
  const head = new Int32Array(dim * dim);
  const next = new Int32Array(count);
  const cx = new Int32Array(count);
  const cy = new Int32Array(count);
  const table = new Float32Array(1026);
  for (let t = 0; t < table.length; t++) {
    const r = (t * 6) / 1024;
    table[t] = vol * (-o.cohesion * 72 * Math.exp(-(((r - 1.2) / 0.42) ** 2)) + o.magnetism * 22 * Math.exp(-(((r - 2.4) / 0.85) ** 2)));
  }
  let time = 0;
  for (let i = 0; i < count; i++) {
    let x = 0, y = 0;
    for (let k = 0; k < 80; k++) {
      const a = rand() * Math.PI * 2;
      const d = Math.sqrt(rand()) * 156;
      x = Math.cos(a) * d;
      y = Math.sin(a) * d;
      let ok = true;
      for (let j = 0; j < i; j++) {
        if ((pos[j * 2] - x) ** 2 + (pos[j * 2 + 1] - y) ** 2 < 100 * vol * vol) { ok = false; break; }
      }
      if (ok) break;
    }
    pos[i * 2] = x;
    pos[i * 2 + 1] = y;
    radii[i] = o.particleSize * vol * (0.9 + rand() * 0.2);
    dir[i * 2] = 1;
  }
  const trails = Array.from({ length: 48 }, () => ({ x: 0, y: 0, vx: 0, vy: 0, age: 100, amount: 0 }));
  let trailIdx = 0, sinceTrail = 1, prevX = 0, prevY = 0, prevAmount = 0;

  const step = (dt: number, m: Pointer, ext?: number) => {
    time += dt;
    const beat = heartbeatWave(ext ?? time / Math.max(0.05, o.speed), o.heartRate);
    const base = Math.sqrt(Math.PI) * 0.0925;
    const pulse = o.heartbeat && ext !== -1 ? (base - beat) * o.pulseStrength * 12 * Math.sqrt(o.viscosity / 3.2) : 0;
    for (const tr of trails) tr.age += dt;
    sinceTrail += dt;
    if (o.trails && m.amount > 0.01 && prevAmount > 0.01) {
      let tvx = (m.x - prevX) / dt, tvy = (m.y - prevY) / dt;
      const sp = Math.hypot(tvx, tvy);
      if (sp > 320) { tvx *= 320 / sp; tvy *= 320 / sp; }
      if (sp > 8 && sinceTrail >= Math.max(DT, o.trailLife / trails.length)) {
        const tr = trails[trailIdx];
        tr.x = m.x; tr.y = m.y; tr.vx = tvx; tr.vy = tvy; tr.age = 0; tr.amount = m.amount;
        trailIdx = (trailIdx + 1) % trails.length;
        sinceTrail = 0;
      }
    }
    prevX = m.x; prevY = m.y; prevAmount = m.amount;
    const kr = Math.max(18, o.radius * 0.42);
    const kr2 = kr * kr;
    head.fill(-1);
    for (let n = 0; n < count; n++) {
      const t = n * 2;
      const px = pos[t], py = pos[t + 1];
      const b = time * o.activity;
      const ang = 0.85 * Math.sin(px * 0.014 + b * 0.19) + 0.8 * Math.sin(py * 0.017 - b * 0.13) + 0.45 * Math.sin((px + py) * 0.013 + b * 0.11) + b * 0.045;
      let S = Math.cos(ang), C = Math.sin(ang);
      const wx = m.x - px, wy = m.y - py;
      const E = wx * wx + wy * wy;
      const D = m.amount * Math.exp(-E / (o.radius * o.radius));
      if (D > 0.001) {
        const len = Math.sqrt(E) || 1;
        let ux = wx / len, uy = wy / len;
        if (ux * S + uy * C < 0) { ux = -ux; uy = -uy; }
        S = S * (1 - D) + ux * D;
        C = C * (1 - D) + uy * D;
      }
      const k = 1 - Math.exp(-dt * 2.4);
      S = dir[t] + (S - dir[t]) * k;
      C = dir[t + 1] + (C - dir[t + 1]) * k;
      const j = Math.hypot(S, C) || 1;
      dir[t] = S / j;
      dir[t + 1] = C / j;
      force[t] = o.activity * (Math.sin(py * 0.021 + b * 0.32) * 15 + Math.cos((px - py) * 0.011 - b * 0.21) * 9) - px * 0.035 + px * pulse;
      force[t + 1] = o.activity * (Math.sin(px * 0.018 + b * 0.26) * 15 - Math.sin((px + py) * 0.015 + b * 0.18) * 9) - py * 0.035 + py * pulse;
      const M = Math.hypot(px, py);
      if (M > 170) {
        const e = ((M - 170) * 30) / M;
        force[t] -= px * e;
        force[t + 1] -= py * e;
      }
      if (D > 0.001) {
        const f = (D * o.strength * (o.trails ? 2.4 : 6)) / (Math.sqrt(E) + 25);
        force[t] += wx * f;
        force[t + 1] += wy * f;
      }
      if (o.trails && o.trailDrag > 0) {
        let best = -1, bestScore = 5;
        for (let q = 0; q < trails.length; q++) {
          const tr = trails[q];
          if (tr.age >= o.trailLife) continue;
          const dx = tr.x - px, dy = tr.y - py;
          const sc = (dx * dx + dy * dy) / kr2 + (tr.age / o.trailLife) * 2;
          if (sc < bestScore) { bestScore = sc; best = q; }
        }
        if (best >= 0) {
          const tr = trails[best];
          const c = Math.exp(-bestScore) * tr.amount * o.trailDrag;
          force[t] += c * ((tr.vx - vel[t]) * 5 + (tr.x - px) * 2);
          force[t + 1] += c * ((tr.vy - vel[t + 1]) * 5 + (tr.y - py) * 2);
        }
      }
      const gx = Math.max(0, Math.min(dim - 1, Math.floor((px + half) / cell)));
      const gy = Math.max(0, Math.min(dim - 1, Math.floor((py + half) / cell)));
      cx[n] = gx; cy[n] = gy;
      next[n] = head[gy * dim + gx];
      head[gy * dim + gx] = n;
    }
    for (let c = 0; c < count; c++) {
      const t = c * 2;
      const lx = pos[t], ly = pos[t + 1];
      for (let ry = Math.max(0, cy[c] - 1); ry <= Math.min(dim - 1, cy[c] + 1); ry++) {
        for (let rx = Math.max(0, cx[c] - 1); rx <= Math.min(dim - 1, cx[c] + 1); rx++) {
          for (let h = head[ry * dim + rx]; h !== -1; h = next[h]) {
            if (h <= c) continue;
            const d = h * 2;
            const dx = lx - pos[d], dy = ly - pos[d + 1];
            const g = dx * dx + dy * dy;
            if (g > cell * cell) continue;
            const v = Math.sqrt(Math.max(g, 0.01));
            const y = dx / v, bb = dy / v;
            const x = (radii[c] + radii[h]) * 0.6;
            const S = (1 - v / cell) ** 2;
            const C = dir[t] * y + dir[t + 1] * bb;
            const w = dir[d] * y + dir[d + 1] * bb;
            const T = dir[t] * dir[d] + dir[t + 1] * dir[d + 1];
            const E = o.magnetism * 14 * vol * (x / Math.max(v, x)) ** 3 * S;
            let fx = E * (C * dir[d] + w * dir[t] + (T - 5 * C * w) * y);
            let fy = E * (C * dir[d + 1] + w * dir[t + 1] + (T - 5 * C * w) * bb);
            const rep = Math.max(0, x - v) * 160;
            const A = Math.min(1024, (v / x) * (1024 / 6));
            const jj = A | 0;
            const frac = A - jj;
            const pot = table[jj] + (table[jj + 1] - table[jj]) * frac;
            fx += y * (rep + pot);
            fy += bb * (rep + pot);
            const P = o.viscosity * S * 0.6;
            fx += (vel[d] - vel[t]) * P;
            fy += (vel[d + 1] - vel[t + 1]) * P;
            force[t] += fx; force[t + 1] += fy;
            force[d] -= fx; force[d + 1] -= fy;
          }
        }
      }
    }
    const damp = Math.exp(-o.viscosity * dt);
    for (let e = 0; e < count; e++) {
      const t = e * 2;
      let nx = (vel[t] + force[t] * dt) * damp;
      let ny = (vel[t + 1] + force[t + 1] * dt) * damp;
      const s = Math.hypot(nx, ny);
      if (s > 120) { nx *= 120 / s; ny *= 120 / s; }
      pos[t] += nx * dt;
      pos[t + 1] += ny * dt;
      vel[t] = nx;
      vel[t + 1] = ny;
    }
  };
  const pack = () => {
    for (let e = 0; e < count; e++) {
      packed[e * 3] = pos[e * 2];
      packed[e * 3 + 1] = pos[e * 2 + 1];
      packed[e * 3 + 2] = radii[e];
    }
    return packed;
  };
  return { count, pos, radii, step, pack };
}
type Sim = ReturnType<typeof createSimulation>;

const VS_PARTICLE = `
attribute vec3 aParticle;
uniform float uResolution;
void main() {
    gl_Position = vec4(aParticle.xy / 220.0 * vec2(1.0, -1.0), 0.0, 1.0);
    gl_PointSize = aParticle.z * 5.0 / 440.0 * uResolution;
}`;
const FS_PARTICLE = `
precision mediump float;
void main() {
    vec2 q = (gl_PointCoord - 0.5) * 5.0;
    float density = 0.28 * exp(-0.9 * dot(q, q));
    gl_FragColor = vec4(density, density, density, density);
}`;
const VS_QUAD = `
attribute vec2 aPosition;
varying vec2 vUV;
void main() { vUV = aPosition * 0.5 + 0.5; gl_Position = vec4(aPosition, 0.0, 1.0); }
`;
const FS_SURFACE = `
precision highp float;
varying vec2 vUV;
uniform sampler2D uField;
uniform vec2 uTexel;
uniform vec4 uColor;
uniform float uGloss;
uniform float uShadow;
float field(vec2 uv) { return texture2D(uField, uv).r; }
void main() {
    float f = field(vUV);
    float l = field(vUV - vec2(uTexel.x, 0.0));
    float r = field(vUV + vec2(uTexel.x, 0.0));
    float d = field(vUV - vec2(0.0, uTexel.y));
    float u = field(vUV + vec2(0.0, uTexel.y));
    f = f * 0.5 + (l + r + d + u) * 0.125;
    float threshold = 0.22;
    float gradient = length(vec2(r - l, u - d));
    float edge = max(0.004, gradient * 0.55);
    float coverage = smoothstep(threshold - edge, threshold + edge, f);
    float shadow = smoothstep(0.015, threshold, f) * uShadow * 0.12;
    if (coverage + shadow < 0.001) discard;
    vec3 ink = uColor.rgb;
    if (uGloss > 0.0) {
        float nx = field(vUV - vec2(uTexel.x * 3.0, 0.0)) - field(vUV + vec2(uTexel.x * 3.0, 0.0));
        float ny = field(vUV - vec2(0.0, uTexel.y * 3.0)) - field(vUV + vec2(0.0, uTexel.y * 3.0));
        vec3 normal = normalize(vec3(nx * 6.0, ny * 6.0, 0.75));
        vec3 h = normalize(vec3(-0.45, 0.7, 1.4));
        float light = pow(max(dot(normal, h), 0.0), 55.0);
        float softbox = pow(max(dot(normal, normalize(vec3(0.55, 0.45, 0.8))), 0.0), 20.0);
        ink += uGloss * (light * 0.32 + softbox * 0.11);
    }
    float alpha = coverage * uColor.a + shadow * (1.0 - coverage);
    gl_FragColor = vec4(ink * coverage * uColor.a, alpha);
}`;

function cssColorToRgba(color: string): number[] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  if (!ctx) return [0.04, 0.04, 0.04, 1];
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  return Array.from(ctx.getImageData(0, 0, 1, 1).data).map((v) => v / 255);
}

function createRenderer(canvas: HTMLCanvasElement, o: FerroOptions) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power" });
  if (!gl) return null;
  const shaders: WebGLShader[] = [], programs: WebGLProgram[] = [], buffers: WebGLBuffer[] = [];
  let tex: WebGLTexture | null = null, fbo: WebGLFramebuffer | null = null;
  const dispose = () => {
    buffers.forEach((b) => gl.deleteBuffer(b));
    programs.forEach((p) => gl.deleteProgram(p));
    shaders.forEach((s) => gl.deleteShader(s));
    if (tex) gl.deleteTexture(tex);
    if (fbo) gl.deleteFramebuffer(fbo);
  };
  const program = (vs: string, fs: string) => {
    const p = gl.createProgram()!;
    programs.push(p);
    for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]] as const) {
      const s = gl.createShader(type)!;
      shaders.push(s);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "compile");
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "link");
    return p;
  };
  try {
    const pProg = program(VS_PARTICLE, FS_PARTICLE);
    const sProg = program(VS_QUAD, FS_SURFACE);
    const pBuf = gl.createBuffer()!, qBuf = gl.createBuffer()!;
    buffers.push(pBuf, qBuf);
    gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    tex = gl.createTexture();
    fbo = gl.createFramebuffer();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 768, 768, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("fbo");
    const aParticle = gl.getAttribLocation(pProg, "aParticle");
    const aPosition = gl.getAttribLocation(sProg, "aPosition");
    const uRes = gl.getUniformLocation(pProg, "uResolution");
    const uField = gl.getUniformLocation(sProg, "uField");
    const uTexel = gl.getUniformLocation(sProg, "uTexel");
    const uColor = gl.getUniformLocation(sProg, "uColor");
    const uGloss = gl.getUniformLocation(sProg, "uGloss");
    const uShadow = gl.getUniformLocation(sProg, "uShadow");
    const rgba = cssColorToRgba(o.color);
    return {
      render(data: Float32Array, n: number) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, 768, 768);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE);
        gl.useProgram(pProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, pBuf);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(aParticle);
        gl.vertexAttribPointer(aParticle, 3, gl.FLOAT, false, 0, 0);
        gl.uniform1f(uRes, 768);
        gl.drawArrays(gl.POINTS, 0, n);
        gl.disableVertexAttribArray(aParticle);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.disable(gl.BLEND);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(sProg);
        gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
        gl.enableVertexAttribArray(aPosition);
        gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(uField, 0);
        gl.uniform2f(uTexel, 1 / 768, 1 / 768);
        gl.uniform4fv(uColor, rgba);
        gl.uniform1f(uGloss, o.gloss);
        gl.uniform1f(uShadow, o.shadow);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.disableVertexAttribArray(aPosition);
      },
      dispose,
    };
  } catch (err) {
    dispose();
    console.warn("Ferrofluid: WebGL unavailable; rendering a static metaball field.", err);
    return null;
  }
}

function placement(w: number, h: number, o: FerroOptions) {
  if (o.placement === "Center") return { x: w / 2, y: h / 2, size: Math.min(w, h) * o.size };
  if (w < 810) return { x: w * 0.51, y: Math.max(145, h / 2 - 170), size: Math.min(w * 0.8, 270) * o.size };
  if (w < 1200) return { x: w * 0.135, y: h * 0.46, size: Math.min(w * 0.28, h * 0.48) * o.size };
  return { x: w * 0.225, y: h * 0.46, size: Math.min(w * 0.4, h * 0.7) * o.size };
}

function drawFallback(canvas: HTMLCanvasElement, sim: Sim, color: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = canvas.height = 256;
  const field = new Float32Array(256 * 256);
  for (let e = 0; e < sim.count; e++) {
    const n = (sim.pos[e * 2] / FIELD + 0.5) * 256;
    const r = (sim.pos[e * 2 + 1] / FIELD + 0.5) * 256;
    const a = (sim.radii[e] / FIELD) * 256;
    for (let y = Math.max(0, Math.floor(r - a * 2.5)); y <= Math.min(255, Math.ceil(r + a * 2.5)); y++)
      for (let x = Math.max(0, Math.floor(n - a * 2.5)); x <= Math.min(255, Math.ceil(n + a * 2.5)); x++)
        field[y * 256 + x] += 0.28 * Math.exp((-0.9 * ((x - n) ** 2 + (y - r) ** 2)) / (a * a));
  }
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const c = ctx.getImageData(0, 0, 1, 1).data;
  const img = ctx.createImageData(256, 256);
  for (let i = 0; i < field.length; i++) {
    const t = Math.max(0, Math.min(1, (field[i] - 0.2) / 0.04));
    img.data[i * 4] = c[0];
    img.data[i * 4 + 1] = c[1];
    img.data[i * 4 + 2] = c[2];
    img.data[i * 4 + 3] = t * t * (3 - 2 * t) * c[3];
  }
  ctx.putImageData(img, 0, 0);
}

function mount(host: HTMLDivElement, glCanvas: HTMLCanvasElement, cpuCanvas: HTMLCanvasElement, o: FerroOptions) {
  const particleCount = () => Math.max(64, Math.min(1600, Math.round(window.innerWidth < 810 ? Math.min(o.particles, o.mobileParticles) : o.particles)));
  let sim = createSimulation({ ...o, particles: particleCount() });
  const smooth: Pointer = { x: 0, y: 0, amount: 0 };
  const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
  const still = rm.matches || o.speed === 0;
  if (still) for (let i = 0; i < 480; i++) sim.step(DT, smooth, -1);
  let prewarm = still ? 0 : 480;
  let renderer = createRenderer(glCanvas, o);
  if (!renderer) drawFallback(cpuCanvas, sim, o.color);
  glCanvas.style.display = renderer ? "block" : "none";
  cpuCanvas.style.display = renderer ? "none" : "block";
  let raf = 0, last = 0, lastRender = 0, acc = 0, clock = 0;
  let disposed = false, lost = false, visible = true, inHero = true;
  let place = placement(1200, 800, o);
  let rect = host.getBoundingClientRect();
  const target: Pointer = { x: 0, y: 0, amount: 0 };
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const draw = () => { if (renderer && !lost && !disposed) renderer.render(sim.pack(), sim.count); };
  const canRun = () => !!renderer && !disposed && !lost && !rm.matches && visible && inHero && !document.hidden && o.speed > 0;
  const loop = (now: number) => {
    raf = 0;
    if (!canRun()) return;
    if (prewarm > 0) {
      const until = performance.now() + 4;
      do { sim.step(DT, { x: 0, y: 0, amount: 0 }, -1); prewarm--; } while (prewarm > 0 && performance.now() < until);
      if (now - lastRender >= 15.5) { draw(); lastRender = now; }
      last = now;
      raf = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    clock += dt;
    const k = 1 - Math.exp(-dt * 7);
    smooth.x += (target.x - smooth.x) * k;
    smooth.y += (target.y - smooth.y) * k;
    smooth.amount += (target.amount - smooth.amount) * k;
    acc = Math.min(acc + dt * o.speed, DT * 6);
    const stepped = acc >= DT;
    while (acc >= DT) { sim.step(DT, smooth, clock); acc -= DT; }
    if (stepped && now - lastRender >= 15.5) { draw(); lastRender = now; }
    raf = requestAnimationFrame(loop);
  };
  const restart = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0; acc = 0;
    if (rm.matches) target.amount = smooth.amount = 0;
    if (canRun()) raf = requestAnimationFrame(loop);
  };
  const layout = () => {
    if (sim.count !== particleCount()) {
      sim = createSimulation({ ...o, particles: particleCount() });
      prewarm = still ? 0 : 480;
      if (still) for (let i = 0; i < 480; i++) sim.step(DT, { x: 0, y: 0, amount: 0 }, -1);
      if (!renderer) drawFallback(cpuCanvas, sim, o.color);
    }
    rect = host.getBoundingClientRect();
    place = placement(host.clientWidth, host.clientHeight, o);
    for (const c of [glCanvas, cpuCanvas]) {
      Object.assign(c.style, { left: `${place.x}px`, top: `${place.y}px`, width: `${place.size}px`, height: `${place.size}px`, visibility: "visible" });
    }
    glCanvas.width = glCanvas.height = Math.max(1, Math.min(1024, Math.round(place.size * Math.min(window.devicePixelRatio || 1, 2))));
    inHero = o.placement !== "Hero" || window.scrollY < host.clientHeight;
    draw();
    restart();
  };
  const onScroll = () => {
    rect = host.getBoundingClientRect();
    const next = o.placement !== "Hero" || window.scrollY < host.clientHeight;
    if (next !== inHero) { inHero = next; restart(); }
  };
  const release = () => { target.amount = 0; };
  const onMove = (ev: PointerEvent) => {
    if (!o.interactive || !finePointer.matches || rm.matches) return;
    const x = ((ev.clientX - rect.left) * host.clientWidth) / Math.max(1, rect.width);
    const y = ((ev.clientY - rect.top) * host.clientHeight) / Math.max(1, rect.height);
    const sx = ((x - place.x) / place.size) * FIELD;
    const sy = ((y - place.y) / place.size) * FIELD;
    if (Math.hypot(sx, sy) > FIELD / 2 || x < 0 || y < 0 || x > host.clientWidth || y > host.clientHeight) { release(); return; }
    if (smooth.amount < 0.001) { smooth.x = sx; smooth.y = sy; }
    target.x = sx; target.y = sy; target.amount = 1;
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    lost = true;
    restart();
    drawFallback(cpuCanvas, sim, o.color);
    cpuCanvas.style.display = "block";
    glCanvas.style.display = "none";
  };
  const onRestored = () => {
    renderer?.dispose();
    renderer = createRenderer(glCanvas, o);
    lost = false;
    glCanvas.style.display = renderer ? "block" : "none";
    cpuCanvas.style.display = renderer ? "none" : "block";
    layout();
  };
  const ro = new ResizeObserver(layout);
  ro.observe(host);
  const io = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? false; onScroll(); restart(); });
  io.observe(host);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerout", release, { passive: true });
  window.addEventListener("blur", release);
  window.addEventListener("resize", layout, { passive: true });
  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
  document.addEventListener("visibilitychange", restart);
  rm.addEventListener("change", restart);
  glCanvas.addEventListener("webglcontextlost", onLost);
  glCanvas.addEventListener("webglcontextrestored", onRestored);
  layout();
  return () => {
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerout", release);
    window.removeEventListener("blur", release);
    window.removeEventListener("resize", layout);
    window.removeEventListener("scroll", onScroll, true);
    document.removeEventListener("visibilitychange", restart);
    rm.removeEventListener("change", restart);
    glCanvas.removeEventListener("webglcontextlost", onLost);
    glCanvas.removeEventListener("webglcontextrestored", onRestored);
    renderer?.dispose();
  };
}

export function Ferrofluid(props: Partial<FerroOptions> & { mobile?: Partial<FerroOptions>; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const gl = useRef<HTMLCanvasElement>(null);
  const cpu = useRef<HTMLCanvasElement>(null);
  const { mobile, className, ...rest } = props;
  const key = JSON.stringify([rest, mobile]);
  useEffect(() => {
    if (!host.current || !gl.current || !cpu.current) return;
    const isPhone = window.innerWidth < 810;
    const opts: FerroOptions = { ...DEFAULTS, ...rest, ...(isPhone ? mobile : {}) };
    return mount(host.current, gl.current, cpu.current, opts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const canvasStyle: React.CSSProperties = { position: "absolute", width: 0, height: 0, visibility: "hidden", transform: "translate(-50%,-50%)", pointerEvents: "none" };
  return (
    <div ref={host} aria-hidden="true" className={className} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", pointerEvents: "none" }}>
      <canvas ref={cpu} style={{ ...canvasStyle, display: "none" }} />
      <canvas ref={gl} style={canvasStyle} />
    </div>
  );
}
