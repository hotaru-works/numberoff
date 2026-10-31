// ベータ機能：架空ナンバーの設定パネル
import { $ } from "../dom.js";
import { pushHist } from "../editor/history.js";
import { draw, rdraw } from "../editor/view.js";
import { tr } from "../i18n.js";
import { isRealPlace, plCol, plateTexC } from "../render/plate.js";
import { state } from "../state.js";
import { msg } from "./toast.js";
import { ui } from "./ui.js";
let plG = false, plT = null;
const plShown = () => {
  const it = state.items[state.cur];
  if (!it) return state.dPl;
  const b = state.sel >= 0 && it.boxes[state.sel];
  return b && b.pl || it.pl || state.dPl;
};
const savePl = () => {
  try {
    localStorage.setItem("nk_pl", JSON.stringify(state.dPl));
  } catch (_) {
  }
};
function plEdit(fn) {
  const it = state.items[state.cur];
  if (!it) return;
  const b0 = state.sel >= 0 && it.boxes[state.sel], tgt = b0 || it;
  // a different plate (or the whole photo) starts a new undo step
  if (tgt !== plT) {
    plT = tgt;
    plG = false;
  }
  if (!plG) {
    pushHist(it);
    plG = true;
  }
  const b = state.sel >= 0 && it.boxes[state.sel];
  const p = b ? b.pl || (b.pl = { ...it.pl || state.dPl }) : it.pl || (it.pl = { ...state.dPl });
  fn(p);
  if (!b) {
    state.dPl = { ...p };
    savePl();
  }
  it.ok = false;
  ui();
  rdraw();
}
function plPrev() {
  const c = $("#plPrev"), g = c.getContext("2d"), p = plShown();
  g.clearRect(0, 0, c.width, c.height);
  if (p.s == "none") {
    g.strokeStyle = getComputedStyle(document.body).color;
    g.globalAlpha = 0.35;
    g.setLineDash([8, 6]);
    g.lineWidth = 3;
    g.beginPath();
    g.roundRect(4, 4, c.width - 8, c.height - 8, 14);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
    return;
  }
  const it = state.items[state.cur];
  g.drawImage(plateTexC(plCol(p, it ? it.cl ?? state.dCl : state.dCl), 240), 0, 0);
}
function plUI() {
  const p = plShown(), it = state.items[state.cur], b = it && state.sel >= 0 && it.boxes[state.sel];
  document.querySelectorAll("#plseg button").forEach((x) => x.className = x.dataset.s == p.s ? "on" : "");
  $("#plJP").hidden = p.s != "jp";
  $("#plUS").hidden = p.s != "us";
  const F = { plR: "r", plC: "c", plK: "k", plN: "n", plT: "t", plM: "m" };
  for (const id in F) {
    const e = $("#" + id);
    if (document.activeElement !== e) {
      e.value = p[F[id]] ?? "";
      e.classList.remove("bad");
    }
  }
  // a selected plate is edited alone (tap a plate, or ‹ ›); otherwise every plate without its own setting
  $("#plNote").textContent = b ? tr("このナンバーだけ") : "";
  $("#plAll").hidden = !(b && b.pl);
  plPrev();
}
document.querySelectorAll("#plseg button").forEach((x) => x.onclick = () => {
  plG = false;
  plEdit((q) => {
    q.s = x.dataset.s;
  });
  plG = false;
});
{
  const F = { plR: "r", plC: "c", plK: "k", plN: "n", plT: "t", plM: "m" };
  for (const id in F) {
    const e = $("#" + id);
    e.oninput = () => {
      const v = e.value;
      if (F[id] == "r" && isRealPlace(v)) {
        if (!e.classList.contains("bad")) msg(tr("実在の地名は使えません"));
        e.classList.add("bad");
        return;
      }
      e.classList.remove("bad");
      plEdit((q) => q[F[id]] = v);
    };
    e.onblur = () => {
      plG = false;
      if (e.classList.contains("bad")) {
        e.value = plShown()[F[id]] ?? "";
        e.classList.remove("bad");
      }
    };
  }
}
$("#plAll").onclick = () => {
  const it = state.items[state.cur], b = it && state.sel >= 0 && it.boxes[state.sel];
  if (!b || !b.pl) return;
  pushHist(it);
  delete b.pl;
  plG = false;
  it.ok = false;
  ui();
  rdraw();
};
$("#betaPl").checked = state.BETA;
document.body.classList.toggle("beta", state.BETA);
$("#betaPl").onchange = (e) => {
  state.BETA = e.target.checked;
  try {
    localStorage.setItem("nk_beta", state.BETA ? "1" : "0");
  } catch (_) {
  }
  document.body.classList.toggle("beta", state.BETA);
  if (!state.BETA && state.panel == "pl") state.panel = "";
  ui();
  draw();
};
export {
  plUI
};
