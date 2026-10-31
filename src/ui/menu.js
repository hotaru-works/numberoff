// 「…」メニュー（言語・画質・形式・ベータ機能）
import { QL } from "../config.js";
import { mst } from "../detect/model.js";
import { $ } from "../dom.js";
import { i18n } from "../i18n.js";
import { state } from "../state.js";
import { obGo, obI } from "./onboarding.js";
import { loadUI, ui } from "./ui.js";
function mOpen() {
  const o = $("#menu");
  o.hidden = false;
  requestAnimationFrame(() => o.classList.add("on"));
}
function mClose() {
  const o = $("#menu");
  o.classList.remove("on");
  setTimeout(() => o.hidden = true, 220);
}
$("#more").onclick = mOpen;
$("#mclose").onclick = mClose;
$("#menu").onclick = (e) => {
  if (e.target.id == "menu") mClose();
};
try {
  const o = JSON.parse(localStorage.getItem("nk_set") || "null");
  if (o) {
    // values come from storage, so only accept ones the app knows
    if (o.q in QL) state.qual = o.q;
    if (["image/jpeg", "image/png", "image/webp"].includes(o.f)) state.fmt = o.f;
    state.dBr = Math.max(-255, Math.min(255, +o.b || 0));
    $("#br").value = state.dBr;
    state.dCl = /^#[0-9a-f]{6}$/i.test(o.c || "") ? o.c : o.p ? "#ffffff" : "auto";
  }
} catch (_) {
}
const saveSet = () => {
  try {
    localStorage.setItem("nk_set", JSON.stringify({ q: state.qual, f: state.fmt, b: state.dBr, c: state.dCl }));
  } catch (_) {
  }
};
$("#br").addEventListener("change", saveSet);
["#qseg", "#fseg"].forEach((q) => $(q).addEventListener("click", () => setTimeout(saveSet)));
(function() {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  let ok = false;
  try {
    ok = c.toDataURL("image/webp").startsWith("data:image/webp");
  } catch (_) {
  }
  if (!ok) {
    $('#fseg [data-f="image/webp"]').disabled = true;
    if (state.fmt == "image/webp") state.fmt = "image/jpeg";
  }
})();
const lsegUI = () => document.querySelectorAll("#lseg button").forEach((b) => b.className = b.dataset.l == state.LANG ? "on" : "");
document.querySelectorAll("#lseg button").forEach((b) => b.onclick = () => {
  state.LANG = b.dataset.l;
  try {
    localStorage.setItem("nk_lang", state.LANG);
  } catch (_) {
  }
  i18n();
  lsegUI();
  $("#th").dataset.sig = "";
  mst($("#mst").className, $("#mst").title);
  ui();
  loadUI();
  obGo(obI);
});
export {
  lsegUI,
  mClose,
  saveSet
};
