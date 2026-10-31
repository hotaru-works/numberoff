// ONNX Runtime と検出モデルの読み込み・推論
import { TH } from "../config.js";
import { $ } from "../dom.js";
import { dq, pump } from "../files.js";
import { nms } from "../geometry.js";
import { tr } from "../i18n.js";
import { regSW } from "../pwa.js";
import { state } from "../state.js";
import { loadUI, ui } from "../ui/ui.js";
let IB = null;
let IQ = Promise.resolve();
function infer(...a) {
  const p = IQ.then(() => infer0(...a));
  IQ = p.catch(() => {
  });
  return p;
}
async function infer0(bmp, sx, sy, sw, sh, th = TH) {
  const S = 640, r = Math.min(S / sw, S / sh), w = Math.round(sw * r), h = Math.round(sh * r);
  if (!IB) {
    const c = document.createElement("canvas");
    c.width = c.height = S;
    IB = { x: c.getContext("2d", { willReadFrequently: true }), t: new Float32Array(3 * S * S) };
  }
  const x = IB.x;
  x.fillStyle = "#727272";
  x.fillRect(0, 0, S, S);
  x.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  const d = x.getImageData(0, 0, S, S).data, t = IB.t, P = S * S;
  for (let i = 0; i < P; i++) {
    t[i] = d[i * 4] / 255;
    t[P + i] = d[i * 4 + 1] / 255;
    t[2 * P + i] = d[i * 4 + 2] / 255;
  }
  const o = await state.sess.run({ [state.sess.inputNames[0]]: new ort.Tensor("float32", t, [1, 3, S, S]) }), out = o[state.sess.outputNames[0]], N = out.dims[2], nc = out.dims[1] - 4, a = out.data, res = [];
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let k = 0; k < nc; k++) s = Math.max(s, a[(4 + k) * N + i]);
    if (s < th) continue;
    const cx = a[i], cy = a[N + i], bw = a[2 * N + i], bh = a[3 * N + i];
    res.push({ x: sx + (cx - bw / 2) / r, y: sy + (cy - bh / 2) / r, w: bw / r, h: bh / r, s });
  }
  return nms(res);
}
async function loadOrt() {
  if (window.ort) return;
  await new Promise((ok, ng) => {
    const s = document.createElement("script");
    s.src = "ort/ort.wasm.min.js";
    s.onload = ok;
    s.onerror = ng;
    document.head.appendChild(s);
  });
  // absolute URL: newer runtimes import their loader (.mjs) relative to the script, not the page
  ort.env.wasm.wasmPaths = new URL("ort/", location.href).href;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}
const mst = (c, t) => {
  const e = $("#mst");
  e.className = c;
  e.title = t || "";
  e.lastChild.textContent = tr("自動検出：") + tr(c == "on" ? "使用できます" : c == "ld" ? "準備中" : "使えません");
};
(async () => {
  try {
    state.mprog = 0.02;
    loadUI();
    const r = await fetch("model.onnx", { cache: "no-cache" });
    if (!r.ok) {
      modelOff("model.onnx がありません");
      return;
    }
    mst("ld", "読み込み中");
    let b;
    if (r.body && r.body.getReader) {
      const tot = +r.headers.get("content-length") || 105e5, rd = r.body.getReader(), ch = [];
      let n = 0;
      for (; ; ) {
        const { done, value } = await rd.read();
        if (done) break;
        ch.push(value);
        n += value.length;
        state.mprog = Math.min(0.85, 0.02 + 0.83 * n / tot);
        loadUI();
      }
      b = new Uint8Array(n);
      let o = 0;
      for (const c of ch) {
        b.set(c, o);
        o += c.length;
      }
    } else b = new Uint8Array(await r.arrayBuffer());
    state.mprog = 0.9;
    loadUI();
    await new Promise((r2) => setTimeout(r2, 30));
    if (b.length < 1e5 || b[0] == 60) {
      modelOff("model.onnx がありません");
      return;
    }
    await loadOrt();
    state.sess = await ort.InferenceSession.create(b, { executionProviders: ["wasm"] });
    state.mstate = "on";
    state.mprog = 1;
    mst("on", `${(b.length / 1048576).toFixed(1)}MB`);
    ui();
    loadUI();
    pump();
    setTimeout(regSW, 1500);
  } catch (err) {
    state.sess = null;
    modelOff((err && err.message || "").toString().slice(0, 120));
  }
})();
function modelOff(t) {
  state.mstate = "off";
  setTimeout(regSW, 1500);
  setTimeout(loadUI);
  mst("", t);
  for (const it of state.items) if (it.st == "wait") it.st = "done";
  dq.length = 0;
  ui();
}
export {
  infer,
  mst
};
