// 検出結果の整形（タイル分割、プレート形状への補正、誤検知の除外）
import { infer } from "./model.js";
import { ensureBmp } from "../files.js";
import { bbq, hull2, iou, med, nms, ovr, parea, quad4, rq } from "../geometry.js";
import { tr } from "../i18n.js";
import { state } from "../state.js";
import { msg } from "../ui/toast.js";
import { busyUI } from "../ui/ui.js";
async function refine(bmp, b) {
  const W = bmp.width, H = bmp.height, sw = Math.max(b.w * 2.4, b.h * 4.8, 48), sh = sw * 0.7;
  if (sw > Math.max(W, H) * 0.8) return b;
  const sx = Math.max(0, Math.min(W - sw, b.x + b.w / 2 - sw / 2)), sy = Math.max(0, Math.min(H - sh, b.y + b.h / 2 - sh / 2));
  const rs = await infer(bmp, sx, sy, Math.min(sw, W), Math.min(sh, H));
  let best = null, bs = 0.25;
  for (const q of rs) {
    const v = iou(b, q);
    if (v > bs) {
      bs = v;
      best = q;
    }
  }
  return best || b;
}
function estSlopes(bmp, b) {
  const W = bmp.width, H = bmp.height, x0 = Math.max(0, b.x), y0 = Math.max(0, b.y), rw = Math.min(W, b.x + b.w) - x0, rh = Math.min(H, b.y + b.h) - y0;
  if (rw < 16 || rh < 8) return null;
  const k = Math.min(4, 240 / rw), w = Math.max(8, Math.round(rw * k)), h = Math.max(8, Math.round(rh * k));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(bmp, x0, y0, rw, rh, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
  c.width = c.height = 0;
  for (let i = 0; i < w * h; i++) L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  for (let pass = 0; pass < 2; pass++) {
    const T = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k2 = -1; k2 <= 1; k2++) s += L[y * w + Math.min(w - 1, Math.max(0, x + k2))];
      T[y * w + x] = s / 3;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let s = 0;
      for (let k2 = -1; k2 <= 1; k2++) s += T[Math.min(h - 1, Math.max(0, y + k2)) * w + x];
      L[y * w + x] = s / 3;
    }
  }
  const NB = 81, hh = new Float64Array(NB), hv = new Float64Array(NB), ms = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1], gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
    ms.push(Math.hypot(gx, gy));
  }
  const srt = Float32Array.from(ms).sort(), thr = srt[Math.floor(srt.length * 0.7)] || 1;
  let tot = 0, j = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++, j++) {
    const m = ms[j];
    if (m < thr || m < 20) continue;
    const i = y * w + x;
    const gx = L[i - w + 1] + 2 * L[i + 1] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - 1] - L[i + w - 1], gy = L[i + w - 1] + 2 * L[i + w] + L[i + w + 1] - L[i - w - 1] - 2 * L[i - w] - L[i - w + 1];
    tot += m;
    if (Math.abs(gy) > Math.abs(gx) * 1.2) {
      const s = -gx / gy;
      if (Math.abs(s) < 0.8) hh[Math.round((s + 0.8) / 1.6 * (NB - 1))] += m;
    } else if (Math.abs(gx) > Math.abs(gy) * 1.2) {
      const s = -gy / gx;
      if (Math.abs(s) < 0.8) hv[Math.round((s + 0.8) / 1.6 * (NB - 1))] += m;
    }
  }
  const peak = (a) => {
    let bi = 0, bv = -1, s = 0;
    for (let i = 0; i < NB; i++) {
      s += a[i];
      const v = (a[i - 1] || 0) + 2 * a[i] + (a[i + 1] || 0);
      if (v > bv) {
        bv = v;
        bi = i;
      }
    }
    return { s: bi / (NB - 1) * 1.6 - 0.8, c: s ? bv / 4 / s : 0 };
  };
  const ph = peak(hh), pv = peak(hv);
  return { kh: ph.s, ch: ph.c, kv: pv.s, cv: pv.c };
}
function paraQuad(b, kh, kv, W, H) {
  const ah = Math.abs(kh), av = Math.abs(kv), den = 1 - ah * av;
  if (den < 0.3) return null;
  const w = (b.w - av * b.h) / den, h = b.h - ah * w;
  if (w < b.w * 0.4 || h < b.h * 0.25) return null;
  const A = [0, 0], B = [w, w * kh], C = [w + h * kv, w * kh + h], D = [h * kv, h], q = [A, B, C, D], mx = Math.min(...q.map((p) => p[0])), my = Math.min(...q.map((p) => p[1]));
  const P = q.map(([x, y]) => [b.x + x - mx, b.y + y - my]), cx = P.reduce((s, p) => s + p[0], 0) / 4, cy = P.reduce((s, p) => s + p[1], 0) / 4;
  return P.map(([x, y]) => [Math.min(W, Math.max(0, x)), Math.min(H, Math.max(0, y))]);
}
function plateFit(bmp, b) {
  const W = bmp.width, H = bmp.height, ex = 0.2, x0 = Math.max(0, Math.floor(b.x - b.w * ex)), y0 = Math.max(0, Math.floor(b.y - b.h * ex)), x1 = Math.min(W, Math.floor(b.x + b.w * (1 + ex))), y1 = Math.min(H, Math.floor(b.y + b.h * (1 + ex))), rw = x1 - x0, rh = y1 - y0;
  if (rw < 12 || rh < 8) return null;
  const k = Math.min(4, 200 / rw), w = Math.max(8, Math.round(rw * k)), h = Math.max(8, Math.round(rh * k)), N = w * h;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, x0, y0, rw, rh, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  c.width = c.height = 0;
  const L0 = new Float32Array(N), L = new Float32Array(N);
  for (let i = 0; i < N; i++) L0[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, t = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const xx = Math.min(w - 1, Math.max(0, x + i)), yy = Math.min(h - 1, Math.max(0, y + j)), f = (2 - Math.abs(i)) * (2 - Math.abs(j));
      s += L0[yy * w + xx] * f;
      t += f;
    }
    L[y * w + x] = s / t;
  }
  const hist = new Float64Array(256);
  for (let i = 0; i < N; i++) hist[Math.min(255, Math.round(L[i]))]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, thr = 0, best = -1;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = N - wB;
    if (!wF) break;
    sB += i * hist[i];
    const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2;
    if (v > best) {
      best = v;
      thr = i;
    }
  }
  let bw = new Uint8Array(N);
  for (let i = 0; i < N; i++) bw[i] = L[i] > thr ? 1 : 0;
  const morph = (a, er) => {
    const o = new Uint8Array(N);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = er ? 1 : 0;
      for (let j = -1; j <= 1 && (er ? v : !v); j++) for (let i = -1; i <= 1; i++) {
        const xx = x + i, yy = y + j;
        const q = xx < 0 || yy < 0 || xx >= w || yy >= h ? er ? 1 : 0 : a[yy * w + xx];
        if (er && !q) {
          v = 0;
          break;
        }
        if (!er && q) {
          v = 1;
          break;
        }
      }
      o[y * w + x] = v;
    }
    return o;
  };
  bw = morph(morph(bw, true), false);
  const lab = new Int32Array(N), st = [];
  let n = 0;
  const S = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    if (!bw[i] || lab[i]) continue;
    n++;
    let sp = 0, a = 0, mx = 1e9, my = 1e9, Mx = -1, My = -1;
    S[sp++] = i;
    lab[i] = n;
    while (sp) {
      const p = S[--sp], px = p % w, py = (p - px) / w;
      a++;
      if (px < mx) mx = px;
      if (px > Mx) Mx = px;
      if (py < my) my = py;
      if (py > My) My = py;
      for (let j = -1; j <= 1; j++) for (let ii = -1; ii <= 1; ii++) {
        const xx = px + ii, yy = py + j;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (bw[q] && !lab[q]) {
          lab[q] = n;
          S[sp++] = q;
        }
      }
    }
    st.push({ id: n, a, mx, my, Mx, My });
  }
  const bx = [(b.x - x0) * k, (b.y - y0) * k, b.w * k, b.h * k];
  let pick = null;
  for (const s of st) {
    if (s.a < bx[2] * bx[3] * 0.15) continue;
    const reach = new Uint8Array(N);
    let sp = 0;
    const push = (q2) => {
      if (!reach[q2] && lab[q2] != s.id) {
        reach[q2] = 1;
        S[sp++] = q2;
      }
    };
    for (let x = 0; x < w; x++) {
      push(x);
      push((h - 1) * w + x);
    }
    for (let y = 0; y < h; y++) {
      push(y * w);
      push(y * w + w - 1);
    }
    while (sp) {
      const p = S[--sp], px = p % w, py = (p - px) / w;
      if (px > 0) push(p - 1);
      if (px < w - 1) push(p + 1);
      if (py > 0) push(p - w);
      if (py < h - 1) push(p + w);
    }
    let fa = 0, inb = 0;
    const pts = [];
    for (let i = 0; i < N; i++) if (!reach[i]) {
      fa++;
      const px = i % w, py = (i - px) / w;
      if (px >= bx[0] && px < bx[0] + bx[2] && py >= bx[1] && py < bx[1] + bx[3]) inb++;
      if (lab[i] == s.id && (px == 0 || py == 0 || px == w - 1 || py == h - 1 || lab[i - 1] != s.id || lab[i + 1] != s.id || lab[i - w] != s.id || lab[i + w] != s.id)) pts.push([px, py]);
    }
    if (pts.length < 3) continue;
    const Hh = hull2(pts), ha = parea(Hh), sol = fa / Math.max(1, ha), q = quad4(Hh), D = (i, j) => Math.hypot(q[i][0] - q[j][0], q[i][1] - q[j][1]);
    const asp = (D(0, 1) + D(3, 2)) / Math.max(1, D(0, 3) + D(1, 2)), qfit = fa / Math.max(1, parea(q)), ov = inb / Math.max(1, fa), ph = (D(0, 3) + D(1, 2)) / 2;
    if (!(sol > 0.85 && asp > 0.9 && asp < 3.6 && qfit > 0.85 && ov > 0.6)) continue;
    const hl = new Int32Array(N);
    let chars = 0, tall = 0, hn = 0;
    for (let i = 0; i < N; i++) {
      if (reach[i] || lab[i] == s.id || hl[i]) continue;
      hn++;
      let sp2 = 0, a = 0, my = 1e9, My = -1;
      S[sp2++] = i;
      hl[i] = hn;
      while (sp2) {
        const p = S[--sp2], px = p % w, py = (p - px) / w;
        a++;
        if (py < my) my = py;
        if (py > My) My = py;
        for (let j = -1; j <= 1; j++) for (let ii = -1; ii <= 1; ii++) {
          const xx = px + ii, yy = py + j;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const r = yy * w + xx;
          if (!reach[r] && lab[r] != s.id && !hl[r]) {
            hl[r] = hn;
            S[sp2++] = r;
          }
        }
      }
      const hh = My - my + 1;
      if (hh > ph * 0.15 && hh < ph * 0.8 && a > ph * ph * 0.01) {
        chars++;
        if (hh > ph * 0.28) tall++;
      }
    }
    if (chars < 3 || tall < 2) continue;
    if (!pick || fa > pick.fa) pick = { fa, q };
  }
  if (!pick) return null;
  const P = pick.q.map(([x, y]) => [x0 + (x + 0.5) / k, y0 + (y + 0.5) / k]), cx = P.reduce((a, p) => a + p[0], 0) / 4, cy = P.reduce((a, p) => a + p[1], 0) / 4, B0 = bbq(P), pad = 1 / k + 1, ex2 = 1 + 2 * pad / Math.max(1, B0.w), ey2 = 1 + 2 * pad / Math.max(1, B0.h);
  return P.map(([x, y]) => [Math.min(W, Math.max(0, cx + (x - cx) * ex2)), Math.min(H, Math.max(0, cy + (y - cy) * ey2))]);
}
function colorOK(bmp, b) {
  const x = Math.max(0, Math.floor(b.x + b.w * 0.1)), y = Math.max(0, Math.floor(b.y + b.h * 0.1)), w = Math.max(2, Math.min(bmp.width - x, Math.round(b.w * 0.8))), h = Math.max(2, Math.min(bmp.height - y, Math.round(b.h * 0.8))), k = Math.min(1, 48 / w);
  const c = document.createElement("canvas");
  c.width = Math.max(2, Math.round(w * k));
  c.height = Math.max(2, Math.round(h * k));
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(bmp, x, y, w, h, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  c.width = c.height = 0;
  const L = [];
  for (let i = 0; i < d.length; i += 4) L.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  const t = L.slice().sort((a, b2) => a - b2)[Math.floor(L.length * 0.7)];
  let R = 0, G = 0, B = 0, n = 0;
  for (let i = 0, k2 = 0; i < d.length; i += 4, k2++) if (L[k2] >= t) {
    R += d[i];
    G += d[i + 1];
    B += d[i + 2];
    n++;
  }
  R /= n;
  G /= n;
  B /= n;
  const mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0;
  let hue = 0;
  if (mx > mn) {
    hue = mx == R ? (G - B) / (mx - mn) % 6 : mx == G ? (B - R) / (mx - mn) + 2 : (R - G) / (mx - mn) + 4;
    hue = (hue * 60 + 360) % 360;
  }
  return !(sat > 0.55 && (hue < 28 || hue > 320) || sat > 0.7 && hue > 190 && hue < 270);
}
function digitsOK(bmp, b) {
  if (b.w < 36) return true;
  const x = Math.max(0, Math.floor(b.x)), y = Math.max(0, Math.floor(b.y)), bw0 = Math.min(bmp.width - x, Math.ceil(b.w)), bh0 = Math.min(bmp.height - y, Math.ceil(b.h));
  if (bw0 < 8 || bh0 < 6) return false;
  const w = 200, h = Math.max(8, Math.round(bh0 * 200 / bw0)), N = w * h, c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.imageSmoothingQuality = "high";
  g.drawImage(bmp, x, y, bw0, bh0, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data;
  c.width = c.height = 0;
  const L = new Uint8Array(N), hist = new Float64Array(256);
  for (let i = 0; i < N; i++) {
    L[i] = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
    hist[L[i]]++;
  }
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sB = 0, wB = 0, thr = 0, best = -1;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (!wB) continue;
    const wF = N - wB;
    if (!wF) break;
    sB += i * hist[i];
    const v = wB * wF * (sB / wB - (sum - sB) / wF) ** 2;
    if (v > best) {
      best = v;
      thr = i;
    }
  }
  const lab = new Int32Array(N), S = new Int32Array(N), bl = [];
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (L[i] > thr || lab[i]) continue;
    n++;
    let sp = 0, mx = 1e9, my = 1e9, Mx = -1, My = -1;
    S[sp++] = i;
    lab[i] = n;
    while (sp) {
      const p = S[--sp], px = p % w, py = (p - px) / w;
      if (px < mx) mx = px;
      if (px > Mx) Mx = px;
      if (py < my) my = py;
      if (py > My) My = py;
      for (const q of [px > 0 ? p - 1 : -1, px < w - 1 ? p + 1 : -1, p - w, p + w]) if (q >= 0 && q < N && L[q] <= thr && !lab[q]) {
        lab[q] = n;
        S[sp++] = q;
      }
    }
    const bh = My - my + 1, bw = Mx - mx + 1;
    if (bh > 0.2 * h && bh < 0.7 * h && bw < 0.35 * w && mx > 0 && my > 0 && Mx < w - 1 && My < h - 1) bl.push([(my + My) / 2, bh]);
  }
  let al = 0;
  for (const [cy, hh] of bl) {
    let k = 0;
    for (const [c2, h2] of bl) if (Math.abs(c2 - cy) < 0.12 * h && h2 / hh > 0.7 && h2 / hh < 1.4) k++;
    al = Math.max(al, k);
  }
  return al >= 3;
}
function tilesOf(W, H) {
  const T = Math.max(1e3, Math.sqrt(W * H / 12)), nx = Math.ceil(W / T), ny = Math.ceil(H / T);
  if (nx * ny <= 1) return [];
  const tw = Math.min(W, Math.ceil(W / nx * 1.25)), th = Math.min(H, Math.ceil(H / ny * 1.25)), o = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) o.push([nx == 1 ? 0 : Math.round(i * (W - tw) / (nx - 1)), ny == 1 ? 0 : Math.round(j * (H - th) / (ny - 1)), tw, th]);
  return o;
}
function fitAll(bmp, rs, prior) {
  const fit = [], rest = [];
  for (const r of rs) {
    const q = plateFit(bmp, r);
    if (q) {
      const B = bbq(q);
      if (fit.every((f) => ovr(f.B, B) < 0.4)) fit.push({ q, B });
    } else rest.push(r);
  }
  const r2 = [];
  for (const r of rest) if (fit.every((f) => ovr(f.B, r) < 0.4) && r2.every((o) => ovr(o, r) < 0.4)) r2.push(r);
  return [...fit.map((f) => ({ q: f.q })), ...shapeBoxes(bmp, r2, fit.length ? priorOf(fit) : prior)];
}
function priorOf(boxes) {
  const h = [], v = [];
  for (const { q } of boxes) {
    const dx = q[1][0] - q[0][0], dy = q[3][1] - q[0][1];
    if (dx > 1) h.push((q[1][1] - q[0][1]) / dx);
    if (dy > 1) v.push((q[3][0] - q[0][0]) / dy);
  }
  return h.length ? { kh: med(h), kv: med(v) } : null;
}
function shapeBoxes(bmp, bs, prior) {
  const W = bmp.width, H = bmp.height, es = bs.map((b) => estSlopes(bmp, b));
  const CF = 0.05, eh = es.filter((e) => e && e.ch > CF).map((e) => e.kh), ev = es.filter((e) => e && e.cv > CF).map((e) => e.kv);
  const gh = eh.length ? med(eh) : prior ? prior.kh : 0, gv = ev.length ? med(ev) : prior ? prior.kv : 0;
  return bs.map((b, i) => {
    const e = es[i], kh = e && e.ch > CF ? e.kh : gh, kv = e && e.cv > CF ? e.kv : gv;
    if (Math.abs(kh) > 0.04 || Math.abs(kv) > 0.04) {
      const q = paraQuad(b, kh, kv, W, H);
      if (q) return { q };
    }
    const x = Math.max(0, b.x), y = Math.max(0, b.y);
    return rq(x, y, Math.min(W - x, b.w), Math.min(H - y, b.h));
  });
}
async function detect(it) {
  try {
    await ensureBmp(it);
    const bmp = it.bmp, W = bmp.width, H = bmp.height, T = tilesOf(W, H), yd = () => new Promise((r) => setTimeout(r, 0)), pg = (v) => {
      it.prog = v;
      if (it === state.items[state.cur]) busyUI();
    };
    it.t0 = performance.now();
    pg(0.03);
    await yd();
    let c = await infer(bmp, 0, 0, W, H, 0.2);
    for (let k = 0; k < T.length; k++) {
      pg(0.8 * (k + 1) / (T.length + 1));
      await yd();
      c = c.concat(await infer(bmp, ...T[k], 0.25));
    }
    const cc = nms(c, 0.4), ref = [];
    let kk = 0;
    for (const b of cc) {
      pg(0.8 + 0.2 * kk++ / Math.max(1, cc.length));
      await yd();
      const r = await refine(bmp, b);
      let q = plateFit(bmp, r);
      if (!q && r !== b) q = plateFit(bmp, b);
      if (q) {
        if (colorOK(bmp, bbq(q))) ref.push({ q, s: b.s });
      } else if (b.s >= 0.45 && r.w / r.h >= 0.7 && r.w / r.h <= 4.5 && colorOK(bmp, r) && digitsOK(bmp, r)) ref.push(r);
    }
    const fq = ref.filter((r) => r.q).sort((a, b) => b.s - a.s), fit = [];
    for (const f of fq) {
      const B = bbq(f.q);
      if (fit.every((o) => ovr(o.B, B) < 0.4)) fit.push({ q: f.q, B });
    }
    const rest = [];
    for (const r of nms(ref.filter((r2) => !r2.q))) if (fit.every((o) => ovr(o.B, r) < 0.4) && rest.every((o) => ovr(o, r) < 0.4)) rest.push(r);
    const add = [...fit.map((f) => ({ q: f.q })), ...shapeBoxes(bmp, rest, fit.length ? priorOf(fit) : null)].filter((n) => !it.boxes.some((o) => ovr(bbq(o.q), bbq(n.q)) > 0.4));
    pg(1);
    if (add.length) {
      it.boxes.push(...add);
      it.ok = false;
    }
  } catch (_) {
    if (state.items.includes(it) && !it.gone) msg(tr("自動検出できませんでした"));
  }
}
export {
  detect,
  fitAll,
  priorOf
};
