// タップ・ドラッグ・ピンチ操作
import { UZ, cv } from "../dom.js";
import { pushHist, snap } from "./history.js";
import { runRegion } from "./masks.js";
import { animT, apply, draw, zMin, gest, rdraw, unzoom, visB, zoomAt, zoomToBox, zr } from "./view.js";
import { bbq, inPoly, knob, mids, rq } from "../geometry.js";
import { tr } from "../i18n.js";
import { crop } from "../render/paint.js";
import { state } from "../state.js";
import { msg } from "../ui/toast.js";
import { ui } from "../ui/ui.js";
const P = /* @__PURE__ */ new Map();
function pt(e) {
  const r = cv.getBoundingClientRect(), it = state.items[state.cur];
  return [(e.clientX - r.left) / r.width * it.bmp.width, (e.clientY - r.top) / r.height * it.bmp.height];
}
const VW = cv.parentElement;
VW.onpointerdown = (e) => {
  if (state.cur < 0 || e.target.closest("#zc,#delb,#undo,#redo")) return;
  VW.setPointerCapture(e.pointerId);
  P.set(e.pointerId, [e.clientX, e.clientY]);
  if (P.size > 2) return;
  if (P.size == 2) {
    state.drag = null;
    state.g0 = gest();
    draw();
    return;
  }
  if ((state.pan || cropMode() && !inCrop(pt(e))) && state.z > 1) {
    state.g0 = { pan: 1, x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty };
    return;
  }
  start(pt(e), e);
};
VW.onpointermove = (e) => {
  if (!P.has(e.pointerId)) return;
  P.set(e.pointerId, [e.clientX, e.clientY]);
  if (P.size == 2 && state.g0 && !state.g0.pan) {
    const n = gest(), r = cv.parentElement.getBoundingClientRect();
    state.tx += n.mx - state.g0.mx;
    state.ty += n.my - state.g0.my;
    zoomAt(n.d / state.g0.d, n.mx - r.left, n.my - r.top);
    state.g0 = n;
    return;
  }
  if (state.g0 && state.g0.pan) {
    if (Math.hypot(e.clientX - state.g0.x, e.clientY - state.g0.y) > 6) state.g0.moved = true;
    state.tx = state.g0.tx + e.clientX - state.g0.x;
    state.ty = state.g0.ty + e.clientY - state.g0.y;
    apply();
    return;
  }
  if (state.drag) {
    movedrag(pt(e));
    rdraw();
  }
};
VW.onpointerup = (e) => {
  P.delete(e.pointerId);
  if (state.g0) {
    const g = state.g0;
    if (P.size < 2) state.g0 = null;
    state.drag = null;
    // a touch on the photo that did not move is a tap after all
    if (g.tap && !g.moved && P.size == 0) emptyTap(g.tap);
    return;
  }
  if (!state.drag) return;
  const d = state.drag;
  enddrag();
  state.drag = null;
  draw();
  ui();
  if (d.m == "d") runRegion(d);
};
VW.onpointercancel = (e) => {
  P.delete(e.pointerId);
  state.g0 = null;
  state.drag = null;
  draw();
};
const inCrop = (p) => {
  const it = state.items[state.cur];
  if (!state.ratio) return true;
  const [x, y, w, h] = crop(it.bmp.width, it.bmp.height, it);
  return p[0] >= x && p[0] <= x + w && p[1] >= y && p[1] <= y + h;
};
const cropMode = () => state.panel == "size" && !!state.ratio;
// a plate under the finger; small plates (a few pixels on a phone) also count when the tap lands just beside them
function hit(it, p) {
  const i = it.boxes.findLastIndex((b) => inPoly(b.q, p));
  // (not while drawing a new mask by hand: a box may start right next to another one)
  if (i >= 0 || state.mode) return i;
  const k = it.bmp.width / (cv.getBoundingClientRect().width || 1), tol = 16 * k;
  let best = -1, bd = tol;
  it.boxes.forEach((b, j) => {
    const r = bbq(b.q), dx = Math.max(r.x - p[0], 0, p[0] - r.x - r.w), dy = Math.max(r.y - p[1], 0, p[1] - r.y - r.h), d = Math.hypot(dx, dy);
    if (d < bd) {
      bd = d;
      best = j;
    }
  });
  return best;
}
function moved(a, b) {
  const k = cv.parentElement.clientWidth / state.items[state.cur].bmp.width * state.z;
  let m = 0;
  a.forEach((x, i) => x.q.forEach((v, j) => {
    const w = b[i] && b[i].q[j];
    if (w) m = Math.max(m, Math.hypot(v[0] - w[0], v[1] - w[1]) * k);
  }));
  return m >= 3;
}
const buzz = () => {
  try {
    navigator.vibrate && navigator.vibrate(8);
  } catch (_) {
  }
};
function start(p, e) {
  const it = state.items[state.cur], k = it.bmp.width / (cv.getBoundingClientRect().width || 1);
  if (cropMode()) {
    if (inCrop(p)) state.drag = { m: "c", s: p, cx: it.cx ?? 0.5, cy: it.cy ?? 0.5 };
    return;
  }
  if (state.mode == "hide" && state.ratio && !inCrop(p)) {
    msg(tr("切り抜き範囲の外です"));
    return;
  }
  if (state.mode == "det") {
    state.drag = { m: "d", a: p, b: p };
    return;
  }
  if (state.sel >= 0 && it.boxes[state.sel]) {
    const Q = it.boxes[state.sel].q, HR = 22 * k * UZ(), pick = (pts) => {
      let c2 = -1, bd = HR;
      pts.forEach((q, i2) => {
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < bd) {
          bd = d;
          c2 = i2;
        }
      });
      return c2;
    };
    const c = pick(Q);
    if (c >= 0) {
      buzz();
      state.drag = { m: "r", c, s: p, o: [...Q[c]], f: p, ov: [0, 0], sn: snap(it) };
      draw();
      return;
    }
    {
      const K = knob(Q, 30 * UZ() * Math.max(0.8, 1 / Math.sqrt(state.z)) * k, visB(k));
      if (Math.hypot(K.H[0] - p[0], K.H[1] - p[1]) < HR) {
        buzz();
        state.drag = { m: "rot", C: K.C, a0: Math.atan2(p[1] - K.C[1], p[0] - K.C[0]), o: Q.map((v) => [...v]), sn: snap(it) };
        draw();
        return;
      }
    }
    const e = pick(mids(Q));
    if (e >= 0) {
      buzz();
      state.drag = { m: "e", e, s: p, o: Q.map((v) => [...v]), sn: snap(it) };
      draw();
      return;
    }
  }
  const i = hit(it, p);
  if (i >= 0) {
    const ns = i != state.sel;
    state.sel = i;
    state.drag = { m: "m", i, s: p, o: it.boxes[i].q.map((v) => [...v]), mv: false, ns, sn: snap(it) };
    ui();
    draw();
    return;
  }
  if (state.mode == "hide") {
    state.drag = { m: "n", a: p, b: p, f: p, ov: [0, 0] };
    draw();
    return;
  }
  // empty area: when zoomed in, a drag moves the photo (no need for "画像移動"); a tap still deselects / double-tap zooms
  if (e && state.z > zMin() * 1.01 && !state.mode) {
    state.g0 = { pan: 1, x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty, tap: p };
    return;
  }
  emptyTap(p);
}
function emptyTap(p) {
  const it = state.items[state.cur];
  if (state.sel >= 0) {
    state.sel = -1;
    unzoom();
    ui();
    draw();
    return;
  }
  const now = performance.now(), lt = emptyTap.lt;
  emptyTap.lt = { t: now, p };
  if (lt && now - lt.t < 320 && Math.hypot(lt.p[0] - p[0], lt.p[1] - p[1]) < it.bmp.width * 0.04) {
    emptyTap.lt = null;
    const W0 = cv.parentElement.clientWidth, k2 = W0 / it.bmp.width;
    if (state.z > zMin() * 1.05) {
      zr();
    } else {
      zoomAt(2.5, state.tx + p[0] * k2 * state.z, state.ty + p[1] * k2 * state.z);
    }
    animT();
    return;
  }
  ui();
  draw();
}
function movedrag(p) {
  const it = state.items[state.cur], W = it.bmp.width, H = it.bmp.height, d = state.drag;
  if (d.m == "rot") {
    let a = Math.atan2(p[1] - d.C[1], p[0] - d.C[0]) - d.a0;
    const e0 = Math.atan2(d.o[1][1] - d.o[0][1], d.o[1][0] - d.o[0][0]), fin = e0 + a, sn = Math.round(fin / (Math.PI / 2)) * (Math.PI / 2);
    if (Math.abs(fin - sn) < 0.025) a = sn - e0;
    const cs = Math.cos(a), sn2 = Math.sin(a), Q = d.o.map(([x, y]) => {
      const dx = x - d.C[0], dy = y - d.C[1];
      return [d.C[0] + dx * cs - dy * sn2, d.C[1] + dx * sn2 + dy * cs];
    });
    if (Q.every(([x, y]) => x >= 0 && y >= 0 && x <= W && y <= H)) it.boxes[state.sel].q = Q;
    return;
  }
  if (d.m == "c") {
    const [x, y, w, h] = crop(W, H, { cx: d.cx + (p[0] - d.s[0]) / W, cy: d.cy + (p[1] - d.s[1]) / H, cs: it.cs });
    it.cx = (x + w / 2) / W;
    it.cy = (y + h / 2) / H;
    return;
  }
  if (d.m == "n") {
    d.f = p;
    d.b = [Math.min(W, Math.max(0, p[0] + d.ov[0])), Math.min(H, Math.max(0, p[1] + d.ov[1]))];
    return;
  }
  if (d.m == "d") {
    d.b = p;
    return;
  }
  if (d.m == "e") {
    const a = d.e, b = (d.e + 1) % 4;
    let dx = p[0] - d.s[0], dy = p[1] - d.s[1];
    for (const n of [a, b]) {
      dx = Math.min(W - d.o[n][0], Math.max(-d.o[n][0], dx));
      dy = Math.min(H - d.o[n][1], Math.max(-d.o[n][1], dy));
    }
    const Q = it.boxes[state.sel].q;
    Q[a] = [d.o[a][0] + dx, d.o[a][1] + dy];
    Q[b] = [d.o[b][0] + dx, d.o[b][1] + dy];
    return;
  }
  if (d.m == "m") {
    const r = bbq(d.o);
    let dx = p[0] - d.s[0], dy = p[1] - d.s[1];
    if (Math.hypot(dx, dy) * cv.parentElement.clientWidth / W * state.z >= 6) d.mv = true;
    if (!d.mv) {
      it.boxes[d.i].q = d.o.map((v) => [...v]);
      return;
    }
    dx = Math.min(W - r.x - r.w, Math.max(-r.x, dx));
    dy = Math.min(H - r.y - r.h, Math.max(-r.y, dy));
    it.boxes[d.i].q = d.o.map(([x, y]) => [x + dx, y + dy]);
    return;
  }
  d.f = p;
  const t = [p[0] + d.ov[0], p[1] + d.ov[1]], np = [Math.min(W, Math.max(0, d.o[0] + t[0] - d.s[0])), Math.min(H, Math.max(0, d.o[1] + t[1] - d.s[1]))];
  it.boxes[state.sel].q[d.c] = np;
}
function enddrag() {
  const it = state.items[state.cur], d = state.drag, W = it.bmp.width, H = it.bmp.height;
  if (d.m == "c") {
    if (Math.abs((it.cx ?? 0.5) - d.cx) + Math.abs((it.cy ?? 0.5) - d.cy) > 2e-3) it.ok = false;
    return;
  }
  if (d.m == "d") return;
  if (d.m == "m") {
    if (d.mv) {
      it.ok = false;
      pushHist(it, d.sn);
    } else if (d.ns) zoomToBox(it.boxes[state.sel]);
    return;
  }
  if (d.m == "r" || d.m == "e" || d.m == "rot") {
    if (moved(d.sn, it.boxes)) {
      it.ok = false;
      pushHist(it, d.sn);
    } else it.boxes = d.sn;
    return;
  }
  let [X0, Y0, CW, CH] = state.ratio ? crop(W, H, it) : [0, 0, W, H];
  const cl = (v) => [Math.min(X0 + CW, Math.max(X0, v[0])), Math.min(Y0 + CH, Math.max(Y0, v[1]))], a = cl(d.a), b = cl(d.b), x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(a[0] - b[0]), h = Math.abs(a[1] - b[1]);
  if (w < W * 0.015 / state.z && h < W * 0.015 / state.z) {
    state.sel = -1;
  } else {
    pushHist(it);
    it.boxes.push(rq(x, y, Math.min(W - x, w), Math.min(H - y, h)));
    state.sel = it.boxes.length - 1;
    it.ok = false;
  }
}
export {
  P,
  cropMode
};
