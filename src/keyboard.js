// キーボード操作（PC）
import { $ } from "./dom.js";
import { pushHist } from "./editor/history.js";
import { draw, unzoom, vc, zoomAt } from "./editor/view.js";
import { tr } from "./i18n.js";
import { state } from "./state.js";
import { mClose } from "./ui/menu.js";
import { msg } from "./ui/toast.js";
import { goImg, ui } from "./ui/ui.js";
document.addEventListener("keydown", (e) => {
  if (!$("#menu").hidden && e.key == "Escape") {
    mClose();
    return;
  }
  if (e.target.closest("input,textarea") || !$("#ob").hidden || !$("#menu").hidden || !$("#iab").hidden || state.cur < 0) return;
  const k = e.key, m = e.ctrlKey || e.metaKey, it = state.items[state.cur];
  if (m && k.toLowerCase() == "z") {
    e.preventDefault();
    $(e.shiftKey ? "#redo" : "#undo").click();
    return;
  }
  if (m && k.toLowerCase() == "y") {
    e.preventDefault();
    $("#redo").click();
    return;
  }
  if ((k == "Delete" || k == "Backspace") && state.sel >= 0 && it.boxes[state.sel]) {
    e.preventDefault();
    pushHist(it);
    it.boxes.splice(state.sel, 1);
    state.sel = -1;
    it.ok = false;
    unzoom();
    ui();
    draw();
    msg(tr("削除しました"), { label: tr("元に戻す"), fn: () => $("#undo").click() });
    return;
  }
  if (k == "Escape") {
    if (state.sel >= 0) {
      $("#decb").click();
    } else if (state.mode) {
      state.mode = "";
      ui();
      draw();
    } else if (state.panel) {
      state.panel = "";
      ui();
      draw();
    }
    return;
  }
  if (k == "Enter" && !e.target.closest("button")) {
    e.preventDefault();
    if (state.sel >= 0) $("#decb").click();
    else if (!$("#go").hidden) $("#go").click();
    return;
  }
  if (k == "ArrowRight" && !m && state.sel < 0) {
    goImg(Math.min(state.items.length - 1, state.cur + 1));
    return;
  }
  if (k == "ArrowLeft" && !m && state.sel < 0) {
    goImg(Math.max(0, state.cur - 1));
    return;
  }
  if (k == "+" || k == "=") {
    zoomAt(1.4, ...vc());
    return;
  }
  if (k == "-") {
    zoomAt(1 / 1.4, ...vc());
    return;
  }
});
