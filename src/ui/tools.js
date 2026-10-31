// ツール列（検出・隠す・明るさ・質感・サイズ）とOKボタン
import { $ } from "../dom.js";
import { pushHist } from "../editor/history.js";
import { draw, rdraw, unzoom, zr } from "../editor/view.js";
import { tr } from "../i18n.js";
import { save } from "../save.js";
import { state } from "../state.js";
import { saveSet } from "./menu.js";
import { msg } from "./toast.js";
import { goImg, nextIdx, ui } from "./ui.js";
const unOK = () => {
  const it = state.items[state.cur];
  if (it && it.ok) {
    it.ok = false;
    ui();
  }
};
let brG = false;
let cpG = false;
const setCl = (c) => {
  state.dCl = c;
  const it = state.items[state.cur];
  if (it) {
    if (!cpG && (it.cl ?? state.dCl) !== c) pushHist(it);
    cpG = false;
    it.cl = c;
    it.ok = false;
  }
  ui();
  draw();
  saveSet();
};
document.querySelectorAll("#cseg [data-c]").forEach((b) => b.onclick = () => setCl(b.dataset.c));
$("#cpick").oninput = (e) => {
  const it = state.items[state.cur];
  if (it && !cpG) {
    cpG = true;
    pushHist(it);
  }
  state.dCl = e.target.value;
  if (it) it.cl = state.dCl;
  unOK();
  rdraw();
};
$("#cpick").onchange = (e) => setCl(e.target.value);
$("#br").ondblclick = () => {
  $("#br").value = 0;
  $("#br").oninput({ target: $("#br") });
  brG = false;
  ui();
  saveSet();
};
$("#br").oninput = (e) => {
  const it = state.items[state.cur];
  if (it && !brG) {
    brG = true;
    pushHist(it);
  }
  state.dBr = +e.target.value;
  if (it) it.br = state.dBr;
  unOK();
  rdraw();
};
$("#br").addEventListener("change", () => {
  brG = false;
  ui();
});
document.querySelectorAll("#xseg button").forEach((b) => b.onclick = () => {
  const it = state.items[state.cur];
  if (it && (it.tx ?? state.dTx) != b.dataset.x) {
    pushHist(it);
    it.tx = b.dataset.x;
    it.ok = false;
  }
  ui();
  draw();
});
$("#pos").oninput = (e) => {
  const it = state.items[state.cur];
  if (it) {
    it.cs = 1 - +e.target.value / 100;
    unOK();
    rdraw();
  }
};
document.querySelectorAll("#chips button").forEach((b) => b.onclick = () => {
  const it = state.items[state.cur];
  if (it && state.ratio != b.dataset.r) it.ok = false;
  state.ratio = b.dataset.r;
  state.sel = -1;
  zr();
  ui();
  draw();
});
document.querySelectorAll("#qseg button").forEach((b) => b.onclick = () => {
  state.qual = b.dataset.q;
  ui();
});
document.querySelectorAll("#fseg button").forEach((b) => b.onclick = () => {
  if (!b.disabled) {
    state.fmt = b.dataset.f;
    ui();
  }
});
$("#tDet").onclick = () => {
  if (!state.sess) return msg(tr(state.mstate == "loading" ? "自動検出を準備中です" : "自動検出が使えません"));
  state.mode = state.mode == "det" ? "" : "det";
  if (state.mode) state.panel = "";
  state.sel = -1;
  ui();
  draw();
};
$("#tHide").onclick = () => {
  state.mode = state.mode == "hide" ? "" : "hide";
  if (state.mode) state.panel = "";
  state.sel = -1;
  ui();
  draw();
};
$("#tSize").onclick = () => {
  state.panel = state.panel == "size" ? "" : "size";
  if (state.panel == "size") {
    state.mode = "";
    state.sel = -1;
    zr();
  }
  ui();
  draw();
};
$("#tBr").onclick = () => {
  state.panel = state.panel == "br" ? "" : "br";
  if (state.panel) {
    state.mode = "";
    state.sel = -1;
  }
  ui();
  draw();
};
$("#tPl").onclick = () => {
  state.panel = state.panel == "pl" ? "" : "pl";
  if (state.panel) state.mode = "";
  ui();
  draw();
};
$("#tTx").onclick = () => {
  state.panel = state.panel == "tx" ? "" : "tx";
  if (state.panel) {
    state.mode = "";
    state.sel = -1;
  }
  ui();
  draw();
};
$("#go").onclick = () => {
  state.sel = -1;
  unzoom();
  state.mode = "";
  // OK finishes resizing: from here on the photo is shown cropped
  if (state.panel == "size") state.panel = "";
  const it = state.items[state.cur];
  if (!it.ok) it.ok = true;
  const n = nextIdx();
  if (n >= 0) goImg(n);
  else {
    ui();
    draw();
  }
};
$("#sv").onclick = () => state.items.some((q) => q.ok) ? save("save") : msg(tr("OKを押した写真が保存されます"));
$("#sh").onclick = () => state.items.some((q) => q.ok) ? save("share") : msg(tr("OKを押した写真が共有されます"));
