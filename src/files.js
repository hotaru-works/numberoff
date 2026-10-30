// 写真の読み込みとサムネイル
import { MAXPX } from "./config.js";
import { detect } from "./detect/plates.js";
import { $ } from "./dom.js";
import { draw } from "./editor/view.js";
import { rq } from "./geometry.js";
import { tr } from "./i18n.js";
import { state } from "./state.js";
import { msg } from "./ui/toast.js";
import { thumb, ui } from "./ui/ui.js";
function demoImg(yellow, t) {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 800;
  const g = c.getContext("2d");
  const rr = (x, y, w, h, r, f) => {
    g.fillStyle = f;
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
  };
  const k = g.createLinearGradient(0, 0, 0, 520);
  k.addColorStop(0, "#8ec5ff");
  k.addColorStop(1, "#e8f4ff");
  g.fillStyle = k;
  g.fillRect(0, 0, 1200, 520);
  g.fillStyle = "#6b7280";
  g.fillRect(0, 520, 1200, 280);
  rr(200, 250, 800, 340, 50, yellow ? "#e5e7eb" : "#b91c1c");
  rr(290, 290, 620, 130, 30, "#93c5fd");
  rr(230, 470, 90, 50, 12, "#fde68a");
  rr(880, 470, 90, 50, 12, "#fde68a");
  rr(260, 580, 680, 26, 10, "#111827");
  g.fillStyle = "#111";
  [300, 900].forEach((x) => {
    g.beginPath();
    g.arc(x, 610, 70, 0, 7);
    g.fill();
  });
  rr(475, 440, 250, 125, 12, yellow ? "#facc15" : "#fff");
  g.strokeStyle = "#374151";
  g.lineWidth = 4;
  g.beginPath();
  g.roundRect(475, 440, 250, 125, 12);
  g.stroke();
  g.fillStyle = yellow ? "#111" : "#14532d";
  g.textAlign = "center";
  g.font = "bold 34px sans-serif";
  g.fillText(t[0], 600, 487);
  g.font = "bold 54px sans-serif";
  g.fillText(t[1], 600, 547);
  return c;
}
async function decode(f) {
  let b = await createImageBitmap(f, { imageOrientation: "from-image" });
  const px = b.width * b.height;
  if (px > MAXPX) {
    const k = Math.sqrt(MAXPX / px), c = document.createElement("canvas");
    c.width = Math.floor(b.width * k);
    c.height = Math.floor(b.height * k);
    c.getContext("2d").drawImage(b, 0, 0, c.width, c.height);
    b.close();
    b = await createImageBitmap(c);
    c.width = c.height = 0;
  }
  return b;
}
function ensureBmp(it) {
  if (it.bmp) return Promise.resolve(it.bmp);
  if (!it.dec) it.dec = decode(it.file).then((b) => {
    it.dec = null;
    if (it.gone) {
      b.close();
      throw new Error("gone");
    }
    it.bmp = b;
    return b;
  }, (e) => {
    it.dec = null;
    throw e;
  });
  return it.dec;
}
function trimBmps() {
  const c = state.items[state.cur];
  for (const it of state.items) if (it !== c && it.file && it.bmp && it.st != "run" && !it.busy) {
    try {
      it.bmp.close();
    } catch (_) {
    }
    it.bmp = null;
    it._pc = null;
  }
  if (state.BC && state.BC.it !== c) state.BC = null;
}
let uid = 0;
async function addFiles(files) {
  const fresh = [];
  let bad = 0, first = true;
  for (const f of files) {
    if (f.type && !f.type.startsWith("image/")) {
      bad++;
      continue;
    }
    try {
      const bmp = await decode(f);
      const it = { id: ++uid, file: f, name: (f.name || "photo").replace(/\.[^.]+$/, ""), bmp, boxes: [], ok: false, cx: 0.5, cy: 0.5, cs: 1, br: state.dBr, tx: state.dTx, cl: state.dCl, pl: { ...state.dPl } };
      thumb(it);
      state.items.push(it);
      fresh.push(it);
      if (first) {
        state.cur = state.items.indexOf(it);
        state.mode = "";
        state.sel = -1;
        ui();
        draw();
        trimBmps();
      } else {
        try {
          bmp.close();
        } catch (_) {
        }
        it.bmp = null;
      }
      first = false;
      await new Promise((r) => setTimeout(r, 0));
    } catch (_) {
      bad++;
    }
  }
  if (bad) msg(tr("開けない写真がありました"));
  if (!fresh.length) return;
  ui();
  draw();
  queueDetect(fresh);
}
$("#pick").onchange = (e) => {
  const f = [...e.target.files];
  e.target.value = "";
  addFiles(f);
};
addEventListener("dragover", (e) => {
  if ([...e.dataTransfer?.types || []].includes("Files")) {
    e.preventDefault();
    document.body.classList.add("dz");
  }
});
addEventListener("dragleave", (e) => {
  if (!e.relatedTarget) document.body.classList.remove("dz");
});
addEventListener("drop", (e) => {
  e.preventDefault();
  document.body.classList.remove("dz");
  if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]);
});
addEventListener("paste", (e) => {
  const f = [...e.clipboardData?.files || []].filter((x) => x.type.startsWith("image/"));
  if (f.length) {
    e.preventDefault();
    addFiles(f);
  }
});
const dq = [];
let drun = false;
function queueDetect(list) {
  for (const it of list) {
    if (it.st) continue;
    if (state.mstate == "off") {
      it.st = "done";
      continue;
    }
    it.st = "wait";
    dq.push(it);
  }
  ui();
  pump();
}
async function pump() {
  if (drun || !state.sess) return;
  drun = true;
  await new Promise((r) => setTimeout(r, 60));
  while (dq.length) {
    const i = dq.indexOf(state.items[state.cur]), it = dq.splice(i >= 0 ? i : 0, 1)[0];
    if (!state.items.includes(it)) continue;
    it.st = "run";
    ui();
    await detect(it);
    it.st = "done";
    if (it.gone) {
      try {
        it.bmp && it.bmp.close();
      } catch (_) {
      }
      it.bmp = null;
    } else trimBmps();
    ui();
    if (it === state.items[state.cur]) draw();
  }
  drun = false;
}
async function removePhoto(i) {
  const it = state.items[i];
  state.items.splice(i, 1);
  const di = dq.indexOf(it);
  if (di >= 0) dq.splice(di, 1);
  if (state.BC && state.BC.it === it) state.BC = null;
  if (state.cur >= state.items.length) state.cur = state.items.length - 1;
  const nx = state.items[state.cur];
  if (nx && !nx.bmp) {
    try {
      await ensureBmp(nx);
    } catch (_) {
    }
  }
  state.lastCur = -2;
  state.sel = -1;
  state.mode = "";
  ui();
  draw();
  msg(tr("写真を外しました"), { label: tr("元に戻す"), fn: () => {
    if (it.gone || !it.bmp && !it.file) return;
    state.items.splice(i, 0, it);
    state.cur = i;
    state.lastCur = -2;
    if (it.st == "wait" || it.st == "run") {
      it.st = "";
      queueDetect([it]);
    }
    ui();
    draw();
  }, done: () => {
    if (!state.items.includes(it)) {
      it.gone = true;
      if (it.st != "run") {
        try {
          it.bmp && it.bmp.close();
        } catch (_) {
        }
        it.bmp = null;
      }
    }
  } });
}
async function demo() {
  const a = await createImageBitmap(demoImg(false, ["品川 300", "あ 12-34"])), b = await createImageBitmap(demoImg(true, ["軽 580", "わ 5-67"]));
  const i1 = { id: ++uid, name: "sample1", bmp: a, boxes: [rq(475, 440, 250, 125)], ok: false, cx: 0.5, cy: 0.5, cs: 1, st: "done", saved: true }, i2 = { id: ++uid, name: "sample2", bmp: b, boxes: [], ok: false, cx: 0.5, cy: 0.5, cs: 1, st: "done", saved: true };
  thumb(i1);
  thumb(i2);
  state.items.push(i1, i2);
  if (state.cur < 0) state.cur = 0;
  ui();
  draw();
}
$("#demoBtn").onclick = demo;
export {
  dq,
  ensureBmp,
  pump,
  removePhoto,
  trimBmps
};
