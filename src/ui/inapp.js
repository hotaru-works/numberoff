// アプリ内ブラウザでの案内
import { $ } from "../dom.js";
import { tr } from "../i18n.js";
import { OBK, obOpen } from "./onboarding.js";
import { msg } from "./toast.js";
const UA = navigator.userAgent || "";
const IAB = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|\bLine\/|Twitter|TikTok|musical_ly|Bytedance|KAKAOTALK|YJApp|Pinterest|Snapchat/i.test(UA);
const IOS = /iPhone|iPad|iPod/i.test(UA) || navigator.platform == "MacIntel" && navigator.maxTouchPoints > 1;
function iabShow() {
  const o = $("#iab");
  o.hidden = false;
  requestAnimationFrame(() => o.classList.add("on"));
}
function iabHide() {
  const o = $("#iab");
  o.classList.remove("on");
  try {
    sessionStorage.setItem("nk_iab", "1");
  } catch (_) {
  }
  setTimeout(() => {
    o.hidden = true;
    let seen = false;
    try {
      seen = localStorage.getItem(OBK) == "1";
    } catch (_) {
    }
    if (!seen) obOpen();
  }, 220);
}
$("#iabKeep").onclick = iabHide;
$("#iabCopy").onclick = async () => {
  const u = location.href.split("#")[0];
  try {
    await navigator.clipboard.writeText(u);
  } catch (_) {
    const a = document.createElement("textarea");
    a.value = u;
    document.body.appendChild(a);
    a.select();
    try {
      document.execCommand("copy");
    } catch (_2) {
    }
    a.remove();
  }
  msg(tr("リンクをコピーしました"));
  $("#iabHow").textContent = tr("コピーしたリンクをSafariかChromeに貼り付けてください");
};
$("#iabOpen").onclick = () => {
  const u = new URL(location.href);
  if (/\bLine\//i.test(UA)) {
    u.searchParams.set("openExternalBrowser", "1");
    location.href = u.href;
    return;
  }
  if (IOS) {
    location.href = "x-safari-" + u.href;
    setTimeout(() => $("#iabHow").animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: 400 }), 900);
    return;
  }
  location.href = "intent://" + u.host + u.pathname + u.search + "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" + encodeURIComponent(u.href) + ";end";
};
(() => {
  let skip = false;
  try {
    skip = sessionStorage.getItem("nk_iab") == "1";
  } catch (_) {
  }
  if (IAB && !skip) {
    if (/\bLine\//i.test(UA) && !/openExternalBrowser=1/.test(location.search)) {
      const u = new URL(location.href);
      u.searchParams.set("openExternalBrowser", "1");
      location.replace(u.href);
      return;
    }
    iabShow();
    return;
  }
  let seen = false;
  try {
    seen = localStorage.getItem(OBK) == "1";
  } catch (_) {
  }
  if (!seen) obOpen();
})();
