// 画像と塗りの描画・切り抜き
import { bbq, qpath } from "../geometry.js";
import { plCol, plEff, plKey, plateTexC, warpTo } from "./plate.js";
import { state } from "../state.js";
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function col(g, x, y, w, h, adj, cl = "auto") {
  const mix = (c) => Math.round(Math.max(0, Math.min(255, adj < 0 ? c * (1 + adj / 255) : c + (255 - c) * adj / 255))), out = (a) => `rgb(${a.map(mix).join(",")})`;
  if (cl != "auto") return out(hexRGB(cl));
  if (w < 2 || h < 2) return out([255, 255, 255]);
  const d = g.getImageData(x, y, w, h).data, L = [];
  for (let i = 0; i < d.length; i += 16) L.push(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
  const S = L.slice().sort((a, b) => a - b), hi = S.slice(S.length >> 1), m = hi[hi.length >> 1] || 255, t3 = S[Math.floor(S.length * 0.75)] || 0;
  const v = m;
  let R = 0, G = 0, B = 0, n = 0;
  for (let k = 0, i = 0; i < d.length; i += 16, k++) if (L[k] >= t3) {
    R += d[i];
    G += d[i + 1];
    B += d[i + 2];
    n++;
  }
  const lm = n ? (0.299 * R + 0.587 * G + 0.114 * B) / n : 0, ck = (c) => Math.min(1.08, Math.max(0.92, c)), cr = lm > 20 ? ck(R / n / lm) : 1, cg = lm > 20 ? ck(G / n / lm) : 1, cb = lm > 20 ? ck(B / n / lm) : 0.976;
  const f = (c) => Math.min(255, v * c);
  return out([f(cr), f(cg), f(cb)]);
}
function baseOf(it, s) {
  const W = Math.round(it.bmp.width * s), H = Math.round(it.bmp.height * s), c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(it.bmp, 0, 0, W, H);
  return { it, s, c, g };
}
function paint(it, c, s, soft = -1, cache = true) {
  const B = cache ? state.BC && state.BC.it === it && state.BC.s === s ? state.BC : state.BC = baseOf(it, s) : baseOf(it, s), W = B.c.width, H = B.c.height;
  if (c.width != W || c.height != H) {
    c.width = W;
    c.height = H;
  }
  const g = c.getContext("2d");
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = "source-over";
  g.filter = "none";
  g.clearRect(0, 0, W, H);
  g.drawImage(B.c, 0, 0);
  const qs = it.boxes.map((b) => b.q.map(([x, y]) => [x * s, y * s])), lw = Math.max(1.5, 2 * s);
  if (cache && (!it._pc || it._pc.size > 60)) it._pc = /* @__PURE__ */ new Map();
  qs.forEach((q, i) => {
    // a selected mask is see-through so it can be lined up with the plate; a fictional plate only while it is being dragged
    // (otherwise the real plate showing through looks like the text jumped)
    const t = it.tx ?? state.dTx, br = it.br ?? state.dBr, cl = it.cl ?? state.dCl, pl = plCol(plEff(it, it.boxes[i]), cl), al = i == soft && (!pl || state.drag) ? 0.4 : 1, key = cache && [s, al, t, br, cl, plKey(pl), q.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1))].join("|");
    let Ly = cache && it._pc.get(key);
    if (!Ly) {
      Ly = layer(B, q, t, br, cl, al, lw, pl);
      if (cache) it._pc.set(key, Ly);
    }
    if (Ly.cv) g.drawImage(Ly.cv, Ly.x, Ly.y);
    else {
      g.globalAlpha = al;
      g.fillStyle = g.strokeStyle = Ly.fill;
      g.lineWidth = lw;
      g.lineJoin = "round";
      qpath(g, q);
      g.fill();
      g.stroke();
      g.globalAlpha = 1;
    }
  });
  if (!cache) B.c.width = B.c.height = 0;
  return qs;
}
function layer(B, q, t, br, cl, al, lw, pl) {
  const W = B.c.width, H = B.c.height, r = bbq(q), x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y));
  const fill = col(B.g, x0, y0, Math.max(1, Math.min(W - x0, Math.ceil(r.w))), Math.max(1, Math.min(H - y0, Math.ceil(r.h))), br, cl);
  if (t != "gloss" && t != "wet" && !pl) return { fill };
  const x = Math.max(0, x0 - 1), y = Math.max(0, y0 - 1), w = Math.min(W - x, Math.ceil(r.w) + 3), h = Math.min(H - y, Math.ceil(r.h) + 3);
  if (w < 6 || h < 4) return { fill };
  const d = B.g.getImageData(x, y, w, h).data, N = w * h, wet = t == "wet", pc = document.createElement("canvas");
  pc.width = w;
  pc.height = h;
  const m = pc.getContext("2d", { willReadFrequently: true });
  m.translate(-x, -y);
  m.lineWidth = lw;
  m.lineJoin = "round";
  qpath(m, q);
  m.fill();
  m.stroke();
  m.setTransform(1, 0, 0, 1, 0, 0);
  const md = m.getImageData(0, 0, w, h).data, L = new Float32Array(N), ins = [];
  for (let i = 0; i < N; i++) {
    L[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    if (md[i * 4 + 3] > 200) ins.push(i);
  }
  if (ins.length < 12) return { fill };
  const sv = ins.map((i) => L[i]).sort((a, b) => a - b), pcl = (p) => sv[Math.min(sv.length - 1, Math.floor(sv.length * p))], cut = pcl(0.6), white = pcl(0.75);
  const A = new Float64Array(36), Bv = new Float64Array(6), fx = (i) => {
    const px = i % w, py = (i - px) / w, u = px / w * 2 - 1, v = py / h * 2 - 1;
    return [1, u, v, u * u, u * v, v * v];
  };
  let nb = 0;
  for (let k = 0; k < ins.length; k += Math.max(1, ins.length >> 11)) {
    const i = ins[k];
    if (L[i] < cut) continue;
    const f = fx(i);
    nb++;
    for (let a = 0; a < 6; a++) {
      Bv[a] += f[a] * L[i];
      for (let b = 0; b < 6; b++) A[a * 6 + b] += f[a] * f[b];
    }
  }
  let c = [0, 0, 0, 0, 0, 0];
  if (nb >= 12) {
    for (let a = 0; a < 6; a++) A[a * 7] += 1e-3 * nb;
    const M = [];
    for (let a = 0; a < 6; a++) M.push([...A.slice(a * 6, a * 6 + 6), Bv[a]]);
    for (let a = 0; a < 6; a++) {
      let p = a;
      for (let r2 = a + 1; r2 < 6; r2++) if (Math.abs(M[r2][a]) > Math.abs(M[p][a])) p = r2;
      [M[a], M[p]] = [M[p], M[a]];
      for (let r2 = 0; r2 < 6; r2++) if (r2 != a) {
        const f = M[r2][a] / M[a][a];
        for (let k = a; k < 7; k++) M[r2][k] -= f * M[a][k];
      }
    }
    c = M.map((r2, a) => r2[6] / r2[a]);
  }
  const fit = (i) => {
    const f = fx(i);
    let v = 0;
    for (let a = 0; a < 6; a++) v += c[a] * f[a];
    return v;
  };
  let fm = 0;
  for (const i of ins) fm += fit(i);
  fm /= ins.length;
  if (!(fm > 1)) fm = white || 1;
  const rs = [];
  for (let k = 0; k < ins.length; k += Math.max(1, ins.length >> 10)) {
    const i = ins[k];
    if (L[i] >= white) rs.push(Math.abs(L[i] - fit(i)));
  }
  rs.sort((a, b) => a - b);
  const sig = Math.min(3, Math.max(0.4, (rs[rs.length >> 1] || 1) * 1.48 * 0.5));
  if (pl) {
    let R = 0, G = 0, Bc = 0, nn = 0;
    for (const i of ins) if (L[i] >= white) {
      R += d[i * 4];
      G += d[i * 4 + 1];
      Bc += d[i * 4 + 2];
      nn++;
    }
    const lm = nn ? (0.299 * R + 0.587 * G + 0.114 * Bc) / nn : 0, ck = (v) => Math.min(1.2, Math.max(0.8, v)), tint = lm > 20 ? [ck(R / nn / lm), ck(G / nn / lm), ck(Bc / nn / lm)] : [1, 1, 1];
    const tw = Math.max(240, Math.min(1400, Math.round(Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) * 1.4))), tex = plateTexC(pl, tw);
    const qx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, qy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4, Q = q.map(([a, b]) => {
      const dx = a - qx, dy = b - qy, l = Math.hypot(dx, dy) || 1;
      return [a + dx / l * lw * 0.5, b + dy / l * lw * 0.5];
    });
    m.clearRect(0, 0, w, h);
    warpTo(m, tex, Q.map(([a, b]) => [a - x, b - y]));
    m.setTransform(1, 0, 0, 1, 0, 0);
    const shine = t == "gloss" || wet, gain = wet ? 2.2 : 1.8, dk = wet ? 0.88 : 1;
    const pd = m.getImageData(0, 0, w, h), o2 = pd.data, mixB = (v) => br < 0 ? v * (1 + br / 255) : v + (255 - v) * br / 255;
    let sd2 = (Math.round(r.x / W * 1e4) * 73856093 ^ Math.round(r.y / H * 1e4) * 19349663) >>> 0 || 1;
    const rnd2 = () => {
      sd2 = sd2 * 1664525 + 1013904223 >>> 0;
      return sd2 / 4294967296;
    };
    for (let i = 0; i < N; i++) {
      const a = o2[i * 4 + 3];
      if (!a) continue;
      // gloss / wet: stronger light falloff across the plate, like the plain fill gets
      const sh = shine ? Math.min(1.5, Math.max(0.55, 1 + (gain - 1) * (fit(i) / fm - 1))) * dk : 1;
      const lit = Math.min(1.25, Math.max(0.08, fit(i) / 235)) * sh, n = (rnd2() + rnd2() + rnd2() - 1.5) * 2 * sig;
      for (let k = 0; k < 3; k++) {
        const v = o2[i * 4 + k];
        o2[i * 4 + k] = mixB(Math.max(0, Math.min(255, v * lit * tint[k] + n * Math.min(1, v * lit / Math.max(1, fm)))));
      }
      o2[i * 4 + 3] = a * al;
    }
    if (wet) drops(o2, md, w, h, ins, c, rnd2);
    m.putImageData(pd, 0, 0);
    const t2 = document.createElement("canvas");
    t2.width = w;
    t2.height = h;
    const g2 = t2.getContext("2d");
    g2.filter = `blur(${Math.max(0.3, Math.min(1.1, h * 35e-4)).toFixed(2)}px)`;
    g2.drawImage(pc, 0, 0);
    pc.width = pc.height = 0;
    return { fill, cv: t2, x, y };
  }
  const fc = fill.match(/\d+/g).map(Number), gain = wet ? 2.2 : 1.8, dk = wet ? 0.88 : 1, out = m.createImageData(w, h), o = out.data;
  let sd = (Math.round(r.x / W * 1e4) * 73856093 ^ Math.round(r.y / H * 1e4) * 19349663) >>> 0 || 1;
  const rnd = () => {
    sd = sd * 1664525 + 1013904223 >>> 0;
    return sd / 4294967296;
  };
  for (let i = 0; i < N; i++) {
    const a = md[i * 4 + 3];
    if (!a) continue;
    const rr = Math.min(1.5, Math.max(0.55, 1 + gain * (fit(i) / fm - 1))) * dk, n = (rnd() + rnd() + rnd() - 1.5) * 2 * sig;
    for (let k = 0; k < 3; k++) {
      const v = fc[k];
      o[i * 4 + k] = v * rr + n * Math.min(1, v / fm);
    }
    o[i * 4 + 3] = a * al;
  }
  if (wet) drops(o, md, w, h, ins, c, rnd);
  m.putImageData(out, 0, 0);
  return { fill, cv: pc, x, y };
}
// water drops for the wet finish: dark rims and small highlights, lit from the fitted light direction
function drops(o, md, w, h, ins, c, rnd) {
  let lx = -c[1], ly = -c[2];
  const gn = Math.hypot(lx, ly);
  if (gn < 1) {
    lx = -0.5;
    ly = -0.85;
  } else {
    lx /= gn;
    ly /= gn;
  }
  const area = ins.length, ph = Math.sqrt(area / 2.1), n = Math.round(Math.min(900, area / (ph * ph) * 100)), pick = () => ins[Math.floor(rnd() * ins.length)];
  for (let k = 0; k < n; k++) {
    const p = pick(), cx = p % w + rnd(), cy = (p - p % w) / w + rnd(), rad = ph * (35e-4 + 0.017 * rnd() ** 3), rh = rad * (1 + 0.35 * rnd()), hl = rad < 1.1 ? rnd() < 0.3 ? 0.25 + 0.5 * rnd() : 0 : 0.2 + 0.8 * rnd() ** 2, R0 = Math.ceil(rad * 1.6 + 1);
    const hx = cx + lx * rad * 0.38, hy = cy + ly * rh * 0.38, hr = Math.max(0.45, rad * 0.32);
    for (let yy = Math.max(0, Math.floor(cy - R0 * 1.4)); yy <= Math.min(h - 1, cy + R0 * 1.4); yy++) for (let xx = Math.max(0, Math.floor(cx - R0)); xx <= Math.min(w - 1, cx + R0); xx++) {
      const i = yy * w + xx;
      if (!md[i * 4 + 3]) continue;
      const dx = (xx + 0.5 - cx) / rad, dy = (yy + 0.5 - cy) / rh, dd = Math.sqrt(dx * dx + dy * dy);
      let dk2 = 0;
      if (rad > 1.1 && dd < 1.25) {
        const e = Math.max(0, 1 - Math.abs(dd - 0.88) / 0.32);
        dk2 = 0.16 * e * (0.6 + 0.4 * Math.max(0, dx * -lx + dy * -ly));
      } else if (rad <= 1.1) dk2 = 0.09 * Math.exp(-dd * dd * 1.4);
      const sx = (xx + 0.5 - hx) / hr, sy = (yy + 0.5 - hy) / hr, sp = Math.exp(-(sx * sx + sy * sy) * 1.6) * hl;
      for (let ch = 0; ch < 3; ch++) {
        const v = o[i * 4 + ch];
        o[i * 4 + ch] = v * (1 - dk2) + (255 - v) * sp * 0.85;
      }
    }
  }

}
function crop(W, H, it) {
  if (!state.ratio) return [0, 0, W, H];
  const [a, b] = state.ratio.split(":").map(Number), R = a / b, cs = it.cs || 1;
  let w = W, h = H;
  if (W / H > R) w = H * R;
  else h = W / R;
  w *= cs;
  h *= cs;
  const x = Math.min(W - w, Math.max(0, (it.cx ?? 0.5) * W - w / 2)), y = Math.min(H - h, Math.max(0, (it.cy ?? 0.5) * H - h / 2));
  return [Math.round(x), Math.round(y), Math.round(w), Math.round(h)];
}
export {
  crop,
  paint
};
