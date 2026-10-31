// 表示・ズーム
import { $, UZ, cv } from "../dom.js";
import { P, cropMode } from "./pointer.js";
import { bbq, knob, mids } from "../geometry.js";
import { tr } from "../i18n.js";
import { crop, paint } from "../render/paint.js";
import { state } from "../state.js";
// After a size (ratio) is chosen and the size panel is closed, editing shows only the cropped area.
// The canvas still holds the whole photo; the viewer is cut to the crop's shape and zoom/pan are kept inside it.
function cropView() {
  const it = state.items[state.cur];
  if (!it || !it.bmp || !state.ratio || cropMode()) return null;
  return crop(it.bmp.width, it.bmp.height, it);
}
const zMin = () => {
  const C = cropView();
  return C ? state.items[state.cur].bmp.width / C[2] : 1;
};
let lastVK = "";
function syncView() {
  const C = cropView(), k = state.cur + "|" + (C ? C.map((v) => v.toFixed(1)).join(",") : "full");
  if (k == lastVK) return;
  lastVK = k;
  fitView();
  zr();
}
function draw() {
  const it = state.items[state.cur];
  if (!it || !it.bmp) return;
  syncView();
  // the plate was let go while the photo was pushed past its edge: bring the photo back
  if (apply.sl && !(state.sel >= 0 && it.boxes[state.sel])) {
    animT();
    apply();
  }
  // resolution of the canvas: more pixels as the zoom grows (in steps, so a pinch does not reallocate it every frame)
  const uz = UZ(), PV = Math.min(4096, Math.max(1800, cv.parentElement.clientWidth * (devicePixelRatio || 1) * (state.z > 3 ? 4 : state.z > 1.3 ? 2 : 1))), s = Math.min(1, PV / Math.max(it.bmp.width, it.bmp.height)), bx = paint(it, cv, s, state.sel), g = cv.getContext("2d"), lw = Math.max(2, cv.width / 300);
  const q0 = uz * Math.max(0.8, 1 / Math.sqrt(state.z)) / (cv.getBoundingClientRect().width / cv.width || 1);
  if (state.peek) {
    paint({ bmp: it.bmp, boxes: [] }, cv, s, -1, false);
    $("#delb").hidden = true;
    cursorOv();
    return;
  }
  if (state.sel >= 0 && bx[state.sel]) {
    const Q = bx[state.sel], q = q0;
    const path = () => {
      g.beginPath();
      Q.forEach(([a, b], k) => k ? g.lineTo(a, b) : g.moveTo(a, b));
      g.closePath();
    };
    g.lineJoin = "round";
    g.strokeStyle = "#fff";
    g.lineWidth = 5 * q;
    path();
    g.stroke();
    g.strokeStyle = "#2f6bff";
    g.lineWidth = 2.5 * q;
    path();
    g.stroke();
    const ae = state.drag && state.drag.m == "e" ? state.drag.e : -1;
    mids(Q).forEach(([a, b], i) => {
      const A = Q[i], B = Q[(i + 1) % 4], ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
      g.save();
      g.translate(a, b);
      g.rotate(ang);
      g.beginPath();
      g.roundRect(-13 * q, -4.5 * q, 26 * q, 9 * q, 4.5 * q);
      g.fillStyle = i == ae ? "#2f6bff" : "#fff";
      g.fill();
      g.strokeStyle = "#2f6bff";
      g.lineWidth = 2 * q;
      g.stroke();
      g.restore();
    });
    {
      const K = knob(Q, 30 * q, visB(cv.width / (cv.getBoundingClientRect().width || 1))), on = state.drag && state.drag.m == "rot";
      g.lineCap = "round";
      g.strokeStyle = "#fff";
      g.lineWidth = 4 * q;
      g.beginPath();
      g.moveTo(...K.M);
      g.lineTo(...K.H);
      g.stroke();
      g.strokeStyle = "#2f6bff";
      g.lineWidth = 2 * q;
      g.stroke();
      g.beginPath();
      g.arc(K.H[0], K.H[1], 11 * q, 0, 7);
      g.fillStyle = on ? "#2f6bff" : "#fff";
      g.fill();
      g.strokeStyle = "#2f6bff";
      g.lineWidth = 2.5 * q;
      g.stroke();
      g.strokeStyle = on ? "#fff" : "#2f6bff";
      g.lineWidth = 1.8 * q;
      g.beginPath();
      g.arc(K.H[0], K.H[1], 5.5 * q, -2.6, 1.3);
      g.stroke();
      const ax = K.H[0] + 5.5 * q * Math.cos(1.3), ay = K.H[1] + 5.5 * q * Math.sin(1.3);
      g.beginPath();
      g.moveTo(ax - 3 * q, ay - 0.5 * q);
      g.lineTo(ax, ay);
      g.lineTo(ax + 0.8 * q, ay - 3.2 * q);
      g.stroke();
    }
    const act = state.drag && state.drag.m == "r" ? state.drag.c : -1;
    Q.forEach(([a, b], i) => {
      g.beginPath();
      if (i == act) {
        g.arc(a, b, 12 * q, 0, 7);
        g.fillStyle = "#fff";
        g.fill();
        g.strokeStyle = "#2f6bff";
        g.lineWidth = 4 * q;
        g.stroke();
        g.beginPath();
        g.arc(a, b, 3.5 * q, 0, 7);
        g.fillStyle = "#2f6bff";
        g.fill();
      } else {
        g.globalAlpha = act >= 0 ? 0.45 : 1;
        g.arc(a, b, 10 * q, 0, 7);
        g.fillStyle = "#2f6bff";
        g.fill();
        g.strokeStyle = "#fff";
        g.lineWidth = 2 * q;
        g.stroke();
        g.globalAlpha = 1;
      }
    });
  }
  if (state.drag && (state.drag.m == "n" || state.drag.m == "d")) {
    const [a, b] = [state.drag.a, state.drag.b], x = Math.min(a[0], b[0]) * s, y = Math.min(a[1], b[1]) * s, w = Math.abs(a[0] - b[0]) * s, h = Math.abs(a[1] - b[1]) * s;
    if (state.drag.m == "d") {
      g.fillStyle = "rgba(47,107,255,.14)";
      g.fillRect(x, y, w, h);
    }
    g.lineWidth = 2.5 * q0;
    g.strokeStyle = state.drag.m == "d" ? "#2f6bff" : "#fff";
    g.setLineDash([9 * q0, 6 * q0]);
    g.strokeRect(x, y, w, h);
    g.setLineDash([]);
  }
  if (state.ratio && !cropView()) {
    const [x, y, w, h] = crop(cv.width, cv.height, it);
    g.fillStyle = "rgba(0,0,0,.55)";
    g.beginPath();
    g.rect(0, 0, cv.width, cv.height);
    g.rect(x, y, w, h);
    g.fill("evenodd");
    g.strokeStyle = "#fff";
    g.lineWidth = lw;
    g.strokeRect(x, y, w, h);
  }
  placeDel();
  cursorOv();
}
function cursorOv() {
  const o = $("#ov"), v = cv.parentElement, W = v.clientWidth, H = v.clientHeight, dpr = devicePixelRatio || 1;
  if (o.width != Math.round(W * dpr) || o.height != Math.round(H * dpr)) {
    o.width = Math.round(W * dpr);
    o.height = Math.round(H * dpr);
  }
  const g = o.getContext("2d");
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);
  const it = state.items[state.cur];
  if (!it || !state.drag || !state.drag.f || !(state.drag.m == "r" || state.drag.m == "n")) return;
  const k = W / it.bmp.width * state.z, sp = ([x, y]) => [state.tx + x * k, state.ty + y * k], t = state.drag.m == "r" ? it.boxes[state.sel].q[state.drag.c] : state.drag.b, F = sp(state.drag.f), T = sp(t);
  g.lineCap = "round";
  const dx = T[0] - F[0], dy = T[1] - F[1], dl = Math.hypot(dx, dy);
  if (dl > 34) {
    const ux = dx / dl, uy = dy / dl;
    g.strokeStyle = "rgba(0,0,0,.35)";
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(F[0] + ux * 22, F[1] + uy * 22);
    g.lineTo(T[0] - ux * 13, T[1] - uy * 13);
    g.stroke();
    g.strokeStyle = "#fff";
    g.lineWidth = 2.5;
    g.stroke();
    g.fillStyle = "rgba(255,255,255,.28)";
    g.strokeStyle = "#fff";
    g.lineWidth = 2;
    g.beginPath();
    g.arc(F[0], F[1], 22, 0, 7);
    g.fill();
    g.stroke();
  }
  g.strokeStyle = "#fff";
  g.lineWidth = 4.5;
  g.beginPath();
  g.arc(T[0], T[1], 11, 0, 7);
  g.stroke();
  g.strokeStyle = "#2f6bff";
  g.lineWidth = 2.5;
  g.stroke();
}
let lastZ = 1;
let rdq = false;
function rdraw() {
  if (rdraw.q) return;
  rdraw.q = 1;
  requestAnimationFrame(() => {
    rdraw.q = 0;
    draw();
  });
}
function apply() {
  const v = cv.parentElement, w = v.clientWidth, h = v.clientHeight, it = state.items[state.cur], C = cropView(), zm = zMin();
  if (!it || !it.bmp) return;
  state.z = Math.min(8 * zm, Math.max(zm, state.z));
  // keep the shown area (the crop, or the whole photo) inside the viewer; centre it when it is smaller
  // (it is smaller only in full screen, where the viewer is as tall as the screen)
  const k = w / it.bmp.width * state.z, [X, Y, CW, CH] = C || [0, 0, it.bmp.width, it.bmp.height];
  // while a plate is selected the photo may move a little past its edge, so a plate at the edge can come to the middle (its corners are then easy to reach)
  const sl = state.sel >= 0 && state.z > zm * 1.01 ? 0.35 : 0;
  apply.sl = sl;
  const fit = (t, view, o, len) => len * k <= view ? (view - len * k) / 2 - o * k : Math.min(-o * k + sl * view, Math.max(view - (o + len) * k - sl * view, t));
  state.tx = fit(state.tx, w, X, CW);
  state.ty = fit(state.ty, h, Y, CH);
  cv.style.transform = `translate(${state.tx}px,${state.ty}px) scale(${state.z})`;
  $("#zl").textContent = Math.round(state.z / zm * 100) + "%";
  placeDel();
  if (state.z != lastZ) {
    lastZ = state.z;
    if (!rdq) {
      rdq = true;
      requestAnimationFrame(() => {
        rdq = false;
        draw();
      });
    }
  }
}
const visB = (sc) => {
  const r = cv.getBoundingClientRect(), v = cv.parentElement.getBoundingClientRect();
  return [(v.left - r.left) * sc, (v.top - r.top) * sc, (v.right - r.left) * sc, (v.bottom - r.top) * sc];
};
let zprev = null;
function animT() {
  cv.classList.add("anim");
  clearTimeout(animT.t);
  animT.t = setTimeout(() => {
    cv.classList.remove("anim");
    draw();
  }, 320);
}
function zoomToBox(b) {
  const it = state.items[state.cur];
  if (!b || !it) return;
  const r = bbq(b.q), W0 = cv.parentElement.clientWidth, H0 = cv.parentElement.clientHeight, k0 = W0 / it.bmp.width, zm = zMin();
  const room = Math.min(0.3, 12 * UZ() / H0), rb = Math.min(0.25, 52 * UZ() / H0), nz = Math.max(zm, Math.min(8 * zm, 0.7 * W0 / (r.w * k0), (0.86 - room - rb) * H0 / (r.h * k0)));
  if (nz <= state.z * 1.05 && state.z > zm) return;
  if (!zprev) zprev = { z: state.z, tx: state.tx, ty: state.ty };
  state.z = Math.max(state.z, nz);
  state.tx = W0 / 2 - (r.x + r.w / 2) * k0 * state.z;
  state.ty = H0 * (0.5 + room / 2 - rb / 2) - (r.y + r.h / 2) * k0 * state.z;
  animT();
  apply();
}
// moves to another plate: keeps the current zoom (at least enough to see the plate) and centers it
function centerBox(b) {
  const it = state.items[state.cur];
  if (!b || !it) return;
  const r = bbq(b.q), W0 = cv.parentElement.clientWidth, H0 = cv.parentElement.clientHeight, k0 = W0 / it.bmp.width, zm = zMin();
  const nz = Math.max(zm, Math.min(8 * zm, 0.7 * W0 / (r.w * k0), 0.6 * H0 / (r.h * k0)));
  if (!zprev) zprev = { z: state.z, tx: state.tx, ty: state.ty };
  state.z = Math.max(state.z, nz);
  state.tx = W0 / 2 - (r.x + r.w / 2) * k0 * state.z;
  state.ty = H0 / 2 - (r.y + r.h / 2) * k0 * state.z;
  animT();
  apply();
}
// plates in reading order (left to right, then top to bottom)
function stepBox(d) {
  const it = state.items[state.cur];
  if (!it || it.boxes.length < 2 || state.sel < 0) return;
  const o = it.boxes.map((b, i) => [bbq(b.q), i]).sort((a, b) => a[0].x + a[0].w / 2 - (b[0].x + b[0].w / 2) || a[0].y - b[0].y).map((a) => a[1]);
  const k = o.indexOf(state.sel);
  state.sel = o[(k + d + o.length) % o.length];
  state.cf = false;
  centerBox(it.boxes[state.sel]);
  draw();
  document.dispatchEvent(new Event("nk:sel"));
}
$("#bprev").onclick = () => stepBox(-1);
$("#bnext").onclick = () => stepBox(1);
function setFull(on) {
  document.body.classList.toggle("fs", on);
  $("#fs").setAttribute("aria-label", on ? "全画面を閉じる" : "全画面");
  placeStrip();
  fitView();
  zr();
  draw();
}
$("#fs").onclick = () => setFull(!document.body.classList.contains("fs"));
function unzoom() {
  if (!zprev) return;
  state.z = zprev.z;
  state.tx = zprev.tx;
  state.ty = zprev.ty;
  zprev = null;
  animT();
  apply();
}
// the toolbar of the selected plate (‹ 決定 🗑 ›) sits in the line under the photo, never over it,
// so it cannot cover a corner that is about to be dragged (full screen: at the top of the screen)
function placeDel() {
  const it = state.items[state.cur], d = $("#delb"), b = it && it.boxes[state.sel];
  if (!b || cropMode()) {
    d.hidden = true;
    $("#hint").classList.remove("sel");
    state.cf = false;
    return;
  }
  $("#delq").hidden = !state.cf;
  $("#deln").hidden = !state.cf;
  // ‹ › are always there while a plate is selected; with a single plate they are dimmed
  $("#bprev").hidden = $("#bnext").hidden = state.cf;
  $("#bprev").disabled = $("#bnext").disabled = it.boxes.length < 2;
  $("#decb").hidden = state.cf;
  $("#dely").className = state.cf ? "x" : "";
  $("#dely").innerHTML = state.cf ? tr("削除") : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 12.5h9l1-12.5"/></svg>';
  d.hidden = false;
  $("#hint").classList.add("sel");
}
function layoutMode() {
  const w = innerWidth >= 900, sh = innerHeight < 520 && innerWidth >= 600 && innerWidth > innerHeight;
  document.body.classList.toggle("wide", w || sh);
  document.body.classList.toggle("short", sh);
  placeStrip();
  placeDock(w || sh);
}
// phone: undo / redo, the status (or "‹ 決定 🗑 ›" for the selected plate) and the zoom buttons share one row under the photo
const strip = document.createElement("div");
strip.id = "strip";
$("#vw").append(strip);
function placeStrip() {
  const b = document.body, on = !b.classList.contains("wide") && !b.classList.contains("fs"), h = $("#hint");
  if (on && h.parentElement !== strip) strip.append($("#undo"), $("#redo"), h, $("#zc"));
  else if (!on && h.parentElement === strip) {
    $("#vw").append($("#undo"), $("#redo"), $("#zc"));
    $("#vw").after(h);
  }
  b.classList.toggle("strip", on);
}
function placeDock(wide) {
  const d = $("#dock"), t = $("#tools"), ps = [$("#pSize"), $("#pBr"), $("#pPl"), $("#pTx")];
  if (!wide) {
    if (t.parentElement !== d) d.append(...ps, t);
  } else if (t.parentElement === d) $("#hint").after(t, ...ps);
}
layoutMode();
function fitView() {
  const v = cv.parentElement, it = state.items[state.cur];
  if (!it || !it.bmp) {
    v.style.maxWidth = "";
    v.style.height = "";
    return;
  }
  const C = cropView(), asp = C ? C[2] / C[3] : it.bmp.width / it.bmp.height;
  if (document.body.classList.contains("fs")) {
    // full screen: as large as the screen allows
    // the viewer is as tall as the screen, so a zoomed photo can use all of it
    const W = innerWidth, H = v.parentElement.clientHeight;
    v.parentElement.style.paddingTop = "";
    v.style.maxWidth = v.style.width = Math.floor(Math.min(W, H * asp)) + "px";
    v.style.height = H + "px";
    return;
  }
  v.style.width = "";
  // the viewer takes the crop's shape (its height follows its width)
  const setH = () => v.style.height = C ? Math.round(v.clientWidth / asp) + "px" : "";
  if (document.body.classList.contains("work") && !document.body.classList.contains("wide")) {
    const th = $("#th").getBoundingClientRect().bottom, bh2 = $("#bar").offsetHeight || 150, hh2 = document.body.classList.contains("strip") ? 0 : ($("#hint").offsetHeight || 24) + 14, av = Math.max(120, innerHeight - bh2 - th - hh2 - 50 - 12), cw = Math.min(v.parentElement.clientWidth, Math.round(av * asp)), ih = cw / asp;
    v.style.maxWidth = cw + "px";
    setH();
    v.parentElement.style.paddingTop = av - ih >= 50 ? "50px" : "";
    return;
  }
  v.parentElement.style.paddingTop = "";
  const wide = document.body.classList.contains("wide"), sh = document.body.classList.contains("short"), bh = sh ? $("#bar").offsetHeight || 70 : wide ? 100 * UZ() : ($("#bar").offsetHeight || 150) + 8, hh = wide ? 0 : ($("#hint").offsetHeight || 24) + 8, top = Math.max(sh ? 40 : wide ? 110 : 60, v.getBoundingClientRect().top + scrollY), avail = Math.max(sh ? 150 : wide ? 260 : Math.round(innerHeight * 0.45), innerHeight - top - (wide ? 58 * UZ() : 50) - bh - hh);
  v.style.maxWidth = Math.round(avail * asp) + "px";
  setH();
}
const setVH = () => document.documentElement.style.setProperty("--vh", innerHeight + "px");
setVH();
let lastBH = -1;
new ResizeObserver(() => {
  const h = $("#bar").offsetHeight;
  document.documentElement.style.setProperty("--barh", (h || 110) + "px");
  setVH();
  if (!h || h == lastBH) return;
  lastBH = h;
  if (state.cur < 0 || document.body.classList.contains("wide") || typing()) return;
  refit();
  const gap = $("#vw").getBoundingClientRect().bottom + 8 - $("#bar").getBoundingClientRect().top;
  if (gap > 0) scrollBy({ top: gap, behavior: "smooth" });
}).observe($("#bar"));
// the phone keyboard (plate text fields) changes the window height: the layout waits until typing ends,
// and only a change of width (turning the phone) resets the zoom
const typing = () => !!document.activeElement && document.activeElement.matches(".panel input");
function refit() {
  const v = cv.parentElement, w0 = v.clientWidth;
  fitView();
  const k = w0 ? v.clientWidth / w0 : 1;
  state.tx *= k;
  state.ty *= k;
  apply();
  draw();
}
let rzT = 0, lastW = innerWidth;
addEventListener("resize", () => {
  setVH();
  clearTimeout(rzT);
  rzT = setTimeout(() => {
    layoutMode();
    if (state.cur < 0 || typing()) return;
    if (innerWidth != lastW) {
      lastW = innerWidth;
      fitView();
      zr();
      draw();
    } else refit();
  }, 120);
});
document.addEventListener("focusout", (e) => {
  if (!e.target.matches || !e.target.matches(".panel input") || state.cur < 0) return;
  // after the keyboard has closed
  setTimeout(() => {
    if (typing()) return;
    // iPhone scrolls the page to the field; the editor does not scroll, so put it back
    if (document.body.classList.contains("work") && !document.body.classList.contains("wide")) scrollTo(0, 0);
    lastBH = $("#bar").offsetHeight;
    refit();
  }, 300);
});
function zr() {
  zprev = null;
  state.z = 1;
  state.tx = state.ty = 0;
  state.pan = false;
  $("#zh").className = "";
  apply();
}
function zoomAt(f, cx, cy) {
  const zm = zMin(), nz = Math.min(8 * zm, Math.max(zm, state.z * f)), k = nz / state.z;
  state.tx = cx - (cx - state.tx) * k;
  state.ty = cy - (cy - state.ty) * k;
  state.z = nz;
  apply();
}
function gest() {
  const [a, b] = [...P.values()];
  return { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
}
function vc() {
  const r = cv.parentElement.getBoundingClientRect();
  return [r.width / 2, r.height / 2];
}
{
  const c = $("#cmp"), on = (v) => (e) => {
    e.preventDefault();
    state.peek = v;
    draw();
  };
  c.onpointerdown = on(true);
  c.onpointerup = c.onpointerleave = c.onpointercancel = on(false);
  c.oncontextmenu = (e) => e.preventDefault();
}
$("#zp").onclick = () => zoomAt(1.6, ...vc());
$("#zm").onclick = () => zoomAt(1 / 1.6, ...vc());
$("#zh").onclick = () => {
  state.pan = !state.pan;
  $("#zh").className = state.pan ? "on" : "";
};
cv.parentElement.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = cv.parentElement.getBoundingClientRect();
  zoomAt(e.deltaY < 0 ? 1.2 : 1 / 1.2, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });
export {
  animT,
  setFull,
  stepBox,
  cropView,
  zMin,
  apply,
  draw,
  fitView,
  gest,
  placeDel,
  rdraw,
  unzoom,
  vc,
  visB,
  zoomAt,
  zoomToBox,
  zr
};
