// 四角形・ホモグラフィなどの幾何計算
const rq = (x, y, w, h) => ({ q: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
function bbq(q) {
  const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]), x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
function inPoly(q, p) {
  let c = false;
  for (let i = 0, j = 3; i < 4; j = i++) {
    const [a, b] = q[i], [e, f] = q[j];
    if (b > p[1] != f > p[1] && p[0] < (e - a) * (p[1] - b) / (f - b) + a) c = !c;
  }
  return c;
}
const qpath = (g, q) => {
  g.beginPath();
  q.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y));
  g.closePath();
};
function homog(s, d) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = s[i], [X, Y] = d[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]);
    b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]);
    b.push(Y);
  }
  for (let i = 0; i < 8; i++) {
    let p = i;
    for (let r = i + 1; r < 8; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]];
    [b[i], b[p]] = [b[p], b[i]];
    for (let r = 0; r < 8; r++) if (r != i) {
      const f = A[r][i] / A[i][i];
      for (let k = i; k < 8; k++) A[r][k] -= f * A[i][k];
      b[r] -= f * b[i];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return ([x, y]) => {
    const w = h[6] * x + h[7] * y + 1;
    return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w];
  };
}
function nms(a, T = 0.45) {
  a.sort((p, q) => q.s - p.s);
  const o = [];
  for (const b of a) {
    if (o.every((k) => {
      const iw = Math.min(b.x + b.w, k.x + k.w) - Math.max(b.x, k.x), ih = Math.min(b.y + b.h, k.y + k.h) - Math.max(b.y, k.y);
      if (iw <= 0 || ih <= 0) return true;
      const i = iw * ih;
      return i / (b.w * b.h + k.w * k.h - i) < T;
    })) o.push(b);
  }
  return o;
}
function ovr(a, b) {
  const iw = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), ih = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (iw <= 0 || ih <= 0) return 0;
  return iw * ih / Math.max(1, Math.min(a.w * a.h, b.w * b.h));
}
function iou(a, b) {
  const iw = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), ih = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  if (iw <= 0 || ih <= 0) return 0;
  const i = iw * ih;
  return i / (a.w * a.h + b.w * b.h - i);
}
function hull2(P) {
  P = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), L = [], U = [];
  for (const p of P) {
    while (L.length > 1 && cr(L[L.length - 2], L[L.length - 1], p) <= 0) L.pop();
    L.push(p);
  }
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    while (U.length > 1 && cr(U[U.length - 2], U[U.length - 1], p) <= 0) U.pop();
    U.push(p);
  }
  L.pop();
  U.pop();
  return L.concat(U);
}
const parea = (q) => {
  let a = 0;
  for (let i = 0; i < q.length; i++) {
    const p = q[i], n = q[(i + 1) % q.length];
    a += p[0] * n[1] - n[0] * p[1];
  }
  return Math.abs(a) / 2;
};
function dpClosed(H, eps) {
  const n = H.length;
  if (n <= 4) return H;
  let a = 0, b = 0, bd = -1;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const d = Math.hypot(H[i][0] - H[j][0], H[i][1] - H[j][1]);
    if (d > bd) {
      bd = d;
      a = i;
      b = j;
    }
  }
  const seg = (i, j) => {
    const out = [];
    const rec = (i2, j2) => {
      let mi = -1, md = eps;
      const A = H[i2 % n], B = H[j2 % n], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1;
      for (let k = i2 + 1; k < j2; k++) {
        const P = H[k % n], d = Math.abs(dy * P[0] - dx * P[1] + B[0] * A[1] - B[1] * A[0]) / L;
        if (d > md) {
          md = d;
          mi = k;
        }
      }
      if (mi >= 0) {
        rec(i2, mi);
        out.push(H[mi % n]);
        rec(mi, j2);
      }
    };
    rec(i, j);
    return out;
  };
  return [H[a], ...seg(a, b), H[b], ...seg(b, a + n)];
}
function minRect(H) {
  let best = null;
  for (let i = 0; i < H.length; i++) {
    const A = H[i], B = H[(i + 1) % H.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L;
    let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
    for (const p of H) {
      const s = p[0] * ux + p[1] * uy, t = -p[0] * uy + p[1] * ux;
      a = Math.min(a, s);
      b = Math.max(b, s);
      c = Math.min(c, t);
      d = Math.max(d, t);
    }
    const ar = (b - a) * (d - c);
    if (!best || ar < best.ar) best = { ar, q: [[a, c], [b, c], [b, d], [a, d]].map(([s, t]) => [s * ux - t * uy, s * uy + t * ux]) };
  }
  return best.q;
}
function quad4(H) {
  const per = H.reduce((s, p, i) => s + Math.hypot(p[0] - H[(i + 1) % H.length][0], p[1] - H[(i + 1) % H.length][1]), 0);
  let a = H;
  for (let k = 0; k < 30; k++) {
    a = dpClosed(H, (0.01 + k * 48e-4) * per);
    if (a.length <= 4) break;
  }
  if (a.length != 4) a = minRect(H);
  const cx = a.reduce((s, p) => s + p[0], 0) / 4, cy = a.reduce((s, p) => s + p[1], 0) / 4;
  a = a.slice().sort((p, q) => Math.atan2(p[1] - cy, p[0] - cx) - Math.atan2(q[1] - cy, q[0] - cx));
  let i0 = 0;
  a.forEach((p, i) => {
    if (p[0] + p[1] < a[i0][0] + a[i0][1]) i0 = i;
  });
  return a.slice(i0).concat(a.slice(0, i0));
}
const med = (a) => {
  const v = a.slice().sort((p, q) => p - q);
  return v.length ? v[v.length >> 1] : 0;
};
const knob = (Q, off, W, H) => {
  const cx = (Q[0][0] + Q[1][0] + Q[2][0] + Q[3][0]) / 4, cy = (Q[0][1] + Q[1][1] + Q[2][1] + Q[3][1]) / 4, at = (a, b) => {
    const mx = (Q[a][0] + Q[b][0]) / 2, my = (Q[a][1] + Q[b][1]) / 2, l = Math.hypot(mx - cx, my - cy) || 1;
    return { M: [mx, my], H: [mx + (mx - cx) / l * off, my + (my - cy) / l * off], C: [cx, cy] };
  };
  const B = Array.isArray(W) ? W : [0, 0, W, H], out = (K) => K.H[1] > B[3] - off * 0.4 || K.H[1] < B[1] + off * 0.4 || K.H[0] < B[0] + off * 0.4 || K.H[0] > B[2] - off * 0.4, k = at(2, 3);
  if (!out(k)) return k;
  const t = at(0, 1);
  return out(t) ? k : t;
};
const mids = (Q) => Q.map((a, i) => {
  const b = Q[(i + 1) % 4];
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
});
export {
  bbq,
  homog,
  hull2,
  inPoly,
  iou,
  knob,
  med,
  mids,
  nms,
  ovr,
  parea,
  qpath,
  quad4,
  rq
};
