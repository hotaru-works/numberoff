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
// downloads a file and reports how many bytes have arrived (for the progress bar)
async function bytes(url, opt, onp) {
  const r = await fetch(url, opt);
  if (!r.ok) return null;
  if (!(r.body && r.body.getReader)) return new Uint8Array(await r.arrayBuffer());
  const rd = r.body.getReader(), ch = [];
  let n = 0;
  for (; ; ) {
    const { done, value } = await rd.read();
    if (done) break;
    ch.push(value);
    n += value.length;
    onp(n, +r.headers.get("content-length") || 0);
  }
  const b = new Uint8Array(n);
  let o = 0;
  for (const c of ch) {
    b.set(c, o);
    o += c.length;
  }
  return b;
}
// the runtime's WebAssembly file; it is fetched here at the same time as the model instead of after it
// (if the name does not match the installed runtime, the runtime simply fetches its own file as before)
const WASM = "ort/ort-wasm-simd-threaded.wasm";
(async () => {
  try {
    state.mprog = 0.02;
    loadUI();
    mst("ld", "読み込み中");
    // the model, the runtime script and its WebAssembly all download in parallel
    const ortP = loadOrt();
    ortP.catch(() => {
    });
    const pr = { m: [0, 105e5], w: [0, 12e6] }, prog = (k) => (n, tot) => {
      pr[k] = [n, Math.max(n, tot || pr[k][1])];
      state.mprog = Math.min(0.85, 0.02 + 0.83 * (pr.m[0] + pr.w[0]) / (pr.m[1] + pr.w[1]));
      loadUI();
    };
    const wasmP = bytes(WASM, { cache: "no-cache" }, prog("w")).catch(() => null);
    const b = await bytes("model.onnx", { cache: "no-cache" }, prog("m"));
    if (!b) {
      modelOff("model.onnx がありません");
      return;
    }
    const wb = await wasmP;
    state.mprog = 0.9;
    loadUI();
    await new Promise((r2) => setTimeout(r2, 30));
    if (b.length < 1e5 || b[0] == 60) {
      modelOff("model.onnx がありません");
      return;
    }
    await ortP;
    if (wb && wb.length > 1e5 && wb[0] == 0 && wb[1] == 0x61) ort.env.wasm.wasmBinary = wb;
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
