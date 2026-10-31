// 初回ガイド
import { $ } from "../dom.js";
import { tr } from "../i18n.js";
let obI = 0;
const OBN = document.querySelectorAll("#obT .sl").length;
const OBK = "nk_howto_v1";
function obGo(i) {
  obI = Math.max(0, Math.min(OBN - 1, i));
  $("#obT").style.transform = `translateX(${-obI * 100}%)`;
  document.querySelectorAll("#obD i").forEach((d, k) => d.className = k == obI ? "on" : "");
  $("#obNext").textContent = obI == OBN - 1 ? tr("はじめる") : tr("次へ");
  $("#obSkip").hidden = obI == OBN - 1;
}
function obOpen() {
  const o = $("#ob");
  o.hidden = false;
  obGo(0);
  requestAnimationFrame(() => o.classList.add("on"));
}
function obClose() {
  const o = $("#ob");
  o.classList.remove("on");
  try {
    localStorage.setItem(OBK, "1");
  } catch (_) {
  }
  setTimeout(() => o.hidden = true, 220);
}
$("#obNext").onclick = () => obI == OBN - 1 ? obClose() : obGo(obI + 1);
$("#obSkip").onclick = obClose;
$("#ob").onclick = (e) => {
  if (e.target.id == "ob") obClose();
};
$("#help").onclick = obOpen;
(() => {
  let sx = null;
  const el = $("#obS");
  el.addEventListener("pointerdown", (e) => {
    sx = e.clientX;
  });
  el.addEventListener("pointerup", (e) => {
    if (sx == null) return;
    const d = e.clientX - sx;
    sx = null;
    if (Math.abs(d) > 40) obGo(obI + (d < 0 ? 1 : -1));
  });
})();
export {
  OBK,
  obGo,
  obI,
  obOpen
};
