// 画面全体の表示更新
import { $ } from "../dom.js";
import { cropMode } from "../editor/pointer.js";
import { draw, fitView, placeDel, zr } from "../editor/view.js";
import { ensureBmp, removePhoto, trimBmps } from "../files.js";
import { tr } from "../i18n.js";
import { CAN_SHARE } from "../save.js";
import { state } from "../state.js";
import { IC } from "./icons.js";
import { plUI } from "./plate-panel.js";
(window.claude ? claude.use("downloads") : Promise.resolve(null)).then((d) => {
  state.dl = d;
  ui();
}).catch(() => {
});
document.addEventListener("nk:sel", () => ui());
function thumb(it) {
  const c = document.createElement("canvas"), k = 112 / Math.min(it.bmp.width, it.bmp.height);
  c.width = Math.round(it.bmp.width * k);
  c.height = Math.round(it.bmp.height * k);
  c.getContext("2d").drawImage(it.bmp, 0, 0, c.width, c.height);
  it.th = c.toDataURL("image/jpeg", 0.7);
  c.width = c.height = 0;
}
function ui() {
  busyUI();
  let nf = false;
  if (state.lastCur != state.cur) {
    state.lastCur = state.cur;
    state.sel = -1;
    nf = true;
  }
  const has = state.items.length > 0, it = state.items[state.cur], n = state.items.filter((q) => q.ok).length, all = has && n == state.items.length;
  $("#empty").hidden = has;
  $("#work").hidden = !has;
  $("#bar").hidden = !has;
  document.body.classList.toggle("work", has);
  if (nf) {
    fitView();
    zr();
  }
  $("#s1").className = "st" + (has ? " dn" : " on");
  $("#s2").className = "st" + (has && !all ? " on" : all ? " dn" : "");
  $("#s3").className = "st" + (all ? " on" : "");
  const th = $("#th"), sig = state.items.map((q) => q.id + (q.ok ? "k" : "") + (q.st || "")).join() + "|" + state.cur;
  if (th.dataset.sig !== sig) {
    th.dataset.sig = sig;
    th.innerHTML = "";
    state.items.forEach((q, i) => {
      const b = document.createElement("button");
      b.className = "tb" + (i == state.cur ? " on" : "");
      b.style.backgroundImage = `url(${q.th})`;
      b.innerHTML = `<span class="nm">${i + 1}</span>` + (q.ok ? `<span class="ck">${IC.check12}</span>` : "") + (q.st == "wait" || q.st == "run" ? '<span class="sp"></span>' : "") + (i == state.cur ? `<span class="x" aria-label="${tr("この写真を外す")}">×</span>` : "");
      b.onclick = (e) => {
        if (e.target.closest(".x")) return removePhoto(i);
        if (i !== state.cur) goImg(i);
      };
      th.appendChild(b);
    });
    const add = document.createElement("label");
    add.htmlFor = "pick";
    add.className = "tb add";
    add.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
    th.appendChild(add);
  }
  if (it) {
    const b = it.boxes.length, h = $("#hint");
    const busy = (it.st == "wait" || it.st == "run") && !b;
    h.className = (busy ? "run" : "ok") + (state.sel >= 0 && it.boxes[state.sel] && !cropMode() ? " sel" : "");
    h.style.visibility = b || busy ? "" : "hidden";
    h.querySelector(":scope>span").textContent = busy ? tr("ナンバーを検出中…") : b ? tr("{n}か所 隠し済み", { n: b }) : "";
    $("#go").hidden = all;
    $("#go").innerHTML = it.ok ? `${tr("次へ")}${IC.next}` : state.items.length - n > 1 ? `OK${IC.next}` : `${IC.check}OK`;
    $("#sv").hidden = false;
    $("#sh").hidden = !CAN_SHARE;
    $("#sv").className = "bb" + (all ? CAN_SHARE ? " half" : "" : " sub");
    $("#sh").className = "bb sub" + (all ? " half" : "");
    $("#sv").innerHTML = all ? `${IC.save}${tr("保存 {n}枚", { n })}` : `${IC.save}${n}`;
    $("#sh").innerHTML = all ? `${IC.share}${tr("共有")}` : IC.share;
    $("#tDet").className = "tl" + (state.mode == "det" ? " on" : "") + (state.sess ? "" : " dim");
    $("#tHide").className = "tl" + (state.mode == "hide" ? " on" : "");
    $("#tSize").className = "tl" + (state.panel == "size" ? " on" : "");
    $("#tBr").className = "tl" + (state.panel == "br" ? " on" : "");
    $("#tTx").className = "tl" + (state.panel == "tx" ? " on" : "");
    $("#tPl").className = "tl" + (state.panel == "pl" ? " on" : "");
    $("#pSize").hidden = state.panel != "size";
    $("#pBr").hidden = state.panel != "br";
    $("#pTx").hidden = state.panel != "tx";
    $("#pPl").hidden = state.panel != "pl";
    if (state.panel == "pl") plUI();
    $("#posrow").hidden = !state.ratio;
    $("#pos").value = Math.round((1 - (it.cs || 1)) * 100);
    $("#zc").hidden = cropMode();
    $("#undo").hidden = cropMode() || !(it.hist && it.hist.length);
    $("#redo").hidden = cropMode() || !(it.fut && it.fut.length);
    $("#redo").style.left = $("#undo").hidden ? "6px" : "";
    placeDel();
    document.querySelectorAll("#chips button").forEach((b2) => b2.className = b2.dataset.r == state.ratio ? "on" : "");
    document.querySelectorAll("#qseg button").forEach((b2) => b2.className = b2.dataset.q == state.qual ? "on" : "");
    document.querySelectorAll("#fseg button").forEach((b2) => b2.className = b2.dataset.f == state.fmt ? "on" : "");
    $("#br").value = it.br ?? state.dBr;
    {
      const c = it.cl ?? state.dCl;
      let hit = false;
      document.querySelectorAll("#cseg [data-c]").forEach((b2) => {
        const on = b2.dataset.c == c;
        hit = hit || on;
        b2.classList.toggle("on", on);
      });
      $("#cseg .cust").classList.toggle("on", !hit);
      if (!hit) $("#cpick").value = c;
    }
    document.querySelectorAll("#xseg button").forEach((b2) => b2.className = b2.dataset.x == (it.tx ?? state.dTx) ? "on" : "");
  }
}
function loadUI() {
  const e = $("#mload");
  e.hidden = state.mstate != "loading";
  if (!e.hidden) {
    e.children[1].textContent = tr("自動検出を準備中… ") + Math.round(state.mprog * 100) + "%";
    e.querySelector("u").style.width = Math.round(state.mprog * 100) + "%";
  }
  busyUI();
}
function busyUI() {
  const it = state.items[state.cur], e = $("#busy");
  const on = !!it && (it.st == "wait" || it.st == "run") && state.mstate != "off";
  e.hidden = !on;
  if (!on) return;
  if (state.mstate == "loading" && it.st == "wait") {
    e.children[1].textContent = tr("検出の準備中… ") + Math.round(state.mprog * 100) + "%";
    e.querySelector("u").style.width = Math.round(state.mprog * 100) + "%";
    return;
  }
  if (!it.t0) it.t0 = performance.now();
  const slow = performance.now() - it.t0 > 6e3;
  e.children[1].textContent = tr(slow ? "もうしばらくお待ちください…" : "ナンバーを検出中…");
  e.querySelector("u").style.width = Math.round((it.prog || 0) * 100) + "%";
}
setInterval(() => {
  if (!$("#busy").hidden) busyUI();
}, 1e3);
async function goImg(i) {
  const it = state.items[i];
  if (!it) return;
  if (!it.bmp) {
    try {
      await ensureBmp(it);
    } catch (_) {
      return;
    }
  }
  if (state.items[i] !== it) return;
  state.cur = i;
  state.mode = "";
  ui();
  draw();
  trimBmps();
}
function nextIdx() {
  for (let k = 1; k <= state.items.length; k++) {
    const i = (state.cur + k) % state.items.length;
    if (!state.items[i].ok) return i;
  }
  return -1;
}
export {
  busyUI,
  goImg,
  loadUI,
  nextIdx,
  thumb,
  ui
};
