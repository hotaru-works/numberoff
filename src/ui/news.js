// アップデートのお知らせ：前に使ったことがある人に、新しいバージョンで最初に開いたとき1回だけ出す
import { VERSION } from "../config.js";
import { $ } from "../dom.js";
const NK = "nk_seen_ver";
function newsClose() {
  const o = $("#news");
  o.classList.remove("on");
  setTimeout(() => o.hidden = true, 220);
}
// returning: the person has used the app before (finished or skipped the first guide)
function newsCheck(returning) {
  let seen = null;
  try {
    seen = localStorage.getItem(NK);
    // remembered right away: the sheet never comes back for this version, even if the page is closed with it open
    localStorage.setItem(NK, VERSION);
  } catch (_) {
    return;
  }
  // first visit: there is nothing "new" yet (the guide is shown instead)
  if (!returning || seen == VERSION) return;
  const o = $("#news");
  o.hidden = false;
  requestAnimationFrame(() => o.classList.add("on"));
}
$("#nwOk").onclick = newsClose;
$("#news").onclick = (e) => {
  if (e.target.id == "news") newsClose();
};
export {
  newsCheck,
  newsClose
};
